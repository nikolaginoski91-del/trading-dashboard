'use client';
import { useState } from 'react';

const QUICK_TICKERS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'META', 'AMD', 'SPY', 'QQQ'];

interface Props {
  onAnalyze: (ticker: string) => void;
  loading?: boolean;
}

export function TickerInput({ onAnalyze, loading }: Props) {
  const [value, setValue] = useState('');

  const submit = (t: string) => {
    const clean = t.trim().toUpperCase();
    if (clean) {
      setValue(clean);
      onAnalyze(clean);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-white/10">
      {/* Input row */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && submit(value)}
          placeholder="TICKER"
          maxLength={5}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm font-bold tracking-widest placeholder:text-white/20 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={() => submit(value)}
          disabled={!value || loading}
          className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl disabled:opacity-30 active:scale-95 transition-all"
        >
          {loading ? '···' : 'Analyze'}
        </button>
      </div>

      {/* Quick tickers */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {QUICK_TICKERS.map(t => (
          <button
            key={t}
            onClick={() => submit(t)}
            className="shrink-0 px-3 py-1.5 bg-white/8 border border-white/10 rounded-lg text-[11px] font-semibold text-white/60 active:bg-white/15 active:text-white transition-all"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
