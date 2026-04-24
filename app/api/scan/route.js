import { runFullScan } from "@/lib/scanner";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const data = await runFullScan();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}