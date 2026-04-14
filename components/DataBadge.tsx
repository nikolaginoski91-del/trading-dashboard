'use client';
import { DataMeta } from '@/lib/types';

interface Props {
  meta: DataMeta;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  binance: 'Binance',
  coingecko: 'CoinGecko',
  yahoo: 'Yahoo',
  stooq: 'Stooq',
  cache: 'Cache',
};

export function DataBadge({ meta, className = '' }: Props) {
  const isStale = meta.stale;
  const isOld = meta.ageSeconds > 120;
  const isFresh = !isStale && meta.ageSeconds < 60;

  const color = isStale
    ? 'text-red-400 border-red-400/30 bg-red-400/10'
    : isOld
    ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';

  const dot = isStale ? '●' : isOld ? '●' : '●';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${color} ${className}`}
    >
      <span className={`text-[8px] ${isFresh ? 'animate-pulse' : ''}`}>{dot}</span>
      {SOURCE_LABELS[meta.source] ?? meta.source}
      {isStale ? ' · STALE' : ` · ${meta.ageSeconds}s`}
    </span>
  );
}
