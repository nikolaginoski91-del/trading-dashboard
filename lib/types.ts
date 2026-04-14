// ─── Core Price Data ────────────────────────────────────────────────────────

export interface PriceData {
  symbol: string;
  price: number;
  change: number;       // absolute
  changePct: number;    // percentage
  high: number;
  low: number;
  volume: number;
  timestamp: number;    // unix ms
}

export interface OHLCBar {
  time: number;         // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Data Freshness ─────────────────────────────────────────────────────────

export type DataSource = 'binance' | 'coingecko' | 'yahoo' | 'stooq' | 'cache';

export interface DataMeta {
  source: DataSource;
  fetchedAt: number;    // unix ms
  stale: boolean;       // true if fallback cache was used
  ageSeconds: number;
}

// ─── Regime ─────────────────────────────────────────────────────────────────

export type RegimeLabel = 'BULL' | 'BEAR' | 'NEUTRAL';

export interface RegimeSignal {
  name: string;
  score: number;        // -1 to +1
  weight: number;
  label: string;
}

export interface RegimeResult {
  regime: RegimeLabel;
  confidence: number;   // 0–1
  composite: number;    // weighted score
  signals: RegimeSignal[];
  spy: PriceData;
  qqq: PriceData;
  meta: DataMeta;
}

// ─── BTC / Crypto Price ─────────────────────────────────────────────────────

export interface BTCResult {
  btc: PriceData;
  meta: DataMeta;
}

// ─── Trade Signal ────────────────────────────────────────────────────────────

export type TradeDirection = 'LONG' | 'SHORT';
export type EntryType = 'BREAKOUT' | 'PULLBACK' | 'REVERSAL';
export type RiskWidth = 'TIGHT' | 'WIDE';
export type TradeGrade = 'A+' | 'A' | 'B' | 'C' | 'SKIP';
export type TradeFlag = 'EARNINGS_RISK' | 'LOW_VOLUME' | 'WIDE_STOP' | 'CHOPPY_CHART' | 'BAD_RR';

export interface TradeScore {
  trend: number;        // 0–10
  momentum: number;     // 0–10
  structure: number;    // 0–10
  risk: number;         // 0–10
  regime: number;       // 0–10
  overall: number;      // weighted composite
}

export interface TradeCard {
  ticker: string;
  grade: TradeGrade;
  direction: TradeDirection;
  entryType: EntryType;
  entry: number;
  stop: number;
  target: number;
  rr: number;           // risk:reward ratio
  riskWidth: RiskWidth;
  thesis: string;
  score: TradeScore;
  flags: TradeFlag[];
  meta: DataMeta;
}

// ─── Context (analysis endpoint) ────────────────────────────────────────────

export interface ContextResult {
  ticker: string;
  price: PriceData;
  ohlc: OHLCBar[];      // last 60 daily bars
  regime: RegimeResult;
  trade: TradeCard | null;
  meta: DataMeta;
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

export interface WatchlistEntry {
  ticker: string;
  addedAt: number;
  note?: string;
}

// ─── API Response wrapper ────────────────────────────────────────────────────

export interface APIResponse<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}
