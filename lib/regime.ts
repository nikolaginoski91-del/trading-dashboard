import { OHLCBar, RegimeLabel, RegimeResult, RegimeSignal, PriceData, DataMeta } from './types';

// ─── EMA ─────────────────────────────────────────────────────────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0];
  for (const v of values) {
    const cur = v * k + prev * (1 - k);
    result.push(cur);
    prev = cur;
  }
  return result;
}

// ─── Average True Range ───────────────────────────────────────────────────────

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

// ─── Rate of Change ───────────────────────────────────────────────────────────

function roc(values: number[], period: number): number {
  if (values.length < period + 1) return 0;
  const cur = values[values.length - 1];
  const prev = values[values.length - 1 - period];
  return ((cur - prev) / prev) * 100;
}

// ─── Signal: Trend (price vs 21 EMA) ────────────────────────────────────────

function trendSignal(bars: OHLCBar[]): RegimeSignal {
  const closes = bars.map(b => b.close);
  const ema21 = ema(closes, 21);
  const latestClose = closes[closes.length - 1];
  const latestEMA = ema21[ema21.length - 1];
  const pctAbove = ((latestClose - latestEMA) / latestEMA) * 100;

  // Score: >2% above = +1, >1% = +0.5, within 1% = 0, below = negative
  let score: number;
  if (pctAbove > 2) score = 1;
  else if (pctAbove > 0.5) score = 0.5;
  else if (pctAbove > -0.5) score = 0;
  else if (pctAbove > -2) score = -0.5;
  else score = -1;

  return {
    name: 'trend',
    score,
    weight: 0.35,
    label: pctAbove > 0.5 ? 'Above 21 EMA' : pctAbove < -0.5 ? 'Below 21 EMA' : 'At 21 EMA',
  };
}

// ─── Signal: Momentum (5d ROC) ───────────────────────────────────────────────

function momentumSignal(bars: OHLCBar[]): RegimeSignal {
  const closes = bars.map(b => b.close);
  const roc5 = roc(closes, 5);

  let score: number;
  if (roc5 > 2) score = 1;
  else if (roc5 > 0.5) score = 0.5;
  else if (roc5 > -0.5) score = 0;
  else if (roc5 > -2) score = -0.5;
  else score = -1;

  return {
    name: 'momentum',
    score,
    weight: 0.25,
    label: `5d ROC ${roc5 > 0 ? '+' : ''}${roc5.toFixed(2)}%`,
  };
}

// ─── Signal: QQQ/SPY divergence (risk-on) ───────────────────────────────────

function divergenceSignal(spyBars: OHLCBar[], qqqBars: OHLCBar[]): RegimeSignal {
  const spyCloses = spyBars.map(b => b.close);
  const qqqCloses = qqqBars.map(b => b.close);

  const len = Math.min(spyCloses.length, qqqCloses.length, 5);
  const spyRoc = roc(spyCloses, len);
  const qqqRoc = roc(qqqCloses, len);
  const diff = qqqRoc - spyRoc; // positive = QQQ leading = risk-on

  let score: number;
  if (diff > 1) score = 1;
  else if (diff > 0) score = 0.5;
  else if (diff > -1) score = -0.5;
  else score = -1;

  return {
    name: 'qqq_spy_divergence',
    score,
    weight: 0.2,
    label: diff > 0 ? 'QQQ Leading (risk-on)' : 'SPY Leading (defensive)',
  };
}

// ─── Signal: Volatility (ATR% — high = avoid longs) ─────────────────────────

function volatilitySignal(bars: OHLCBar[]): RegimeSignal {
  const latestClose = bars[bars.length - 1].close;
  const atr14 = atr(bars, 14);
  const atrPct = (atr14 / latestClose) * 100;

  // Low vol = good for trend trades, high vol = chop/danger
  let score: number;
  if (atrPct < 0.8) score = 1;
  else if (atrPct < 1.2) score = 0.5;
  else if (atrPct < 1.8) score = 0;
  else if (atrPct < 2.5) score = -0.5;
  else score = -1;

  return {
    name: 'volatility',
    score,
    weight: 0.2,
    label: `ATR% ${atrPct.toFixed(2)}% (${atrPct < 1.2 ? 'Low' : atrPct < 2 ? 'Moderate' : 'High'})`,
  };
}

// ─── Regime Composite ────────────────────────────────────────────────────────

export function computeRegime(
  spyBars: OHLCBar[],
  qqqBars: OHLCBar[],
  spy: PriceData,
  qqq: PriceData,
  meta: DataMeta
): RegimeResult {
  if (spyBars.length < 30 || qqqBars.length < 30) {
    return {
      regime: 'NEUTRAL',
      confidence: 0,
      composite: 0,
      signals: [],
      spy,
      qqq,
      meta,
    };
  }

  const signals: RegimeSignal[] = [
    trendSignal(spyBars),
    momentumSignal(spyBars),
    divergenceSignal(spyBars, qqqBars),
    volatilitySignal(spyBars),
  ];

  const composite = signals.reduce((acc, s) => acc + s.score * s.weight, 0);

  let regime: RegimeLabel;
  if (composite > 0.4) regime = 'BULL';
  else if (composite < -0.4) regime = 'BEAR';
  else regime = 'NEUTRAL';

  const confidence = Math.min(Math.abs(composite) / 0.8, 1); // normalize to 0–1

  return {
    regime,
    confidence,
    composite,
    signals,
    spy,
    qqq,
    meta,
  };
}
