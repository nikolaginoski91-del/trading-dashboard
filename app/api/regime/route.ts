import { NextResponse } from 'next/server';
import { getEquityPrice, getOHLC } from '@/lib/dataFetcher';
import { computeRegime } from '@/lib/regime';
import { APIResponse, RegimeResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [spyPrice, qqqPrice, spyOHLC, qqqOHLC] = await Promise.all([
      getEquityPrice('SPY'),
      getEquityPrice('QQQ'),
      getOHLC('SPY', 60),
      getOHLC('QQQ', 60),
    ]);

    const meta = { ...spyPrice.meta };
    meta.stale = spyPrice.meta.stale || qqqPrice.meta.stale || spyOHLC.meta.stale || qqqOHLC.meta.stale;

    const regime = computeRegime(spyOHLC.data, qqqOHLC.data, spyPrice.data, qqqPrice.data, meta);
    const response: APIResponse<RegimeResult> = { ok: true, data: regime };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Regime': regime.regime,
        'X-Confidence': regime.confidence.toFixed(2),
        'X-Data-Stale': String(meta.stale),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/regime]', error);
    const response: APIResponse<null> = { ok: false, data: null, error };
    return NextResponse.json(response, { status: 503 });
  }
}
