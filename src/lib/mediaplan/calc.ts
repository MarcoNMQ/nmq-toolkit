import { ADDITIVE } from './constants';
import { channelBudget } from './budgets';
import type { Benchmark, Breakdown, Channel, Goal, KpiRow, LinkedInFormat, Period, PeriodRow, Scenario } from './types';

function fmtDayMonth(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }).replace(',', '');
}

/** Direct port of generate_periods() in media_plan.py. Dates are local
 *  (no timezone math) — `start`/`end` are 'YYYY-MM-DD' strings. */
export function generatePeriods(start: string, end: string, breakdown: Breakdown): Period[] {
  const periods: Period[] = [];
  const endDate = new Date(`${end}T00:00:00`);
  let cur = new Date(`${start}T00:00:00`);

  if (breakdown === 'Daily') {
    while (cur <= endDate) {
      periods.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', day: '2-digit', year: 'numeric' }).replace(',', ''), days: 1 });
      cur = new Date(cur.getTime() + 86400000);
    }
  } else if (breakdown === 'Weekly') {
    while (cur <= endDate) {
      const pEnd = new Date(Math.min(cur.getTime() + 6 * 86400000, endDate.getTime()));
      const days = Math.round((pEnd.getTime() - cur.getTime()) / 86400000) + 1;
      periods.push({ label: `${fmtDayMonth(cur)} – ${fmtDayMonth(pEnd)}`, days });
      cur = new Date(cur.getTime() + 7 * 86400000);
    }
  } else if (breakdown === 'Bi-Weekly') {
    while (cur <= endDate) {
      const pEnd = new Date(Math.min(cur.getTime() + 13 * 86400000, endDate.getTime()));
      const days = Math.round((pEnd.getTime() - cur.getTime()) / 86400000) + 1;
      periods.push({ label: `${fmtDayMonth(cur)} – ${fmtDayMonth(pEnd)}`, days });
      cur = new Date(cur.getTime() + 14 * 86400000);
    }
  } else if (breakdown === 'Monthly') {
    while (cur <= endDate) {
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth(), lastDay);
      const pEnd = new Date(Math.min(monthEnd.getTime(), endDate.getTime()));
      const days = Math.round((pEnd.getTime() - cur.getTime()) / 86400000) + 1;
      periods.push({ label: cur.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), days });
      cur = cur.getMonth() === 11
        ? new Date(cur.getFullYear() + 1, 0, 1)
        : new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  return periods;
}

/** Direct port of calc_row() in media_plan.py — the core KPI funnel math.
 *  Branches on channel, and (for LinkedIn) on creative format, since each
 *  has a structurally different funnel (Search has sessions, LinkedIn
 *  Sponsored Message has no session step at all, etc). Keep this in sync
 *  with media_plan.py's calc_row if the source ever changes. */
export function calcRow(budget: number, bm: Benchmark, goal: Goal, channel: Channel, convRate: number, liFormat?: LinkedInFormat): KpiRow {
  if (budget <= 0) return { Budget: budget };
  const r: KpiRow = { Budget: budget };

  if (channel === 'Search') {
    const cpc = bm.cpc ?? 2.0;
    const ctr = bm.ctr ?? 0.03;
    const c2s = bm.click_to_session ?? 0.85;
    if (cpc <= 0) return r;
    const clicks = budget / cpc;
    const impressions = ctr > 0 ? clicks / ctr : 0;
    Object.assign(r, { impressions, clicks, cpc, ctr });
    if (goal === 'Traffic' || goal === 'Conversion') {
      r.sessions = clicks * c2s;
      r.click_to_session = c2s;
    }
    if (goal === 'Conversion') {
      const convs = (r.sessions ?? 0) * convRate;
      r.conversions = convs;
      r.cpa = convs > 0 ? budget / convs : 0;
      r.cvr = clicks > 0 ? convs / clicks : 0;
      r.conv_rate = convRate;
      const l2m = bm.lead_to_mql ?? 0.20;
      const m2s = bm.mql_to_sql ?? 0.30;
      const mql = convs * l2m;
      const sql = mql * m2s;
      Object.assign(r, {
        lead_to_mql: l2m, mql, cost_per_mql: mql > 0 ? budget / mql : 0,
        mql_to_sql: m2s, sql, cost_per_sql: sql > 0 ? budget / sql : 0,
      });
    }
  } else if (channel === 'LinkedIn' && (liFormat === 'Sponsored Message / Conversational Ad' || liFormat === 'Conversation Ad')) {
    // Everything stays inside LinkedIn — no sessions metric. cpm field is
    // repurposed as "cost per send", ctr as "CTA click rate out of opens".
    const cps = bm.cpm ?? 0.50;
    const openRate = bm.open_rate ?? 0.30;
    const ctaCtr = bm.ctr ?? 0.10;
    if (cps <= 0) return r;
    const sends = budget / cps;
    const opens = sends * openRate;
    const ctaClicks = opens * ctaCtr;
    Object.assign(r, {
      sends, cost_per_send: cps, opens, cost_per_open: opens > 0 ? budget / opens : 0,
      open_rate: openRate, cta_clicks: ctaClicks, ctr: ctaCtr,
    });
    if (goal === 'Conversion') {
      // Leads come directly from CTA clicks — no session step.
      const c2l = bm.conv_rate ?? 0.05;
      const convs = ctaClicks * c2l;
      r.conversions = convs;
      r.conv_rate = c2l;
      r.cpa = convs > 0 ? budget / convs : 0;
      const l2m = bm.lead_to_mql ?? 0.20;
      const m2s = bm.mql_to_sql ?? 0.30;
      const mql = convs * l2m;
      const sql = mql * m2s;
      Object.assign(r, {
        lead_to_mql: l2m, mql, cost_per_mql: mql > 0 ? budget / mql : 0,
        mql_to_sql: m2s, sql, cost_per_sql: sql > 0 ? budget / sql : 0,
      });
    }
  } else if (channel === 'LinkedIn' && (liFormat === 'Document Ad' || liFormat === 'Lead Gen Form')) {
    const cpm = bm.cpm ?? 10.0;
    const ctr = bm.ctr ?? 0.005;
    const fcr = bm.form_completion_rate ?? 0.10;
    if (cpm <= 0) return r;
    const imp = (budget / cpm) * 1000;
    const clicks = imp * ctr;
    const formCompletions = clicks * fcr;
    Object.assign(r, { impressions: imp, clicks, ctr, form_completions: formCompletions, form_completion_rate: fcr });
    if (goal === 'Conversion') {
      const l2m = bm.lead_to_mql ?? 0.60;
      const m2s = bm.mql_to_sql ?? 0.30;
      const mql = formCompletions * l2m;
      const sql = mql * m2s;
      Object.assign(r, {
        lead_to_mql: l2m, mql, cost_per_mql: mql > 0 ? budget / mql : 0,
        mql_to_sql: m2s, sql, cost_per_sql: sql > 0 ? budget / sql : 0,
      });
    }
  } else {
    // YouTube, Display, and plain LinkedIn (Static/Video/Carousel — same
    // impression-based funnel as YouTube/Display, just no Views/CPV step).
    const cpm = bm.cpm ?? 10.0;
    const ctr = bm.ctr ?? 0.003;
    const freq = bm.frequency ?? 3.0;
    const c2s = bm.click_to_session ?? 0.80;
    if (cpm <= 0) return r;
    const imp = (budget / cpm) * 1000;
    const reach = freq > 0 ? imp / freq : 0;
    const clicks = imp * ctr;
    Object.assign(r, { impressions: imp, reach, clicks, ctr, cpc: clicks > 0 ? budget / clicks : 0 });
    if (goal === 'Awareness' && channel === 'YouTube') {
      const vr = bm.view_rate ?? 0.31;
      const views = imp * vr;
      r.views = views;
      r.cpv = views > 0 ? budget / views : 0;
    }
    if (goal === 'Traffic' || goal === 'Conversion') {
      r.sessions = clicks * c2s;
      r.click_to_session = c2s;
    }
    if (goal === 'Conversion') {
      const convs = (r.sessions ?? 0) * convRate;
      r.conversions = convs;
      r.cpa = convs > 0 ? budget / convs : 0;
      r.cvr = clicks > 0 ? convs / clicks : 0;
      r.conv_rate = convRate;
      const l2m = bm.lead_to_mql ?? 0.20;
      const m2s = bm.mql_to_sql ?? 0.30;
      const mql = convs * l2m;
      const sql = mql * m2s;
      Object.assign(r, {
        lead_to_mql: l2m, mql, cost_per_mql: mql > 0 ? budget / mql : 0,
        mql_to_sql: m2s, sql, cost_per_sql: sql > 0 ? budget / sql : 0,
      });
    }
  }

  // Effective CPM — works for impression-based channels.
  if ((r.impressions ?? 0) > 0) {
    r.eff_cpm = (r.Budget / (r.impressions as number)) * 1000;
  }

  return r;
}

/** Direct port of build_table() — per-period rows plus a TOTAL row. */
export function buildTable(periods: Period[], totalBudget: number, bm: Benchmark, goal: Goal, channel: Channel, convRate: number, liFormat?: LinkedInFormat): PeriodRow[] {
  const totalDays = periods.reduce((n, p) => n + p.days, 0) || 1;
  const rows: PeriodRow[] = periods.map((p) => {
    const bud = (totalBudget * p.days) / totalDays;
    const m = calcRow(bud, bm, goal, channel, convRate, liFormat);
    return { Period: p.label, Days: p.days, ...m };
  });
  const totalRow: PeriodRow = { Period: 'TOTAL', Days: totalDays, ...calcRow(totalBudget, bm, goal, channel, convRate, liFormat) };
  return [...rows, totalRow];
}

/** Direct port of _aggregate_scenario_metrics() — sums each (goal,
 *  channel) combination's TOTAL row across every market in the scenario.
 *  Used for the scenario's own "Grand totals" card and for the Compare
 *  tab's KPI summary table; deliberately does NOT re-derive rate fields
 *  (CTR, conv rate, etc.) from the aggregate — those don't have a single
 *  correct cross-market value, so the original only ever sums ADDITIVE
 *  columns and leaves it at that. */
export function aggregateScenarioMetrics(scenario: Scenario): Record<string, number> {
  const totals: Record<string, number> = {};
  ADDITIVE.forEach((c) => { totals[c] = 0; });

  scenario.markets.forEach((market) => {
    market.goals.forEach((goal) => {
      goal.channels.forEach((ch) => {
        const budget = channelBudget(scenario, market, goal, ch.splitPct);
        const convRate = ch.benchmark.conv_rate ?? 0.02;
        const row = calcRow(budget, ch.benchmark, goal.goal, ch.channel, convRate, ch.liFormat);
        ADDITIVE.forEach((c) => {
          const v = (row as unknown as Record<string, number | undefined>)[c];
          if (typeof v === 'number') totals[c] += v;
        });
      });
    });
  });

  return totals;
}
