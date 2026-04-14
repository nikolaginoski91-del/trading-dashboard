import { PriceData, OHLCBar, DataMeta, DataSource } from './types';

// ─── In-memory cache (per serverless instance) ───────────────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  source: DataSource;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60_000; // 60s — refresh interval

function getCache<T>(key: string): CacheEntry<T> | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry;
}

function setCache<T>(key: string, data: T, source: DataSource): void {
  cache.set(key, { data, fetchedAt: Date.now(), source });
}

function buildMeta(source: DataSource, fetchedAt: number, stale: boolean): DataMeta {
  return {
    source,
    fetchedAt,
    stale,
    ageSeconds: Math.round((Date.now() - fetchedAt) / 1000),
  };
}

// ─── Timeout wrapper ─────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── BTC Price Sources ───────────────────────────────────────────────────────

async function fetchBTCFromBinance(): Promise<PriceData> {
  const [ticker, klines] = await Promise.all([
    withTimeout(
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT').then(r => {
        if (!r.ok) throw new Error(`Binance ticker ${r.status}`);
        return r.json();
      })
    ),
    withTimeout(
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=2').then(r => {
        if (!r.ok) throw new Error(`Binance klines ${r.status}`);
        return r.json();
      })
    ),
  ]);

  const price = parseFloat(ticker.lastPrice);
  const open = parseFloat(ticker.openPrice);
  const change = price - open;
  const changePct = (change / open) * 100;

  return {
    symbol: 'BTC',
    price,
    change,
    changePct,
    high: parseFloat(ticker.highPrice),
    low: parseFloat(ticker.lowPrice),
    volume: parseFloat(ticker.volume),
    timestamp: Date.now(),
  };
}

async function fetchBTCFromCoinGecko(): Promise<PriceData> {
  const data = await withTimeout(
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_high_low_24h=true'
    ).then(r => {
      if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
      return r.json();
    })
  );

  const btc = data.bitcoin;
  const price = btc.usd;
  const changePct = btc.usd_24h_change ?? 0;
  const change = (price / (1 + changePct / 100)) * (changePct / 100);

  return {
    symbol: 'BTC',
    price,
    change,
    changePct,
    high: btc.usd_24h_high ?? price,
    low: btc.usd_24h_low ?? price,
    volume: btc.usd_24h_vol ?? 0,
    timestamp: Date.now(),
  };
}

async function fetchBTCFromYahoo(): Promise<PriceData> {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=2d';
  const data = await withTimeout(
    fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then(r => {
      if (!r.ok) throw new Error(`Yahoo BTC ${r.status}`);
      return r.json();
    })
  );

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo BTC: empty result');

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;

  return {
    symbol: 'BTC',
    price,
    change,
    changePct,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
    volume: meta.regularMarketVolume ?? 0,
    timestamp: Date.now(),
  };
}

// ─── Equity Price Sources (SPY/QQQ) ─────────────────────────────────────────

async function fetchEquityFromStooq(symbol: string): Promise<PriceData> {
  // Stooq returns CSV: Date,Open,High,Low,Close,Volume
  const stooqSymbol = symbol.toLowerCase() + '.us';
  const url = `https://stooq.com/q/d/l/?s=${stooqSymbol}&i=d`;

  const text = await withTimeout(
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`Stooq ${symbol} ${r.status}`);
      return r.text();
    })
  );

  const lines = text.trim().split('\n').filter(l => !l.startsWith('Date'));
  if (lines.length < 2) throw new Error(`Stooq ${symbol}: not enough data`);

  const parse = (line: string) => {
    const [date, open, high, low, close, volume] = line.split(',');
    return {
      date,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume || '0'),
    };
  };

  const today = parse(lines[lines.length - 1]);
  const prev = parse(lines[lines.length - 2]);

  const change = today.close - prev.close;
  const changePct = (change / prev.close) * 100;

  return {
    symbol: symbol.toUpperCase(),
    price: today.close,
    change,
    changePct,
    high: today.high,
    low: today.low,
    volume: today.volume,
    timestamp: Date.now(),
  };
}

async function fetchEquityFromYahoo(symbol: string): Promise<PriceData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
  const data = await withTimeout(
    fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then(r => {
      if (!r.ok) throw new Error(`Yahoo ${symbol} ${r.status}`);
      return r.json();
    })
  );

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo ${symbol}: empty result`);

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;

  return {
    symbol: symbol.toUpperCase(),
    price,
    change,
    changePct,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
    volume: meta.regularMarketVolume ?? 0,
    timestamp: Date.now(),
  };
}

// ─── OHLC History Sources ────────────────────────────────────────────────────

async function fetchOHLCFromBinance(symbol: string, limit = 60): Promise<OHLCBar[]> {
  const binancePair = symbol.replace('-', '') + 'USDT';
  const url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=1d&limit=${limit}`;

  const data = await withTimeout(fetch(url).then(r => r.json()));

  return (data as unknown[][]).map((bar) => ({
    time: bar[0] as number,
    open: parseFloat(bar[1] as string),
    high: parseFloat(bar[2] as string),
    low: parseFloat(bar[3] as string),
    close: parseFloat(bar[4] as string),
    volume: parseFloat(bar[5] as string),
  }));
}

async function fetchOHLCFromYahoo(symbol: string, limit = 60): Promise<OHLCBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=90d`;
  const data = await withTimeout(
    fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json())
  );

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo OHLC ${symbol}: empty`);

  const ts: number[] = result.timestamp;
  const q = result.indicators.quote[0];

  return ts
    .map((t, i) => ({
      time: t * 1000,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] ?? 0,
    }))
    .filter(b => b.open && b.close)
    .slice(-limit);
}

// ─── Public API: getBTCPrice ─────────────────────────────────────────────────

export async function getBTCPrice(): Promise<{ data: PriceData; meta: DataMeta }> {
  const cacheKey = 'btc_price';
  const cached = getCache<PriceData>(cacheKey);

  // Return fresh cache
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      data: cached.data,
      meta: buildMeta(cached.source, cached.fetchedAt, false),
    };
  }

  const sources: Array<{ name: DataSource; fn: () => Promise<PriceData> }> = [
    { name: 'binance', fn: fetchBTCFromBinance },
    { name: 'coingecko', fn: fetchBTCFromCoinGecko },
    { name: 'yahoo', fn: fetchBTCFromYahoo },
  ];

  for (const source of sources) {
    try {
      const data = await source.fn();
      if (!isValidPrice(data.price)) throw new Error('Invalid price');
      setCache(cacheKey, data, source.name);
      return { data, meta: buildMeta(source.name, Date.now(), false) };
    } catch (err) {
      console.warn(`[dataFetcher] BTC source "${source.name}" failed:`, err);
    }
  }

  // All sources failed — return stale cache if available
  if (cached) {
    console.error('[dataFetcher] All BTC sources failed — serving stale cache');
    return {
      data: cached.data,
      meta: buildMeta(cached.source, cached.fetchedAt, true),
    };
  }

  throw new Error('All BTC data sources failed and no cache available');
}

// ─── Public API: getEquityPrice ──────────────────────────────────────────────

export async function getEquityPrice(
  symbol: string
): Promise<{ data: PriceData; meta: DataMeta }> {
  const cacheKey = `equity_${symbol}`;
  const cached = getCache<PriceData>(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      data: cached.data,
      meta: buildMeta(cached.source, cached.fetchedAt, false),
    };
  }

  const sources: Array<{ name: DataSource; fn: () => Promise<PriceData> }> = [
    { name: 'stooq', fn: () => fetchEquityFromStooq(symbol) },
    { name: 'yahoo', fn: () => fetchEquityFromYahoo(symbol) },
  ];

  for (const source of sources) {
    try {
      const data = await source.fn();
      if (!isValidPrice(data.price)) throw new Error('Invalid price');
      setCache(cacheKey, data, source.name);
      return { data, meta: buildMeta(source.name, Date.now(), false) };
    } catch (err) {
      console.warn(`[dataFetcher] ${symbol} source "${source.name}" failed:`, err);
    }
  }

  if (cached) {
    console.error(`[dataFetcher] All ${symbol} sources failed — serving stale cache`);
    return {
      data: cached.data,
      meta: buildMeta(cached.source, cached.fetchedAt, true),
    };
  }

  throw new Error(`All data sources for ${symbol} failed and no cache available`);
}

// ─── Public API: getOHLC ─────────────────────────────────────────────────────

export async function getOHLC(
  symbol: string,
  limit = 60
): Promise<{ data: OHLCBar[]; meta: DataMeta }> {
  const cacheKey = `ohlc_${symbol}_${limit}`;
  const OHLC_TTL = 5 * 60_000; // 5 min — OHLC changes less often
  const cached = getCache<OHLCBar[]>(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < OHLC_TTL) {
    return {
      data: cached.data,
      meta: buildMeta(cached.source, cached.fetchedAt, false),
    };
  }

  const isCrypto = ['BTC', 'ETH', 'SOL'].includes(symbol.toUpperCase());

  const sources: Array<{ name: DataSource; fn: () => Promise<OHLCBar[]> }> = isCrypto
    ? [
        { name: 'binance', fn: () => fetchOHLCFromBinance(symbol, limit) },
        { name: 'yahoo', fn: () => fetchOHLCFromYahoo(`${symbol}-USD`, limit) },
      ]
    : [{ name: 'yahoo', fn: () => fetchOHLCFromYahoo(symbol, limit) }];

  for (const source of sources) {
    try {
      const data = await source.fn();
      if (!data.length) throw new Error('Empty OHLC');
      setCache(cacheKey, data, source.name);
      return { data, meta: buildMeta(source.name, Date.now(), false) };
    } catch (err) {
      console.warn(`[dataFetcher] OHLC ${symbol} source "${source.name}" failed:`, err);
    }
  }

  if (cached) {
    return {
      data: cached.data,
      meta: buildMeta(cached.source, cached.fetchedAt, true),
    };
  }

  throw new Error(`All OHLC sources for ${symbol} failed`);
}

// ─── Validation ──────────────────────────────────────────────────────────────

function isValidPrice(price: unknown): boolean {
  return typeof price === 'number' && isFinite(price) && price > 0;
}
