import { OHLCBar, TradeCard, TradeFlag, TradeGrade, TradeScore, RegimeResult, DataMeta } from './types';

// ─── Technical helpers ────────────────────────────────────────────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stddev(values: number[], period: number): number {
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function atr(bars: OHLCBar[], period = 14): number {
  const trs = bars.slice(1).map((bar, i) => {
    const prev = bars[i];
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prev.close),
      Math.abs(bar.low - prev.close)
    );
  });
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function avgVolume(bars: OHLCBar[], period = 20): number {
  return bars.slice(-period).reduce((a, b) => a + b.volume, 0) / period;
}

// ─── Trend score (multi-timeframe alignment) ──────────────────────────────────

function scoreTrend(bars: OHLCBar[]): number {
  const closes = bars.map(b => b.close);
  const ema8 = ema(closes, 8);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);

  const last = closes.length - 1;
  const price = closes[last];
  const e8 = ema8[last];
  const e21 = ema21[last];
  const e50 = ema50[last];

  let score = 5; // neutral baseline

  // Perfect bull alignment: price > EMA8 > EMA21 > EMA50
  if (price > e8 && e8 > e21 && e21 > e50) score = 10;
  else if (price > e8 && e8 > e21) score = 8;
  else if (price > e21 && price > e50) score = 7;
  else if (price > e50) score = 6;
  else if (price < e8 && e8 < e21 && e21 < e50) score = 0;
  else if (price < e8 && e8 < e21) score = 2;
  else if (price < e21) score = 4;

  return score;
}

// ─── Momentum score (volume + price velocity) ────────────────────────────────

function scoreMomentum(bars: OHLCBar[]): number {
  const last = bars[bars.length - 1];
  const avgVol = avgVolume(bars, 20);
  const volumeRatio = last.volume / avgVol;

  const closes = bars.map(b => b.close);
  const roc5 = ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100;

  let score = 5;

  // Volume confirmation
  if (volumeRatio > 2) score += 2;
  else if (volumeRatio > 1.5) score += 1;
  else if (volumeRatio < 0.7) score -= 2;

  // Price velocity
  if (roc5 > 5) score += 2;
  else if (roc5 > 2) score += 1;
  else if (roc5 < -5) score -= 2;
  else if (roc5 < -2) score -= 1;

  return Math.max(0, Math.min(10, score));
}

// ─── Structure score (clean chart, defined levels) ───────────────────────────

function scoreStructure(bars: OHLCBar[]): number {
  const closes = bars.map(b => b.close);

  // How clean is the chart? Use coefficient of variation of last 20 bars
  // Low variation around trend = clean
  const last20 = closes.slice(-20);
  const mean = last20.reduce((a, b) => a + b, 0) / last20.length;
  const cv = (stddev(closes, 20) / mean) * 100;

  // Lower CV = cleaner chart
  let score: number;
  if (cv < 2) score = 10;
  else if (cv < 4) score = 8;
  else if (cv < 7) score = 6;
  else if (cv < 10) score = 4;
  else score = 2;

  // Penalize for doji/indecision candles in last 5 bars
  const last5 = bars.slice(-5);
  const indecisionCount = last5.filter(b => {
    const bodySize = Math.abs(b.close - b.open);
    const totalRange = b.high - b.low;
    return totalRange > 0 && bodySize / totalRange < 0.2;
  }).length;

  score -= indecisionCount * 0.5;

  return Math.max(0, Math.min(10, score));
}

// ─── Risk score (stop clarity, R:R) ─────────────────────────────────────────

function scoreRisk(entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const rr = reward / risk;
  const riskPct = (risk / entry) * 100;

  let score = 5;

  if (rr >= 3) score += 3;
  else if (rr >= 2) score += 2;
  else if (rr >= 1.5) score += 1;
  else if (rr < 1) score -= 4;

  if (riskPct < 1) score += 2;
  else if (riskPct < 2) score += 1;
  else if (riskPct > 4) score -= 2;

  return Math.max(0, Math.min(10, score));
}

// ─── Regime context score ────────────────────────────────────────────────────

function scoreRegimeContext(regime: RegimeResult, direction: 'LONG' | 'SHORT'): number {
  const { regime: label, confidence } = regime;

  if (label === 'BULL' && direction === 'LONG') {
    return 7 + confidence * 3; // 7–10
  }
  if (label === 'BEAR' && direction === 'SHORT') {
    return 7 + confidence * 3;
  }
  if (label === 'NEUTRAL') {
    return 5; // neutral
  }
  // Trading against regime
  return 5 - confidence * 5; // 0–5
}

// ─── Hard invalidators ───────────────────────────────────────────────────────

function detectFlags(
  bars: OHLCBar[],
  entry: number,
  stop: number,
  target: number
): TradeFlag[] {
  const flags: TradeFlag[] = [];

  const rr = Math.abs(target - entry) / Math.abs(entry - stop);
  if (rr < 1.8) flags.push('BAD_RR');

  const riskPct = (Math.abs(entry - stop) / entry) * 100;
  if (riskPct > 5) flags.push('WIDE_STOP');

  const avgVol = avgVolume(bars, 20);
  const lastVol = bars[bars.length - 1].volume;
  if (lastVol < avgVol * 0.4) flags.push('LOW_VOLUME');

  // Choppy: many candles with small bodies = indecision
  const last10 = bars.slice(-10);
  const indecisionCount = last10.filter(b => {
    const body = Math.abs(b.close - b.open);
    const range = b.high - b.low;
    return range > 0 && body / range < 0.25;
  }).length;
  if (indecisionCount >= 6) flags.push('CHOPPY_CHART');

  return flags;
}

// ─── Grade from score + flags ────────────────────────────────────────────────

function gradeSetup(overall: number, flags: TradeFlag[]): TradeGrade {
  if (flags.includes('BAD_RR') || flags.includes('WIDE_STOP')) return 'SKIP';
  if (flags.length >= 2) return 'SKIP';
  if (overall >= 8.5) return 'A+';
  if (overall >= 7.5) return 'A';
  if (overall >= 6.0) return 'B';
  if (overall >= 5.0) return 'C';
  return 'SKIP';
}

// ─── Build thesis string ──────────────────────────────────────────────────────

function buildThesis(
  score: TradeScore,
  regime: RegimeResult,
  direction: 'LONG' | 'SHORT'
): string {
  const parts: string[] = [];

  if (score.trend >= 8) parts.push('strong trend alignment');
  else if (score.trend >= 6) parts.push('above key EMAs');
  else parts.push('mixed trend');

  if (score.momentum >= 8) parts.push('vol surge');
  else if (score.momentum >= 6) parts.push('above-avg volume');

  parts.push(`regime ${regime.regime}`);

  return `${direction === 'LONG' ? '↑' : '↓'} ${parts.join(' + ')}`;
}

// ─── Main: score a setup ──────────────────────────────────────────────────────

export function scoreSetup(
  ticker: string,
  bars: OHLCBar[],
  regime: RegimeResult,
  direction: 'LONG' | 'SHORT',
  entry: number,
  stop: number,
  target: number,
  meta: DataMeta
): TradeCard {
  const rr = Math.abs(target - entry) / Math.abs(entry - stop);
  const riskPct = (Math.abs(entry - stop) / entry) * 100;

  const trendScore = scoreTrend(bars);
  const momentumScore = scoreMomentum(bars);
  const structureScore = scoreStructure(bars);
  const riskScore = scoreRisk(entry, stop, target);
  const regimeScore = scoreRegimeContext(regime, direction);

  const overall =
    trendScore * 0.25 +
    momentumScore * 0.2 +
    structureScore * 0.2 +
    riskScore * 0.2 +
    regimeScore * 0.15;

  const score: TradeScore = {
    trend: trendScore,
    momentum: momentumScore,
    structure: structureScore,
    risk: riskScore,
    regime: regimeScore,
    overall,
  };

  const flags = detectFlags(bars, entry, stop, target);
  const grade = gradeSetup(overall, flags);

  // Infer entry type from recent price action
  const closes = bars.map(b => b.close);
  const recentHigh = Math.max(...bars.slice(-10).map(b => b.high));
  const recentLow = Math.min(...bars.slice(-10).map(b => b.low));
  const ema21 = ema(closes, 21);
  const nearEMA = Math.abs(entry - ema21[ema21.length - 1]) / entry < 0.015;
  const atBreakout = direction === 'LONG' && entry >= recentHigh * 0.99;

  const entryType = atBreakout
    ? 'BREAKOUT'
    : nearEMA
    ? 'PULLBACK'
    : 'REVERSAL';

  return {
    ticker,
    grade,
    direction,
    entryType,
    entry,
    stop,
    target,
    rr: Math.round(rr * 100) / 100,
    riskWidth: riskPct < 1.5 ? 'TIGHT' : 'WIDE',
    thesis: buildThesis(score, regime, direction),
    score,
    flags,
    meta,
  };
}
