'use client';
import { useState, useCallback, useEffect } from 'react';
import { RegimeBar } from '@/components/RegimeBar';
import { BTCHero } from '@/components/BTCHero';
import { TickerInput } from '@/components/TickerInput';
import { TradeCardView } from '@/components/TradeCardView';
import { APIResponse, BTCResult, RegimeResult, ContextResult, WatchlistEntry } from '@/lib/types';

const POLL_INTERVAL_MS = 60_000;

export default function DashboardPage() {
  const [btc, setBtc] = useState<BTCResult | null>(null);
  const [regime, setRegime] = useState<RegimeResult | null>(null);
  const [context, setContext] = useState<ContextResult | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);

  const [btcLoading, setBtcLoading] = useState(true);
  const [regimeLoading, setRegimeLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'analyze' | 'watchlist'>('analyze');

  const fetchBTC = useCallback(async () => {
    try {
      const res = await fetch('/api/btc');
      const json: APIResponse<BTCResult> = await res.json();
      if (json.ok && json.data) setBtc(json.data);
    } catch (e) {
      console.warn('BTC fetch failed', e);
    } finally {
      setBtcLoading(false);
    }
  }, []);

  const fetchRegime = useCallback(async () => {
    try {
      const res = await fetch('/api/regime');
      const json: APIResponse<RegimeResult> = await res.json();
      if (json.ok && json.data) setRegime(json.data);
    } catch (e) {
      console.warn('Regime fetch failed', e);
    } finally {
      setRegimeLoading(false);
    }
  }, []);

  const analyze = useCallback(async (ticker: string) => {
    setContextLoading(true);
    setContextError(null);
    setContext(null);
    setActiveTab('analyze');
    try {
      const res = await fetch('/api/context?ticker=' + ticker);
      const json: APIResponse<ContextResult> = await res.json();
      if (json.ok && json.data) {
        setContext(json.data);
      } else {
        setContextError(json.error ?? 'Failed to analyze ticker');
      }
    } catch (e) {
      setContextError('Network error — check connection');
      console.warn('Context fetch failed', e);
    } finally {
      setContextLoading(false);
    }
  }, []);

  const addToWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => {
      if (prev.find(e => e.ticker === ticker)) return prev;
      return [...prev, { ticker, addedAt: Date.now() }];
    });
  }, []);

  const removeFromWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => prev.filter(e => e.ticker !== ticker));
  }, []);

  useEffect(() => {
    fetchBTC();
    fetchRegime();
    const interval = setInterval(() => {
      fetchBTC();
      fetchRegime();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchBTC, fetchRegime]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
      <RegimeBar regime={regime} loading={regimeLoading} />
      <BTCHero btc={btc} loading={btcLoading} />

      <div className="flex border-b border-white/10 px-4">
        {(['analyze', 'watchlist'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors relative ${
              activeTab === tab ? 'text-white' : 'text-white/30'
            }`}
          >
            {tab === 'watchlist' ? 'Watchlist (' + watchlist.length + ')' : 'Analyze'}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {activeTab === 'analyze' && (
          <div>
            <TickerInput onAnalyze={analyze} loading={contextLoading} />

            {contextLoading && (
              <div className="px-4 py-8 text-center">
                <div className="text-white/30 text-sm animate-pulse">Analyzing…</div>
              </div>
            )}

            {contextError && !contextLoading && (
              <div className="mx-4 mt-4 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-xl">
                <p className="text-red-400 text-xs font-medium">{contextError}</p>
              </div>
            )}

            {context && !contextLoading && (
              <div>
                {context.trade ? (
                  <TradeCardView
                    trade={context.trade}
                    onWatchlist={() => addToWatchlist(context.ticker)}
                  />
                ) : (
                  <div className="mx-4 mt-4 px-4 py-5 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-white/50 text-sm font-medium mb-1">
                      {context.ticker} — No trade signal
                    </p>
                    <p className="text-white/25 text-xs">
                      Setup does not meet quality thresholds. Score below B or flags present.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="text-[10px] text-white/30">
                        Price: ${context.price.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className={`text-[10px] ${context.price.changePct >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {context.price.changePct >= 0 ? '+' : ''}{context.price.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!context && !contextLoading && !contextError && (
              <div className="px-4 py-10 text-center">
                <p className="text-white/20 text-sm">Enter a ticker to analyze</p>
                <p className="text-white/10 text-xs mt-1">Only A/A+ setups surface as signals</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="px-4 py-3">
            {watchlist.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-white/20 text-sm">Watchlist empty</p>
                <p className="text-white/10 text-xs mt-1">Tap + Watch on any signal to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {watchlist.map(entry => (
                  <div
                    key={entry.ticker}
                    className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div>
                      <span className="text-sm font-bold">{entry.ticker}</span>
                      <span className="text-[10px] text-white/30 ml-2">
                        {new Date(entry.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { analyze(entry.ticker); setActiveTab('analyze'); }}
                        className="text-[11px] text-white/50 px-3 py-1 bg-white/5 rounded-lg active:bg-white/15 transition-all"
                      >
                        Analyze
                      </button>
                      <button
                        onClick={() => removeFromWatchlist(entry.ticker)}
                        className="text-[11px] text-red-400/60 px-3 py-1 bg-red-400/5 rounded-lg active:bg-red-400/15 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
