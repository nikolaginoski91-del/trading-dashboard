'use client';
import { BTCResult } from '@/lib/types';
import { DataBadge } from './DataBadge';

interface Props {
  btc: BTCResult | null;
  loading?: boolean;
}

export function BTCHero({ btc, loading }: Props) {
  if (loading || !btc) {
    return (
      <div className="px-4 pt-4 pb-3 animate-pulse">
        <div className="h-8 w-44 bg-white/10 rounded mb-2" />
        <div className="h-4 w-24 bg-white/10 rounded" />
      </div>
    );
  }

  const { price, changePct, change, high, low } = btc.btc;
  const isUp = changePct >= 0;

  return (
    <div className="px-4 pt-4 pb-3 border-b border-white/10">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              ${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className={`text-sm font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[11px] text-white/40 mt-0.5 font-medium tracking-wide">
            BTC/USD &nbsp;·&nbsp;
            <span className="text-white/30">H:{high.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            &nbsp;
            <span className="text-white/30">L:{low.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <DataBadge meta={btc.meta} />
          <span className={`text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
