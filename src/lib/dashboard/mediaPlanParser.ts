import type { Scenario, PlanConfig, GoalConfig, ChannelConfig, Breakdown, Benchmark, Goal, Channel } from '@/lib/mediaplan/types';
import { channelBudget } from '@/lib/mediaplan/budgets';
import type { ParsedMediaPlan, MediaPlanEntry, PeriodEntry } from './mediaPlanTypes';

// ── Channel / phase normalization ───────────────────────────────────────────

export function normalizeChannel(name: string): string {
  const n = name.toLowerCase().trim();
  if (/youtube|yt\b|demand.?gen|demandgen/.test(n)) return 'youtube';
  if (/pmax|performance.?max/.test(n)) return 'pmax';
  if (/shopping/.test(n)) return 'shopping';
  if (/(?:google\s+)?search|sem\b/.test(n)) return 'search';
  if (/display|gdn|banner/.test(n)) return 'display';
  if (/linkedin/.test(n)) return 'linkedin';
  if (/facebook|meta\b/.test(n)) return 'facebook';
  if (/instagram/.test(n)) return 'instagram';
  if (/tiktok/.test(n)) return 'tiktok';
  return n;
}

export const CHANNEL_LABELS: Record<string, string> = {
  youtube: 'YouTube', search: 'Search', display: 'Display', linkedin: 'LinkedIn',
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
  shopping: 'Shopping', pmax: 'Perf. Max',
};

export function channelLabel(key: string): string {
  return CHANNEL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function normalizePhase(goal: string): string {
  const g = goal.toLowerCase().trim();
  if (/awareness|brand|reach/.test(g)) return 'awareness';
  if (/traffic|consideration|engagement/.test(g)) return 'consideration';
  if (/conversion|purchase|lead|sales/.test(g)) return 'conversion';
  return 'consideration';
}

// ── KPI estimation from benchmarks ─────────────────────────────────────────

function estimateKpis(budget: number, bm: Benchmark, channel: Channel, goal: Goal): { impressions?: number; clicks?: number; views?: number } {
  if (budget <= 0) return {};
  if (channel === 'Search') {
    const cpc = bm.cpc ?? 2.0;
    const ctr = bm.ctr ?? 0.03;
    const clicks = cpc > 0 ? budget / cpc : 0;
    const impressions = ctr > 0 ? clicks / ctr : 0;
    return { impressions, clicks };
  }
  // YouTube / Display / LinkedIn
  const cpm = bm.cpm ?? 10;
  const ctr = bm.ctr ?? 0.005;
  const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
  const clicks = impressions * ctr;
  const views = channel === 'YouTube' && bm.view_rate ? impressions * bm.view_rate : undefined;
  return { impressions, clicks, views };
}

// ── Period generation with dates ────────────────────────────────────────────

function generateDatedPeriods(
  start: string,
  end: string,
  breakdown: Breakdown,
): Array<{ label: string; startDate: string; endDate: string }> {
  const result: { label: string; startDate: string; endDate: string }[] = [];
  const endMs = new Date(end + 'T00:00:00').getTime();
  let cur = new Date(start + 'T00:00:00');

  const stepMs = breakdown === 'Daily' ? 1 : breakdown === 'Weekly' ? 7 : breakdown === 'Bi-Weekly' ? 14 : 0; // 0 = monthly

  while (cur.getTime() <= endMs) {
    let periodEnd: Date;
    if (breakdown === 'Monthly' || stepMs === 0) {
      periodEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0); // last day of month
    } else {
      periodEnd = new Date(Math.min(cur.getTime() + (stepMs - 1) * 86_400_000, endMs));
    }

    result.push({
      label: cur.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }),
      startDate: cur.toISOString().slice(0, 10),
      endDate: periodEnd.toISOString().slice(0, 10),
    });

    if (breakdown === 'Monthly' || stepMs === 0) {
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    } else {
      cur = new Date(cur.getTime() + stepMs * 86_400_000);
    }
  }

  return result;
}

// ── Toolkit JSON parser ──────────────────────────────────────────────────────

export function parseToolkitJson(data: { plan: PlanConfig; scenarios: Scenario[] }): ParsedMediaPlan {
  const { plan, scenarios } = data;
  const scenario = scenarios[0];
  if (!scenario) throw new Error('No scenarios in media plan.');

  const entries: MediaPlanEntry[] = [];
  const periodEntries: PeriodEntry[] = [];

  let datedPeriods: ReturnType<typeof generateDatedPeriods> = [];
  const hasPeriods = !!(plan.startDate && plan.endDate && plan.breakdown);
  if (hasPeriods) {
    datedPeriods = generateDatedPeriods(plan.startDate, plan.endDate, plan.breakdown as Breakdown);
  }

  for (const market of scenario.markets) {
    for (const goal of market.goals) {
      const phase = normalizePhase(goal.goal);
      for (const ch of goal.channels) {
        const budget = channelBudget(scenario, market, goal, ch.splitPct);
        const chKey = normalizeChannel(ch.channel);
        const kpis = estimateKpis(budget, ch.benchmark, ch.channel, goal.goal);

        entries.push({
          channel: chKey,
          channelLabel: channelLabel(chKey),
          phase,
          market: market.market,
          spend: budget,
          ...kpis,
        });

        if (hasPeriods && datedPeriods.length > 0) {
          const perPeriodSpend = budget / datedPeriods.length;
          const perPeriodImpressions = kpis.impressions != null ? kpis.impressions / datedPeriods.length : undefined;
          const perPeriodClicks = kpis.clicks != null ? kpis.clicks / datedPeriods.length : undefined;
          const perPeriodViews = kpis.views != null ? kpis.views / datedPeriods.length : undefined;

          for (const p of datedPeriods) {
            periodEntries.push({
              channel: chKey,
              channelLabel: channelLabel(chKey),
              phase,
              market: market.market,
              spend: perPeriodSpend,
              impressions: perPeriodImpressions,
              clicks: perPeriodClicks,
              views: perPeriodViews,
              periodLabel: p.label,
              periodStart: p.startDate,
              periodEnd: p.endDate,
            });
          }
        }
      }
    }
  }

  const dateRange = plan.startDate && plan.endDate
    ? `${plan.startDate} to ${plan.endDate}`
    : undefined;

  return {
    source: 'toolkit',
    scenarioName: scenario.name,
    dateRange,
    startDate: plan.startDate,
    endDate: plan.endDate,
    breakdown: plan.breakdown,
    entries,
    periodEntries,
    hasPeriods: hasPeriods && datedPeriods.length > 0,
  };
}

// ── Generic CSV/XLSX row parser ─────────────────────────────────────────────

const MP_COL_ALIASES: Record<string, string[]> = {
  channel:     ['channel', 'channel name', 'media channel', 'platform', 'ad channel', 'media type', 'network'],
  phase:       ['phase', 'goal', 'objective', 'funnel stage', 'funnel_stage', 'stage', 'marketing objective', 'campaign objective'],
  market:      ['market', 'country', 'geo', 'region', 'market code', 'country code'],
  spend:       ['budget', 'planned budget', 'planned spend', 'total budget', 'investment', 'media budget', 'planned cost', 'allocated budget'],
  impressions: ['impressions', 'planned impressions', 'expected impressions', 'impr', 'reach'],
  clicks:      ['clicks', 'planned clicks', 'expected clicks'],
  views:       ['views', 'video views', 'planned views', 'expected views', 'video plays'],
  date:        ['date', 'period', 'week', 'week start', 'start date', 'period start', 'period label', 'time period', 'flight'],
};

function detectMpColumn(columns: string[], field: string): string | null {
  const aliases = MP_COL_ALIASES[field] ?? [];
  const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const col of columns) {
    if (aliases.includes(norm(col))) return col;
  }
  // Partial match fallback
  for (const col of columns) {
    const n = norm(col);
    for (const alias of aliases) {
      if (n.includes(alias) || alias.includes(n)) return col;
    }
  }
  return null;
}

export function parseCsvRows(
  columns: string[],
  rows: Record<string, string>[],
): ParsedMediaPlan {
  const colMap: Record<string, string | null> = {};
  for (const field of Object.keys(MP_COL_ALIASES)) {
    colMap[field] = detectMpColumn(columns, field);
  }

  const entries: MediaPlanEntry[] = [];
  const periodEntries: PeriodEntry[] = [];

  for (const row of rows) {
    const chRaw = colMap.channel ? row[colMap.channel] ?? '' : '';
    const phRaw = colMap.phase ? row[colMap.phase] ?? '' : '';
    const mktRaw = colMap.market ? row[colMap.market] ?? '' : 'All';
    const spendRaw = colMap.spend ? row[colMap.spend] ?? '0' : '0';
    const dateRaw = colMap.date ? row[colMap.date] ?? '' : '';

    if (!chRaw) continue;

    const spend = parseFloat(String(spendRaw).replace(/[€$£,\s]/g, '')) || 0;
    const impressions = colMap.impressions ? (parseFloat(row[colMap.impressions]?.replace(/,/g, '') ?? '') || undefined) : undefined;
    const clicks = colMap.clicks ? (parseFloat(row[colMap.clicks]?.replace(/,/g, '') ?? '') || undefined) : undefined;
    const views = colMap.views ? (parseFloat(row[colMap.views]?.replace(/,/g, '') ?? '') || undefined) : undefined;
    const chKey = normalizeChannel(chRaw);

    const entry: MediaPlanEntry = {
      channel: chKey,
      channelLabel: channelLabel(chKey),
      phase: normalizePhase(phRaw),
      market: mktRaw || 'All',
      spend,
      impressions,
      clicks,
      views,
    };

    entries.push(entry);

    if (dateRaw) {
      periodEntries.push({
        ...entry,
        periodLabel: dateRaw,
        periodStart: dateRaw,
        periodEnd: dateRaw,
      });
    }
  }

  return {
    source: 'external',
    scenarioName: 'Uploaded plan',
    entries,
    periodEntries,
    hasPeriods: periodEntries.length > 0,
  };
}

// ── Main entry: parse from File ──────────────────────────────────────────────

export async function parseMediaPlanFile(file: File): Promise<ParsedMediaPlan> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.json')) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.plan && Array.isArray(data.scenarios)) {
      return parseToolkitJson(data);
    }
    // Could be a row-array JSON — fall through to generic
    if (Array.isArray(data) && data.length > 0) {
      const columns = Object.keys(data[0]);
      return parseCsvRows(columns, data as Record<string, string>[]);
    }
    throw new Error('JSON format not recognised. Please export as a Toolkit JSON or use CSV/XLSX.');
  }

  if (name.endsWith('.csv')) {
    const text = await file.text();
    // Dynamic import for client-side use
    const Papa = (await import('papaparse')).default;
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    return parseCsvRows(result.meta.fields ?? [], result.data);
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/dashboard/ingest', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Failed to parse XLSX file.');
    const { columns, rows } = await res.json();
    return parseCsvRows(columns, rows);
  }

  throw new Error('Unsupported file type. Use JSON, CSV, or XLSX.');
}
