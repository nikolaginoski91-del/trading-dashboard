'use client';
import { TradeCard } from '@/lib/types';
import { DataBadge } from './DataBadge';

interface Props {
  trade: TradeCard;
  onWatchlist?: () => void;
}

const GRADE_CONFIG = {
  'A+': { color: 'text-emerald-300', bg: 'bg-emerald-400/15 border-emerald-400/30', badge: 'bg-emerald-400 text-black' },
  'A':  { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', badge: 'bg-emerald-500 text-black' },
  'B':  { color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/20',   badge: 'bg-yellow-400 text-black'  },
  'C':  { color: 'text-white/40',    bg: 'bg-white/5 border-white/10',               badge: 'bg-white/20 text-white'    },
  'SKIP': { color: 'text-white/30', bg: 'bg-white/5 border-white/5',                badge: 'bg-white/10 text-white/50' },
};

const ENTRY_LABELS = {
  BREAKOUT: '⚡ Breakout',
  PULLBACK: '↩ Pullback',
  REVERSAL: '↔ Reversal',
};

const FLAG_LABELS: Record<string, string> = {
  BAD_RR: '⚠ R:R < 1.8',
  WIDE_STOP: '⚠ Wide stop',
  LOW_VOLUME: '⚠ Low volume',
  CHOPPY_CHART: '⚠ Choppy chart',
  EARNINGS_RISK: '⚠ Earnings near',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const color = value >= 7 ? 'bg-emerald-400' : value >= 5 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-white/50 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export function TradeCardView({ trade, onWatchlist }: Props) {
  const cfg = GRADE_CONFIG[trade.grade] ?? GRADE_CONFIG['C'];
  const isLong = trade.direction === 'LONG';

  const formatPrice = (p: number) =>
    p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`mx-4 my-3 rounded-2xl border ${cfg.bg} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">{trade.ticker}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {trade.grade}
            </span>
            <span className={`text-xs font-semibold ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
              {isLong ? '▲ LONG' : '▼ SHORT'}
            </span>
          </div>
          <span className="text-[11px] text-white/40 font-medium">
            {ENTRY_LABELS[trade.entryType]}
          </span>
        </div>
        <p className="text-[11px] text-white/50 italic">{trade.thesis}</p>
      </div>

      {/* The 4 numbers that matter */}
      <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10">
        {[
          { label: 'Entry', value: formatPrice(trade.entry), color: 'text-white' },
          { label: 'Stop', value: formatPrice(trade.stop), color: 'text-red-400' },
          { label: 'Target', value: formatPrice(trade.target), color: 'text-emerald-400' },
          { label: 'R:R', value: `1:${trade.rr}`, color: trade.rr >= 2 ? 'text-emerald-400' : 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3 py-3 text-center">
            <div className="text-[10px] text-white/30 mb-1">{label}</div>
            <div className={`text-sm font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Score breakdown */}
      <div className="px-4 py-3 border-b border-white/10 space-y-1.5">
        <ScoreBar label="Trend" value={trade.score.trend} />
        <ScoreBar label="Momentum" value={trade.score.momentum} />
        <ScoreBar label="Structure" value={trade.score.structure} />
        <ScoreBar label="Risk" value={trade.score.risk} />
        <ScoreBar label="Regime" value={trade.score.regime} />
      </div>

      {/* Flags + meta */}
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {trade.flags.length === 0 ? (
            <span className="text-[10px] text-emerald-400/60">✓ No flags</span>
          ) : (
            trade.flags.map(f => (
              <span key={f} className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                {FLAG_LABELS[f] ?? f}
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataBadge meta={trade.meta} />
          {onWatchlist && (
            <button
              onClick={onWatchlist}
              className="text-[11px] text-white/40 hover:text-white/80 active:scale-95 transition-all px-2 py-1 rounded-lg bg-white/5 active:bg-white/10"
            >
              + Watch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
