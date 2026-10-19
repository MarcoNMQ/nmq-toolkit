// Plan vs Actuals — comparing a scenario's planned numbers against
// imported real campaign results, at the same period breakdown the plan
// itself uses. Reuses calc.ts's own buildTable() for the planned side
// (never reimplements the KPI math), and only ever diffs a metric when
// at least one matched actuals row actually reported it — a channel that
// doesn't plan a metric, or actuals that never reported it, simply don't
// produce a comparison row for it, rather than showing a misleading 0.
import { buildTable, generatePeriods } from './calc';
import { channelBudget } from './budgets';
import { MARKET_LABELS } from './constants';
import type { ActualsMetricKey, ActualsRow, AmazonFormat, Channel, Goal, LinkedInFormat, PlanConfig, Scenario } from './types';

export interface MetricComparison {
  key: string;
  label: string;
  planned?: number;
  actual?: number;
  absDiff?: number;
  pctDiff?: number;
}

export interface PeriodComparison {
  period: string; // period label, or 'TOTAL'
  metrics: MetricComparison[];
}

export interface ChannelComparison {
  market: string;
  marketLabel: string;
  goal: Goal;
  channel: Channel;
  liFormat?: LinkedInFormat;
  amazonFormat?: AmazonFormat;
  channelLabel: string;
  matchedRowCount: number;
  periods: PeriodComparison[]; // last entry's period === 'TOTAL'
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function daysInclusive(startIso: string, endIso: string): number {
  const days = Math.round((toDate(endIso).getTime() - toDate(startIso).getTime()) / 86400000) + 1;
  return Math.max(days, 1);
}

/** How much of `value` (reported over [row.startDate, row.endDate]) falls
 *  inside [periodStart, periodEnd], assuming it's spread evenly across the
 *  row's own date range. A row entirely inside the period, or exactly
 *  matching it, returns the full value; a row only partially overlapping
 *  returns a day-weighted share; no overlap returns 0. */
function proratedShare(row: ActualsRow, periodStart: string, periodEnd: string, value: number): number {
  const overlapStart = row.startDate > periodStart ? row.startDate : periodStart;
  const overlapEnd = row.endDate < periodEnd ? row.endDate : periodEnd;
  if (overlapStart > overlapEnd) return 0;
  const rowDays = daysInclusive(row.startDate, row.endDate);
  const overlapDays = daysInclusive(overlapStart, overlapEnd);
  return value * (overlapDays / rowDays);
}

function matchesChannelInstance(
  row: ActualsRow, market: string, channel: Channel, liFormat: LinkedInFormat | undefined, amazonFormat: AmazonFormat | undefined,
): boolean {
  if (row.channel !== channel) return false;
  if (row.market !== market) return false; // unrecognized/mismatched market never silently matches
  if (channel === 'LinkedIn' && row.liFormat && liFormat && row.liFormat !== liFormat) return false;
  if (channel === 'LinkedIn' && row.liFormat && !liFormat) return false;
  if (channel === 'Amazon Ads' && row.amazonFormat && amazonFormat && row.amazonFormat !== amazonFormat) return false;
  if (channel === 'Amazon Ads' && row.amazonFormat && !amazonFormat) return false;
  return true;
}

const METRIC_LABELS: Record<ActualsMetricKey, string> = {
  impressions: 'Impressions', reach: 'Reach', clicks: 'Clicks', views: 'Views', conversions: 'Conversions', sessions: 'Sessions',
  sends: 'Sends', opens: 'Opens', cta_clicks: 'CTA Clicks', form_completions: 'Form Completions',
};

function diff(planned: number | undefined, actual: number | undefined): { absDiff?: number; pctDiff?: number } {
  if (planned === undefined || actual === undefined) return {};
  const absDiff = actual - planned;
  const pctDiff = planned !== 0 ? absDiff / planned : undefined;
  return { absDiff, pctDiff };
}

/** Builds one ChannelComparison per (market, goal, channel instance) in
 *  the scenario that has at least one matching actuals row. Channel
 *  instances with zero matches are left out entirely — nothing to
 *  compare, and showing an all-dash row would just be noise. */
export function compareScenarioToActuals(scenario: Scenario, plan: PlanConfig, actualsRows: ActualsRow[]): ChannelComparison[] {
  const periods = generatePeriods(plan.startDate, plan.endDate, plan.breakdown);
  const results: ChannelComparison[] = [];

  scenario.markets.forEach((market) => {
    market.goals.forEach((goal) => {
      goal.channels.forEach((chCfg) => {
        const matched = actualsRows.filter((r) => matchesChannelInstance(r, market.market, chCfg.channel, chCfg.liFormat, chCfg.amazonFormat));
        if (matched.length === 0) return;

        const budget = channelBudget(scenario, market, goal, chCfg.splitPct);
        const convRate = chCfg.benchmark.conv_rate ?? 0.02;
        const plannedRows = buildTable(
          periods, budget, chCfg.benchmark, goal.goal, chCfg.channel, convRate,
          chCfg.liFormat, chCfg.activeFrom, chCfg.activeTo, chCfg.amazonFormat,
        );

        // Which metrics are even comparable for this channel instance —
        // only ones at least one matched row actually reported.
        const presentMetrics = new Set<ActualsMetricKey>();
        matched.forEach((r) => (Object.keys(r.metrics) as ActualsMetricKey[]).forEach((k) => {
          if (r.metrics[k] !== undefined) presentMetrics.add(k);
        }));

        const periodComparisons: PeriodComparison[] = periods.map((p, i) => {
          const plannedRow = plannedRows[i];
          const actualSpend = matched.reduce((n, r) => n + proratedShare(r, p.start, p.end, r.spend), 0);
          const metrics: MetricComparison[] = [
            { key: 'Budget', label: 'Spend (€)', planned: plannedRow.Budget, actual: actualSpend, ...diff(plannedRow.Budget, actualSpend) },
          ];
          presentMetrics.forEach((mk) => {
            const actualVal = matched.reduce((n, r) => n + proratedShare(r, p.start, p.end, r.metrics[mk] ?? 0), 0);
            const plannedVal = (plannedRow as unknown as Record<string, number | undefined>)[mk];
            metrics.push({ key: mk, label: METRIC_LABELS[mk], planned: plannedVal, actual: actualVal, ...diff(plannedVal, actualVal) });
          });
          // Derived rates, only when their components are both comparable.
          if (presentMetrics.has('clicks') && presentMetrics.has('impressions')) {
            const pImp = plannedRow.impressions; const pClk = plannedRow.clicks;
            const aClk = metrics.find((m) => m.key === 'clicks')!.actual;
            const aImp = metrics.find((m) => m.key === 'impressions')!.actual;
            const pCtr = pImp && pImp > 0 && pClk !== undefined ? pClk / pImp : undefined;
            const aCtr = aImp && aImp > 0 && aClk !== undefined ? aClk / aImp : undefined;
            metrics.push({ key: 'ctr', label: 'CTR', planned: pCtr, actual: aCtr, ...diff(pCtr, aCtr) });
          }
          if (presentMetrics.has('clicks')) {
            const aClk = metrics.find((m) => m.key === 'clicks')!.actual;
            const pCpc = plannedRow.clicks && plannedRow.clicks > 0 ? plannedRow.Budget / plannedRow.clicks : undefined;
            const aCpc = aClk && aClk > 0 ? actualSpend / aClk : undefined;
            metrics.push({ key: 'cpc', label: 'CPC (€)', planned: pCpc, actual: aCpc, ...diff(pCpc, aCpc) });
          }
          return { period: p.label, metrics };
        });

        // TOTAL — summed across periods for additive metrics, re-derived
        // for the rate fields (ctr/cpc), same convention as every other
        // "all periods combined" row in this app.
        const totalMetrics: MetricComparison[] = periodComparisons[0].metrics
          .filter((m) => m.key !== 'ctr' && m.key !== 'cpc')
          .map((m) => {
            const planned = periodComparisons.reduce((n, pc) => n + (pc.metrics.find((x) => x.key === m.key)?.planned ?? 0), 0);
            const actual = periodComparisons.reduce((n, pc) => n + (pc.metrics.find((x) => x.key === m.key)?.actual ?? 0), 0);
            return { key: m.key, label: m.label, planned, actual, ...diff(planned, actual) };
          });
        const totalBudgetRow = totalMetrics.find((m) => m.key === 'Budget')!;
        const totalClicks = totalMetrics.find((m) => m.key === 'clicks');
        const totalImpressions = totalMetrics.find((m) => m.key === 'impressions');
        if (totalClicks && totalImpressions) {
          const pCtr = totalImpressions.planned && totalImpressions.planned > 0 ? (totalClicks.planned ?? 0) / totalImpressions.planned : undefined;
          const aCtr = totalImpressions.actual && totalImpressions.actual > 0 ? (totalClicks.actual ?? 0) / totalImpressions.actual : undefined;
          totalMetrics.push({ key: 'ctr', label: 'CTR', planned: pCtr, actual: aCtr, ...diff(pCtr, aCtr) });
        }
        if (totalClicks) {
          const pCpc = totalClicks.planned && totalClicks.planned > 0 ? totalBudgetRow.planned! / totalClicks.planned : undefined;
          const aCpc = totalClicks.actual && totalClicks.actual > 0 ? totalBudgetRow.actual! / totalClicks.actual : undefined;
          totalMetrics.push({ key: 'cpc', label: 'CPC (€)', planned: pCpc, actual: aCpc, ...diff(pCpc, aCpc) });
        }
        periodComparisons.push({ period: 'TOTAL', metrics: totalMetrics });

        const channelLabel = chCfg.liFormat ? `${chCfg.channel} (${chCfg.liFormat})`
          : chCfg.amazonFormat ? `${chCfg.channel} (${chCfg.amazonFormat})`
          : chCfg.channel;

        results.push({
          market: market.market,
          marketLabel: MARKET_LABELS[market.market] ?? market.market,
          goal: goal.goal,
          channel: chCfg.channel,
          liFormat: chCfg.liFormat,
          amazonFormat: chCfg.amazonFormat,
          channelLabel,
          matchedRowCount: matched.length,
          periods: periodComparisons,
        });
      });
    });
  });

  return results;
}
