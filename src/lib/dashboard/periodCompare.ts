// Period-over-period comparison — "Previous period" / "Previous year" /
// "Custom", the same pattern GA4 and Google Ads use. Pure and
// testable: given the already-loaded rows, the dashboard's current
// filters, and a comparison mode, returns current vs comparison KPI
// totals and the delta per metric. Reuses applyFilters()/aggregateKpis()
// from aggregate.ts rather than reimplementing the KPI math.
import type { AdRow, DashboardFilters, KpiBlock } from './types';
import { applyFilters, aggregateKpis } from './aggregate';
import type { MetricKey } from './metrics';

export type CompareMode = 'previous_period' | 'previous_year' | 'custom';

export interface DateRange {
  from: string; // 'YYYY-MM-DD'
  to: string;
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// Local-date formatting (NOT toISOString(), which converts to UTC and
// would shift the date by a day in timezones ahead of UTC).
function fromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return fromDate(d);
}

export function daysInclusive(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400000) + 1;
}

/** The equal-length range immediately before `current` — e.g. current =
 *  a calendar month → previous = the prior calendar month; current = any
 *  2-week range → previous = the 2 weeks immediately before it. This one
 *  rule covers week-on-week, bi-week-on-bi-week and month-on-month,
 *  whatever granularity the user already picked via the normal date
 *  filter — no separate "previous week"/"previous month" modes needed. */
export function getPreviousPeriodRange(current: DateRange): DateRange {
  const len = daysInclusive(current.from, current.to);
  const to = addDaysIso(current.from, -1);
  const from = addDaysIso(to, -(len - 1));
  return { from, to };
}

/** Same calendar dates, one year earlier. */
export function getPreviousYearRange(current: DateRange): DateRange {
  const shift = (iso: string) => {
    const d = toDate(iso);
    d.setFullYear(d.getFullYear() - 1);
    return fromDate(d);
  };
  return { from: shift(current.from), to: shift(current.to) };
}

export function resolveComparisonRange(current: DateRange, mode: CompareMode, custom?: DateRange): DateRange | null {
  if (mode === 'previous_period') return getPreviousPeriodRange(current);
  if (mode === 'previous_year') return getPreviousYearRange(current);
  if (mode === 'custom') return custom && custom.from && custom.to ? custom : null;
  return null;
}

export interface MetricDelta {
  key: MetricKey;
  current: number;
  previous: number;
  absDelta: number;
  // null when the previous period was zero — "% change" is undefined, not
  // infinite or zero, and must be shown as such, not faked.
  pctDelta: number | null;
}

export interface PeriodComparisonResult {
  currentRange: DateRange;
  previousRange: DateRange;
  currentKpis: KpiBlock;
  previousKpis: KpiBlock;
  deltas: Partial<Record<MetricKey, MetricDelta>>;
}

const COMPARABLE_METRICS: MetricKey[] = [
  'impressions', 'reach', 'clicks', 'spend', 'link_clicks', 'landing_page_views', 'engagements',
  'video_plays', 'video_100', 'conversions', 'revenue', 'ctr', 'cpc', 'cpm', 'roas', 'cvr', 'vtr',
];

/** Builds the comparison, re-applying the dashboard's own non-date filters
 *  (platform/channel/market/funnel stage) to both periods so the
 *  comparison respects whatever the user is already looking at. Returns
 *  null when there's nothing to compare (custom range not picked yet, or
 *  no rows at all in the comparison range). */
export function buildPeriodComparison(
  allRows: AdRow[], filters: DashboardFilters, mode: CompareMode, customRange?: DateRange,
): PeriodComparisonResult | null {
  const currentRange: DateRange = { from: filters.dateFrom, to: filters.dateTo };
  const previousRange = resolveComparisonRange(currentRange, mode, customRange);
  if (!previousRange) return null;

  const currentRows = applyFilters(allRows, { ...filters, dateFrom: currentRange.from, dateTo: currentRange.to });
  const previousRows = applyFilters(allRows, { ...filters, dateFrom: previousRange.from, dateTo: previousRange.to });

  const currentKpis = aggregateKpis(currentRows);
  const previousKpis = aggregateKpis(previousRows);

  const deltas: Partial<Record<MetricKey, MetricDelta>> = {};
  COMPARABLE_METRICS.forEach((key) => {
    const curVal = (currentKpis as unknown as Record<string, number | undefined>)[key];
    const prevVal = (previousKpis as unknown as Record<string, number | undefined>)[key];
    if (curVal === undefined && prevVal === undefined) return;
    const cur = curVal ?? 0;
    const prev = prevVal ?? 0;
    if (cur === 0 && prev === 0) return; // nothing to show either side
    deltas[key] = {
      key,
      current: cur,
      previous: prev,
      absDelta: cur - prev,
      pctDelta: prev !== 0 ? (cur - prev) / prev : null,
    };
  });

  return { currentRange, previousRange, currentKpis, previousKpis, deltas };
}
