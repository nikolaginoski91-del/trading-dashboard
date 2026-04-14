import { PriceData, OHLCBar, DataMeta, DataSource } from './types';

// ─── Fix 1: Next.js fetch cache (persists across serverless instances) ────────
// Instead of in-memory Map (dies with each cold start), we use Next.js built-in
// fetch caching with revalidate — shared across all instances via CDN edge cache.

const PRICE_REVALIDATE = 60;   // seconds — BTC + equity price TTL
const OHLC_REVALIDATE  = 120;  // seconds — OHLC bars TTL (changes less often)

function cachedFetch(url: string, revalidate: number, headers?: Record<string, string>) {
  return fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
    next: { revalidate },
  });
}

// ─── Timeout wrapper ──────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function buildMeta(source: DataSource, fetchedAt: number, stale: boolean): DataMeta {
  return {
    source,
    fetchedAt,
    stale,
    ageSeconds: Math.round((Date.now() - fetchedAt) / 1000),
  };
}

// ─── Fix 2: Remove Stooq (blocked on Vercel cloud IPs) ───────────────────────
// New equity source order: Yahoo v8 → Yahoo v7 (different endpoint, higher success rate)

// ─── BTC Sources ─────────────────────────────────────────────────────────────

async function fetchBTCFromBinance(): Promise<PriceData> {
  // Fix 3: Use Binance.US as secondary — better uptime from US Vercel servers
  const endpoints = [
    'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
    'https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSD',
  ];

  let lastErr: Error = new Error('Binance unreachable');
  for (const url of endpoints) {
    try {
      const r = await withTimeout(cachedFetch(url, PRICE_REVALIDATE), 4000);
      if (!r.ok) throw new Error(`Binance ${r.status}`);
      const ticker = await r.json();

      const price   = parseFloat(ticker.lastPrice);
      const open    = parseFloat(ticker.openPrice);
      const change  = price - open;

      if (!isValidPrice(price)) throw new Error('Invalid price from Binance');

      return {
        symbol: 'BTC',
        price,
        change,
        changePct: (change / open) * 100,
        high: parseFloat(ticker.highPrice),
        low:  parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
        timestamp: Date.now(),
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}

async function fetchBTCFromCoinGecko(): Promise<PriceData> {
  const url = 'https://api.coingecko.com/api/v3/simple/price'
    + '?ids=bitcoin&vs_currencies=usd'
    + '&include_24hr_change=true&include_24hr_vol=true&include_high_low_24h=true';

  const r = await withTimeout(cachedFetch(url, PRICE_REVALIDATE), 5000);
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  const data = await r.json();

  const btc       = data.bitcoin;
  const price     = btc.usd;
  const changePct = btc.usd_24h_change ?? 0;
  const change    = price * (changePct / 100) / (1 + changePct / 100);

  if (!isValidPrice(price)) throw new Error('Invalid price from CoinGecko');

  return {
    symbol: 'BTC',
    price,
    change,
    changePct,
    high:   btc.usd_24h_high ?? price,
    low:    btc.usd_24h_low  ?? price,
    volume: btc.usd_24h_vol  ?? 0,
    timestamp: Date.now(),
  };
}

async function fetchBTCFromYahoo(): Promise<PriceData> {
  return fetchEquityFromYahoo('BTC-USD', 'BTC');
}

// ─── Equity Sources ───────────────────────────────────────────────────────────

async function fetchEquityFromYahoo(symbol: string, overrideLabel?: string): Promise<PriceData> {
  // Try v8 first, fall back to v7 — both same data, different reliability windows
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
  ];

  let lastErr: Error = new Error('Yahoo unreachable');
  for (const url of urls) {
    try {
      const r = await withTimeout(cachedFetch(url, PRICE_REVALIDATE), 5000);
      if (!r.ok) throw new Error(`Yahoo ${symbol} ${r.status}`);
      const data = await r.json();

      const result = data?.chart?.result?.[0];
      if (!result) throw new Error(`Yahoo ${symbol}: empty result`);

      const meta      = result.meta;
      const price     = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose;

      if (!isValidPrice(price)) throw new Error(`Yahoo ${symbol}: invalid price`);

      const change    = price - prevClose;
      const changePct = (change / prevClose) * 100;

      return {
        symbol:    overrideLabel ?? symbol.toUpperCase(),
        price,
        change,
        changePct,
        high:   meta.regularMarketDayHigh ?? price,
        low:    meta.regularMarketDayLow  ?? price,
        volume: meta.regularMarketVolume  ?? 0,
        timestamp: Date.now(),
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}

// ─── OHLC Sources ─────────────────────────────────────────────────────────────

async function fetchOHLCFromBinance(symbol: string, limit: number): Promise<OHLCBar[]> {
  const pair = symbol.replace('-', '').toUpperCase() + 'USDT';
  const url  = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=${limit}`;

  const r = await withTimeout(cachedFetch(url, OHLC_REVALIDATE), 5000);
  if (!r.ok) throw new Error(`Binance OHLC ${r.status}`);
  const data = await r.json() as unknown[][];

  if (!Array.isArray(data) || data.length === 0) throw new Error('Binance OHLC: empty');

  return data.map(bar => ({
    time:   bar[0] as number,
    open:   parseFloat(bar[1] as string),
    high:   parseFloat(bar[2] as string),
    low:    parseFloat(bar[3] as string),
    close:  parseFloat(bar[4] as string),
    volume: parseFloat(bar[5] as string),
  }));
}

async function fetchOHLCFromYahoo(symbol: string, limit: number): Promise<OHLCBar[]> {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=120d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=120d`,
  ];

  let lastErr: Error = new Error('Yahoo OHLC unreachable');
  for (const url of urls) {
    try {
      const r = await withTimeout(cachedFetch(url, OHLC_REVALIDATE), 5000);
      if (!r.ok) throw new Error(`Yahoo OHLC ${symbol} ${r.status}`);
      const data = await r.json();

      const result = data?.chart?.result?.[0];
      if (!result) throw new Error(`Yahoo OHLC ${symbol}: empty`);

      const ts: number[]  = result.timestamp;
      const q             = result.indicators.quote[0];

      const bars = ts
        .map((t, i) => ({
          time:   t * 1000,
          open:   q.open[i]   as number,
          high:   q.high[i]   as number,
          low:    q.low[i]    as number,
          close:  q.close[i]  as number,
          volume: (q.volume[i] as number) ?? 0,
        }))
        .filter(b => b.open != null && b.close != null && b.close > 0)
        .slice(-limit);

      if (bars.length < 10) throw new Error(`Yahoo OHLC ${symbol}: too few bars`);
      return bars;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}

// ─── Public API: getBTCPrice ──────────────────────────────────────────────────

export async function getBTCPrice(): Promise<{ data: PriceData; meta: DataMeta }> {
  const sources: Array<{ name: DataSource; fn: () => Promise<PriceData> }> = [
    { name: 'binance',   fn: fetchBTCFromBinance  },
    { name: 'coingecko', fn: fetchBTCFromCoinGecko },
    { name: 'yahoo',     fn: fetchBTCFromYahoo     },
  ];

  for (const source of sources) {
    try {
      const data = await source.fn();
      return { data, meta: buildMeta(source.name, Date.now(), false) };
    } catch (err) {
      console.warn(`[dataFetcher] BTC source "${source.name}" failed:`, (err as Error).message);
    }
  }

  throw new Error('All BTC data sources failed');
}

// ─── Public API: getEquityPrice ───────────────────────────────────────────────

export async function getEquityPrice(
  symbol: string
): Promise<{ data: PriceData; meta: DataMeta }> {
  // Stooq removed — blocked on Vercel. Yahoo is now primary with query1/query2 fallback.
  try {
    const data = await fetchEquityFromYahoo(symbol);
    return { data, meta: buildMeta('yahoo', Date.now(), false) };
  } catch (err) {
    console.warn(`[dataFetcher] ${symbol} source "yahoo" failed:`, (err as Error).message);
    throw new Error(`All data sources for ${symbol} failed`);
  }
}

// ─── Public API: getOHLC ──────────────────────────────────────────────────────

export async function getOHLC(
  symbol: string,
  limit = 60
): Promise<{ data: OHLCBar[]; meta: DataMeta }> {
  const isCrypto = ['BTC', 'ETH', 'SOL'].includes(symbol.toUpperCase());

  const sources: Array<{ name: DataSource; fn: () => Promise<OHLCBar[]> }> = isCrypto
    ? [
        { name: 'binance', fn: () => fetchOHLCFromBinance(symbol, limit) },
        { name: 'yahoo',   fn: () => fetchOHLCFromYahoo(`${symbol}-USD`, limit) },
      ]
    : [
        { name: 'yahoo',   fn: () => fetchOHLCFromYahoo(symbol, limit) },
      ];

  for (const source of sources) {
    try {
      const data = await source.fn();
      return { data, meta: buildMeta(source.name, Date.now(), false) };
    } catch (err) {
      console.warn(`[dataFetcher] OHLC ${symbol} source "${source.name}" failed:`, (err as Error).message);
    }
  }

  throw new Error(`All OHLC sources for ${symbol} failed`);
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidPrice(price: unknown): boolean {
  return typeof price === 'number' && isFinite(price) && price > 0;
}
