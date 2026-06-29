import { NextResponse } from 'next/server';
import { getDummyRows } from '@/lib/dashboard/dummyData';
import { aggregateKpis, aggregateByFunnelStage, buildTrend, buildBreakdown } from '@/lib/dashboard/aggregate';

// This route now only serves the demo dataset for server-side use.
// Real client data is ingested via /api/dashboard/ingest and processed client-side.
export async function GET() {
  const rows = getDummyRows();
  return NextResponse.json({
    client: 'demo',
    refreshedAt: new Date().toISOString(),
    totals: aggregateKpis(rows),
    byFunnelStage: aggregateByFunnelStage(rows),
    trend: buildTrend(rows),
    breakdown: buildBreakdown(rows, 'category'),
    availableChannels: [...new Set(rows.map((r) => r.channel).filter(Boolean) as string[])].sort(),
    availableMarkets: [...new Set(rows.map((r) => r.market).filter(Boolean) as string[])].sort(),
  });
}
