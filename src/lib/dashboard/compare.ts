import type { AdRow } from './types';
import type { CompareResult, CompareRow, CompareTrendPoint, ParsedMediaPlan } from './mediaPlanTypes';
import { normalizeChannel, channelLabel } from './mediaPlanParser';

// ── Actual data aggregation ─────────────────────────────────────────────────

interface ActualGroup {
  spend: number;
  impressions: number;
  clicks: number;
  views: number;
}

function groupActuals(rows: AdRow[]): Map<string, ActualGroup> {
  const map = new Map<string, ActualGroup>();
  for (const row of rows) {
    if (!row.channel) continue;
    const ch = normalizeChannel(row.channel);
    const phase = row.funnel_stage ?? 'unknown';
    const market = row.market ?? 'All';
    const key = `${ch}|${phase}|${market}`;
    const existing = map.get(key) ?? { spend: 0, impressions: 0, clicks: 0, views: 0 };
    existing.spend += row.spend ?? 0;
    existing.impressions += row.impressions ?? 0;
    existing.clicks += row.clicks ?? 0;
    existing.views += (row.video_plays ?? 0);
    map.set(key, existing);
  }
  return map;
}

// Also aggregated without market for cross-market matching
function groupActualsNoMarket(rows: AdRow[]): Map<string, ActualGroup> {
  const map = new Map<string, ActualGroup>();
  for (const row of rows) {
    if (!row.channel) continue;
    const ch = normalizeChannel(row.channel);
    const phase = row.funnel_stage ?? 'unknown';
    const key = `${ch}|${phase}`;
    const existing = map.get(key) ?? { spend: 0, impressions: 0, clicks: 0, views: 0 };
    existing.spend += row.spend ?? 0;
    existing.impressions += row.impressions ?? 0;
    existing.clicks += row.clicks ?? 0;
    existing.views += (row.video_plays ?? 0);
    map.set(key, existing);
  }
  return map;
}

// ── Period trend aggregation ─────────────────────────────────────────────────

function groupActualsByPeriod(
  rows: AdRow[],
  periods: Array<{ periodLabel: string; periodStart: string; periodEnd: string }>,
): Map<string, number> {
  // Returns periodLabel → actual spend
  const map = new Map<string, number>();
  for (const p of periods) {
    if (!map.has(p.periodLabel)) map.set(p.periodLabel, 0);
  }
  for (const row of rows) {
    if (!row.date || row.spend == null) continue;
    const d = row.date.slice(0, 10);
    for (const p of periods) {
      if (d >= p.periodStart && d <= p.periodEnd) {
        map.set(p.periodLabel, (map.get(p.periodLabel) ?? 0) + (row.spend ?? 0));
        break;
      }
    }
  }
  return map;
}

// ── Main comparison builder ─────────────────────────────────────────────────

export function buildCompareResult(actuals: AdRow[], plan: ParsedMediaPlan): CompareResult {
  // Decide whether to match with or without market dimension
  const planHasMultipleMarkets = new Set(plan.entries.map((e) => e.market)).size > 1;

  const actualsWithMarket = groupActuals(actuals);
  const actualsNoMarket = groupActualsNoMarket(actuals);

  // Aggregate planned entries by key
  const plannedMap = new Map<string, { spend: number; impressions?: number; clicks?: number; channelLabel: string }>();
  for (const e of plan.entries) {
    const key = planHasMultipleMarkets ? `${e.channel}|${e.phase}|${e.market}` : `${e.channel}|${e.phase}`;
    const existing = plannedMap.get(key);
    if (existing) {
      existing.spend += e.spend;
      if (e.impressions != null) existing.impressions = (existing.impressions ?? 0) + e.impressions;
      if (e.clicks != null) existing.clicks = (existing.clicks ?? 0) + e.clicks;
    } else {
      plannedMap.set(key, {
        spend: e.spend,
        impressions: e.impressions,
        clicks: e.clicks,
        channelLabel: e.channelLabel,
      });
    }
  }

  const rows: CompareRow[] = [];
  for (const [key, planned] of plannedMap) {
    const parts = key.split('|');
    const channel = parts[0];
    const phase = parts[1];
    const market = parts[2] ?? 'All';

    const actual = planHasMultipleMarkets
      ? (actualsWithMarket.get(key) ?? { spend: 0, impressions: 0, clicks: 0 })
      : (actualsNoMarket.get(key) ?? { spend: 0, impressions: 0, clicks: 0 });

    rows.push({
      key,
      channel,
      channelLabel: planned.channelLabel || channelLabel(channel),
      phase,
      market,
      plannedSpend: planned.spend,
      actualSpend: actual.spend,
      pacing: planned.spend > 0 ? actual.spend / planned.spend : 0,
      plannedImpressions: planned.impressions,
      actualImpressions: actual.impressions > 0 ? actual.impressions : undefined,
      plannedClicks: planned.clicks,
      actualClicks: actual.clicks > 0 ? actual.clicks : undefined,
    });
  }

  // Sort by planned spend descending
  rows.sort((a, b) => b.plannedSpend - a.plannedSpend);

  // ── Trend points ────────────────────────────────────────────────────────
  let trendPoints: CompareTrendPoint[] = [];
  if (plan.hasPeriods && plan.periodEntries.length > 0) {
    // Get unique periods in order
    const seenLabels = new Set<string>();
    const uniquePeriods = plan.periodEntries
      .filter((p) => { if (seenLabels.has(p.periodLabel)) return false; seenLabels.add(p.periodLabel); return true; })
      .map((p) => ({ periodLabel: p.periodLabel, periodStart: p.periodStart, periodEnd: p.periodEnd }));

    // Sum planned spend per period across all channels
    const plannedByPeriod = new Map<string, number>();
    for (const p of plan.periodEntries) {
      plannedByPeriod.set(p.periodLabel, (plannedByPeriod.get(p.periodLabel) ?? 0) + p.spend);
    }

    // Sum actual spend per period
    const actualByPeriod = groupActualsByPeriod(actuals, uniquePeriods);

    trendPoints = uniquePeriods.map((p) => ({
      period: p.periodLabel,
      planned: plannedByPeriod.get(p.periodLabel) ?? 0,
      actual: actualByPeriod.get(p.periodLabel) ?? 0,
    }));
  }

  const totalPlanned = rows.reduce((s, r) => s + r.plannedSpend, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualSpend, 0);

  return {
    rows,
    trendPoints,
    totalPlanned,
    totalActual,
    pacing: totalPlanned > 0 ? totalActual / totalPlanned : 0,
  };
}

// ── AI context string ───────────────────────────────────────────────────────

export function buildCompareContext(result: CompareResult, planName: string): string {
  const fmt = (n: number) => `€${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  const lines = [
    `## Media Plan vs Actual Performance (${planName})`,
    `Overall budget pacing: ${pct(result.pacing)} (Planned ${fmt(result.totalPlanned)}, Actual ${fmt(result.totalActual)})`,
    '',
    'Channel-level pacing:',
  ];

  for (const row of result.rows) {
    const variance = row.actualSpend - row.plannedSpend;
    const sign = variance >= 0 ? '+' : '';
    lines.push(
      `  ${row.channelLabel} (${row.phase}): Planned ${fmt(row.plannedSpend)} | Actual ${fmt(row.actualSpend)} | Pacing ${pct(row.pacing)} | Variance ${sign}${fmt(variance)}`
    );
  }

  return lines.join('\n');
}
