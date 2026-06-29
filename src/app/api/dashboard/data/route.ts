import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/dashboard/clients';
import { fetchClientRows } from '@/lib/dashboard/sheets';
import {
  applyFilters,
  aggregateKpis,
  aggregateByFunnelStage,
  buildTrend,
  buildBreakdown,
} from '@/lib/dashboard/aggregate';
import type { DashboardFilters } from '@/lib/dashboard/types';

// Cache for 5 minutes on Vercel Edge
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get('client') ?? 'shimano';
  const breakdownDim = (searchParams.get('breakdown') ?? 'category') as DashboardFilters['breakdownDim'];

  const filters: Partial<DashboardFilters> = {};
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const platforms = searchParams.get('platforms');
  if (platforms) filters.platforms = platforms.split(',') as DashboardFilters['platforms'];

  const channels = searchParams.get('channels');
  if (channels) filters.channels = channels.split(',');

  const markets = searchParams.get('markets');
  if (markets) filters.markets = markets.split(',');

  const stages = searchParams.get('stages');
  if (stages) filters.funnelStages = stages.split(',') as DashboardFilters['funnelStages'];

  try {
    const client = getClient(clientId);
    const allRows = await fetchClientRows(client);
    const filtered = applyFilters(allRows, filters);

    return NextResponse.json({
      client: clientId,
      refreshedAt: new Date().toISOString(),
      totals: aggregateKpis(filtered),
      byFunnelStage: aggregateByFunnelStage(filtered),
      trend: buildTrend(filtered),
      breakdown: buildBreakdown(filtered, breakdownDim),
      // Expose dimension values available for filter dropdowns
      availableChannels: [...new Set(allRows.map((r) => r.channel).filter(Boolean))].sort(),
      availableMarkets: [...new Set(allRows.map((r) => r.market).filter(Boolean))].sort(),
    });
  } catch (err) {
    console.error('[dashboard/data]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
