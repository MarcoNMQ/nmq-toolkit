import type { AdRow, KpiBlock, TrendPoint, BreakdownRow, DashboardFilters } from './types';

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function applyFilters(rows: AdRow[], filters: Partial<DashboardFilters>): AdRow[] {
  return rows.filter((r) => {
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    if (filters.platforms?.length && !filters.platforms.includes(r.platform)) return false;
    if (filters.channels?.length && r.channel && !filters.channels.includes(r.channel)) return false;
    if (filters.markets?.length && r.market && !filters.markets.includes(r.market)) return false;
    if (
      filters.funnelStages?.length &&
      r.funnel_stage &&
      r.funnel_stage !== 'unknown' &&
      !filters.funnelStages.includes(r.funnel_stage as never)
    ) return false;
    return true;
  });
}

export function aggregateKpis(rows: AdRow[]): KpiBlock {
  const totals = rows.reduce(
    (acc, r) => {
      acc.spend += r.spend;
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.link_clicks += r.link_clicks ?? 0;
      acc.landing_page_views += r.landing_page_views ?? 0;
      acc.engagements += r.engagements ?? 0;
      acc.video_plays += r.video_plays ?? 0;
      acc.video_100 += r.video_100 ?? 0;
      acc.conversions += r.conversions ?? 0;
      acc.revenue += r.revenue ?? 0;
      return acc;
    },
    {
      spend: 0, impressions: 0, clicks: 0, link_clicks: 0,
      landing_page_views: 0, engagements: 0, video_plays: 0,
      video_100: 0, conversions: 0, revenue: 0,
    }
  );

  return {
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    link_clicks: totals.link_clicks,
    landing_page_views: totals.landing_page_views,
    engagements: totals.engagements,
    video_plays: totals.video_plays,
    video_100: totals.video_100,
    conversions: totals.conversions,
    revenue: totals.revenue,
    ctr: safeDivide(totals.clicks, totals.impressions),
    cpc: safeDivide(totals.spend, totals.clicks),
    cpm: safeDivide(totals.spend, totals.impressions) * 1000,
    roas: totals.revenue ? safeDivide(totals.revenue, totals.spend) : undefined,
    cvr: totals.conversions ? safeDivide(totals.conversions, totals.clicks) : undefined,
    vtr: totals.video_100 ? safeDivide(totals.video_100, totals.impressions) : undefined,
  };
}

export function aggregateByFunnelStage(rows: AdRow[]): Record<string, KpiBlock> {
  const byStage: Record<string, AdRow[]> = {};
  for (const r of rows) {
    const stage = r.funnel_stage ?? 'unknown';
    if (!byStage[stage]) byStage[stage] = [];
    byStage[stage].push(r);
  }
  return Object.fromEntries(
    Object.entries(byStage).map(([stage, stageRows]) => [stage, aggregateKpis(stageRows)])
  );
}

export function buildTrend(rows: AdRow[]): TrendPoint[] {
  const byDate: Record<string, AdRow[]> = {};
  for (const r of rows) {
    if (!r.date) continue;
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dateRows]) => {
      const kpi = aggregateKpis(dateRows);
      // Format label as "Jun 15"
      const d = new Date(date + 'T00:00:00');
      const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      return {
        label,
        impressions: kpi.impressions,
        clicks: kpi.clicks,
        spend: kpi.spend,
        conversions: kpi.conversions ?? 0,
        video_plays: kpi.video_plays ?? 0,
        ctr: kpi.ctr,
        cpm: kpi.cpm,
      };
    });
}

export function buildBreakdown(
  rows: AdRow[],
  dim: DashboardFilters['breakdownDim']
): BreakdownRow[] {
  const byDim: Record<string, AdRow[]> = {};
  for (const r of rows) {
    const key = (r[dim] as string | undefined) ?? 'Unknown';
    if (!byDim[key]) byDim[key] = [];
    byDim[key].push(r);
  }

  return Object.entries(byDim)
    .map(([dimVal, dimRows]) => {
      const kpi = aggregateKpis(dimRows);
      return {
        dim: dimVal,
        impressions: kpi.impressions,
        clicks: kpi.clicks,
        spend: kpi.spend,
        conversions: kpi.conversions ?? 0,
        video_plays: kpi.video_plays ?? 0,
        ctr: kpi.ctr,
        cpc: kpi.cpc,
        cpm: kpi.cpm,
        roas: kpi.roas,
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}
