'use client';
import { RegimeResult } from '@/lib/types';
import { DataBadge } from './DataBadge';

interface Props {
  regime: RegimeResult | null;
  loading?: boolean;
}

const REGIME_CONFIG = {
  BULL: { label: '▲ BULL', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  BEAR: { label: '▼ BEAR', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  NEUTRAL: { label: '◆ NEUTRAL', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
};

export function RegimeBar({ regime, loading }: Props) {
  if (loading || !regime) {
    return (
      <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 animate-pulse">
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
    );
  }

  const cfg = REGIME_CONFIG[regime.regime];
  const spyDir = regime.spy.changePct >= 0 ? '+' : '';
  const qqqDir = regime.qqq.changePct >= 0 ? '+' : '';

  return (
    <div className={`h-10 border-b flex items-center justify-between px-4 ${cfg.bg} border-white/10`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold tracking-widest ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="text-[10px] text-white/40 font-medium">
          {Math.round(regime.confidence * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/60">
          SPY{' '}
          <span className={regime.spy.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {spyDir}{regime.spy.changePct.toFixed(2)}%
          </span>
        </span>
        <span className="text-[11px] text-white/60">
          QQQ{' '}
          <span className={regime.qqq.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {qqqDir}{regime.qqq.changePct.toFixed(2)}%
          </span>
        </span>
        <DataBadge meta={regime.meta} />
      </div>
    </div>
  );
}
