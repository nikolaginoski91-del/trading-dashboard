import { NextResponse } from 'next/server';
import { getBTCPrice } from '@/lib/dataFetcher';
import { APIResponse, BTCResult } from '@/lib/types';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  try {
    const { data, meta } = await getBTCPrice();

    const result: BTCResult = { btc: data, meta };
    const response: APIResponse<BTCResult> = { ok: true, data: result };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Data-Source': meta.source,
        'X-Data-Stale': String(meta.stale),
        'X-Data-Age': String(meta.ageSeconds),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/btc]', error);
    const response: APIResponse<null> = { ok: false, data: null, error };
    return NextResponse.json(response, { status: 503 });
  }
}
