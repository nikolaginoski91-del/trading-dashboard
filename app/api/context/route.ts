import { NextRequest, NextResponse } from 'next/server';
import { getEquityPrice, getOHLC } from '@/lib/dataFetcher';
import { computeRegime } from '@/lib/regime';
import { scoreSetup } from '@/lib/scorer';
import { APIResponse, ContextResult } from '@/lib/types';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
    const response: APIResponse<null> = {
      ok: false,
      data: null,
      error: 'Invalid ticker. Pass ?ticker=AAPL',
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    // Fetch all data in parallel
    const [priceResult, ohlcResult, spyPrice, qqqPrice, spyOHLC, qqqOHLC] =
      await Promise.all([
        getEquityPrice(ticker),
        getOHLC(ticker, 60),
        getEquityPrice('SPY'),
        getEquityPrice('QQQ'),
        getOHLC('SPY', 60),
        getOHLC('QQQ', 60),
      ]);

    const regimeMeta = spyPrice.meta;
    regimeMeta.stale =
      spyPrice.meta.stale || qqqPrice.meta.stale || spyOHLC.meta.stale || qqqOHLC.meta.stale;

    const regime = computeRegime(
      spyOHLC.data,
      qqqOHLC.data,
      spyPrice.data,
      qqqPrice.data,
      regimeMeta
    );

    const bars = ohlcResult.data;
    const lastBar = bars[bars.length - 1];
    const price = priceResult.data.price;

    // Auto-derive entry/stop/target from ATR
    const atrVal =
      bars
        .slice(-14)
        .reduce((acc, bar, i, arr) => {
          if (i === 0) return acc;
          const prev = arr[i - 1];
          return acc + Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close));
        }, 0) / 13;

    // LONG setup: entry at current, stop 1×ATR below, target 2×ATR above
    const direction = regime.regime === 'BEAR' ? 'SHORT' : 'LONG';
    const entry = price;
    const stop = direction === 'LONG' ? price - atrVal : price + atrVal;
    const target = direction === 'LONG' ? price + atrVal * 2.5 : price - atrVal * 2.5;

    const trade = scoreSetup(
      ticker,
      bars,
      regime,
      direction,
      entry,
      stop,
      target,
      ohlcResult.meta
    );

    const result: ContextResult = {
      ticker,
      price: priceResult.data,
      ohlc: bars,
      regime,
      trade: trade.grade !== 'SKIP' && trade.grade !== 'C' ? trade : null,
      meta: priceResult.meta,
    };

    const response: APIResponse<ContextResult> = { ok: true, data: result };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Trade-Grade': trade.grade,
        'X-Data-Stale': String(priceResult.meta.stale),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[/api/context?ticker=${ticker}]`, error);
    const response: APIResponse<null> = { ok: false, data: null, error };
    return NextResponse.json(response, { status: 503 });
  }
}
