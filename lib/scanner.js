import yahooFinance from "yahoo-finance2";

const WATCHLIST = ["AMZN", "TSLA", "AMD", "NVDA", "PLTR", "SOFI", "BAC", "IBKR"];
const MARKET_SYMBOLS = ["SPY", "QQQ"];

async function getChartRows(symbol, interval = "5m", daysBack = 5) {
  const now = new Date();
  const period1 = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  try {
    const result = await yahooFinance.chart(symbol, { period1, period2: now, interval });
    const quotes = result?.quotes || [];
    return quotes
      .filter(q => q.open != null && q.high != null && q.low != null && q.close != null && q.volume != null)
      .map(q => ({
        date: new Date(q.date),
        open: Number(q.open), high: Number(q.high),
        low: Number(q.low), close: Number(q.close), volume: Number(q.volume),
      }));
  } catch { return []; }
}

function calcVWAP(candles) {
  const today = new Date(); today.setHours(0,0,0,0);
  const src = candles.filter(c => c.date >= today);
  const source = src.length > 0 ? src : candles.slice(-30);
  let cumTPV = 0, cumVol = 0;
  for (const c of source) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume; cumVol += c.volume;
  }
  return cumVol > 0 ? cumTPV / cumVol : null;
}

function calcEMA(candles, period) {
  if (candles.length < period) return null;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) ema = candles[i].close * k + ema * (1 - k);
  return ema;
}

function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i];
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  });
  const recent = trs.slice(-period);
  return recent.reduce((s, v) => s + v, 0) / period;
}

function calcRSI(candles, period = 14) {
  if (candles.length < period + 1) return 50;
  const changes = candles.slice(-period - 1).map((c, i, arr) => i === 0 ? 0 : c.close - arr[i-1].close).slice(1);
  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.reduce((s, v) => s + v, 0) / period;
  const avgLoss = losses.reduce((s, v) => s + v, 0) / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcRVOL(candles) {
  if (candles.length < 10) return 1;
  const recent = candles.slice(-5);
  const baseline = candles.slice(-20, -5);
  if (baseline.length === 0) return 1;
  const recentAvg = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
  const baselineAvg = baseline.reduce((s, c) => s + c.volume, 0) / baseline.length;
  return baselineAvg > 0 ? recentAvg / baselineAvg : 1;
}

async function analyzeMarket() {
  let trending = 0, bearish = 0, totalRvol = 0;
  for (const sym of MARKET_SYMBOLS) {
    const candles = await getChartRows(sym, "5m", 5);
    if (candles.length === 0) continue;
    const vwap = calcVWAP(candles);
    const ema20 = calcEMA(candles, 20);
    const rvol = calcRVOL(candles);
    const last = candles[candles.length - 1];
    totalRvol += rvol;
    if (vwap && last.close > vwap && ema20 && last.close > ema20) trending++;
    else if (vwap && last.close < vwap && ema20 && last.close < ema20) bearish++;
  }
  const avgRvol = totalRvol / MARKET_SYMBOLS.length;
  if (avgRvol < 1.2) return { condition: "CHOPPY", allowed: 0, bias: "NONE" };
  if (trending === 2) return { condition: "TRENDING", allowed: 4, bias: "BULLISH" };
  if (bearish === 2) return { condition: "TRENDING", allowed: 4, bias: "BEARISH" };
  if (trending + bearish >= 1) return { condition: "NEUTRAL", allowed: 2, bias: "MIXED" };
  return { condition: "CHOPPY", allowed: 0, bias: "NONE" };
}

async function analyzeTicker(symbol, marketCondition) {
  const [candles5m, candles15m] = await Promise.all([
    getChartRows(symbol, "5m", 5),
    getChartRows(symbol, "15m", 10),
  ]);
  if (candles5m.length < 5) return null;
  const last = candles5m[candles5m.length - 1];
  const price = last.close;
  const vwap = calcVWAP(candles5m);
  const ema9 = calcEMA(candles5m, 9);
  const ema20 = calcEMA(candles5m, 20);
  const atr = calcATR(candles5m) || price * 0.01;
  const rsi = calcRSI(candles5m);
  const rvol = calcRVOL(candles5m);
  if (!vwap || !ema9 || !ema20) return null;

  const aboveVWAP = price > vwap;
  const trendDir = aboveVWAP ? "LONG" : "SHORT";

  let trend15m = "FLAT";
  if (candles15m.length >= 4) {
    const r = candles15m.slice(-4);
    if (r[3].high > r[1].high && r[3].low > r[1].low) trend15m = "BULLISH";
    else if (r[3].high < r[1].high && r[3].low < r[1].low) trend15m = "BEARISH";
  }

  let score = 0;
  if (marketCondition === "TRENDING") score += 20;
  else if (marketCondition === "NEUTRAL") score += 10;

  const vwapDist = Math.abs(price - vwap) / vwap;
  if (vwapDist > 0.005) score += 20;
  else if (vwapDist > 0.002) score += 8;
  else score += 2;

  const emaAligned = trendDir === "LONG" ? price > ema9 && ema9 > ema20 : price < ema9 && ema9 < ema20;
  if (emaAligned) score += 15;
  else if (trendDir === "LONG" ? price > ema20 : price < ema20) score += 7;

  if (rsi > 60 || rsi < 40) score += 10;
  else if (rsi > 55 || rsi < 45) score += 5;

  if (rvol >= 2.0) score += 15;
  else if (rvol >= 1.5) score += 10;
  else if (rvol >= 1.0) score += 5;

  const volSpike = last.volume > candles5m.slice(-10,-1).reduce((s,c) => s+c.volume,0) / 9 * 1.5;
  if (volSpike) score += 10;
  if (marketCondition !== "CHOPPY") score += 10;

  const hardReject = rvol < 1 || (rsi >= 45 && rsi <= 55) || vwapDist < 0.003 || marketCondition === "CHOPPY";
  if (hardReject) score = Math.min(score, 55);

  if ((trendDir === "LONG" && trend15m === "BULLISH") || (trendDir === "SHORT" && trend15m === "BEARISH"))
    score = Math.min(score + 5, 100);

  let status = score >= 85 ? "A+" : score >= 70 ? "WATCHLIST" : "NO TRADE";

  const recentHigh = Math.max(...candles5m.slice(-20).map(c => c.high));
  const recentLow = Math.min(...candles5m.slice(-20).map(c => c.low));
  const slDist = atr * 0.5;
  const room = trendDir === "LONG" ? (recentHigh - price) / slDist : (price - recentLow) / slDist;
  const roomR = +Math.max(0, room).toFixed(1);
  if (roomR < 2 && status === "A+") status = "WATCHLIST";

  const entry = +price.toFixed(2);
  const sl = trendDir === "LONG" ? +(entry - slDist).toFixed(2) : +(entry + slDist).toFixed(2);
  const risk = Math.abs(entry - sl);
  const tp1 = trendDir === "LONG" ? +(entry + risk).toFixed(2) : +(entry - risk).toFixed(2);
  const tp2 = trendDir === "LONG" ? +(entry + risk*2).toFixed(2) : +(entry - risk*2).toFixed(2);

  const rawProb = Math.round(50 + (score - 50) * 0.8);
  const prob = status === "A+" ? Math.min(rawProb, 84) : status === "WATCHLIST" ? Math.min(rawProb, 67) : Math.min(rawProb, 54);

  const dte = risk/price > 0.015 ? "2DTE" : risk/price > 0.008 ? "1DTE" : "0DTE";
  const optionType = trendDir === "LONG" ? "CALL" : "PUT";
  const strike = trendDir === "LONG" ? Math.ceil(entry/5)*5 : Math.floor(entry/5)*5;
  const option = `${symbol} $${strike} ${optionType} ${dte}`;

  const trigger1m = trendDir === "LONG"
    ? "1m candle closes above prev high + above VWAP"
    : "1m candle closes below prev low + below VWAP";

  const fails = ["RVOL drops under 1.0","Price recrosses VWAP","Market shifts to CHOPPY","RSI divergence 5m","News catalyst","Gap fill reversal"];
  const whyFail = fails[Math.floor(Math.random() * fails.length)];

  return {
    symbol, price: +price.toFixed(2), vwap: +vwap.toFixed(2),
    ema9: +ema9.toFixed(2), ema20: +ema20.toFixed(2), atr: +atr.toFixed(2),
    rsi: +rsi.toFixed(1), rvol: +rvol.toFixed(2), score, status, trendDir,
    entry, sl, tp1, tp2, prob, option, room: roomR,
    whyFail, trigger1m, aboveVWAP, emaAligned, volSpike, trend15m,
  };
}

export async function runFullScan() {
  const market = await analyzeMarket();
  const results = await Promise.all(WATCHLIST.map(sym => analyzeTicker(sym, market.condition).catch(() => null)));
  const tickers = results.filter(Boolean).sort((a, b) => b.score - a.score);
  return { market, tickers, scannedAt: new Date().toISOString() };
}