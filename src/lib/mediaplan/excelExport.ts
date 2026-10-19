import ExcelJS from 'exceljs';
import { generatePeriods } from './calc';
import { marketBudget, channelBudget } from './budgets';
import { ADDITIVE, ALL_CHANNELS, MARKET_LABELS, benchFieldsFor, channelKeyFor, colLabel, phaseColsFor } from './constants';
import type { BenchmarkField, Channel, ChannelConfig, ChannelKey, Goal, GoalConfig, LinkedInFormat, MarketConfig, PlanConfig, Period, Scenario } from './types';

// Mirrors calc.ts's isPeriodActive() — a period counts as active for a
// channel with a timing window (chCfg.activeFrom/activeTo) when it overlaps
// that window at all. No window means active for every period, preserving
// the original whole-flight spread for every channel that doesn't set one.
function isPeriodActive(p: Period, activeFrom?: string, activeTo?: string): boolean {
  if (!activeFrom || !activeTo) return true;
  return p.start <= activeTo && p.end >= activeFrom;
}

// Direct port of _build_excel_all() in media_plan.py, restructured into one
// tab per channel plus a live "Overview" tab (the Python source and the
// original TS port both used a single tab per scenario) — countries still
// stack vertically inside each channel's own tab, with a totals section at
// the bottom that SUMs each country's TOTAL row via real Excel formulas (not
// pre-computed values), so the exported file stays a live, editable model —
// changing a yellow assumption cell recalculates everything downstream of
// it, including the Overview tab's cross-sheet references.

const PCT_KEYS = new Set(['ctr', 'view_rate', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql', 'cvr', 'open_rate', 'form_completion_rate', 'new_to_brand_pct']);
const EUR_KEYS = new Set(['Budget', 'cpc', 'cpa', 'cpv', 'eff_cpm', 'cost_per_mql', 'cost_per_sql', 'cost_per_send', 'cost_per_open', 'revenue']);
const ADDITIVE_SET = new Set(ADDITIVE);

const RATE_FROM: Record<string, [string, string]> = {
  ctr: ['clicks', 'impressions'],
  click_to_session: ['sessions', 'clicks'],
  conv_rate: ['conversions', 'sessions'],
  lead_to_mql: ['mql', 'conversions'],
  mql_to_sql: ['sql', 'mql'],
};
// Amazon's blended conv_rate/ROAS/New-to-Brand % at the "all markets
// combined" level must be recomputed from the summed additive columns
// (conversions/clicks, revenue/Budget, new_to_brand_orders/conversions) — a
// single flat benchmark cell can't represent multiple markets' different
// assumptions. Base RATE_FROM's ctr entry already works unchanged since
// ctr = clicks/impressions regardless of channel.
const RATE_FROM_AMAZON: Record<string, [string, string]> = {
  conv_rate: ['conversions', 'clicks'],
  roas: ['revenue', 'Budget'],
  new_to_brand_pct: ['new_to_brand_orders', 'conversions'],
};
const RATE_FROM_SM: Record<string, [string, string]> = {
  open_rate: ['opens', 'sends'],
  ctr: ['cta_clicks', 'opens'],
  conv_rate: ['conversions', 'cta_clicks'],
  lead_to_mql: ['mql', 'conversions'],
  mql_to_sql: ['sql', 'mql'],
};
// LinkedIn Video's CPV/VTR are flat per-market assumption inputs, same as
// every other benchmark — but at the "all markets combined" level there's
// no single assumption cell that represents every market's own CPV/VTR, so
// (same reasoning as Amazon's blended rates above) they must be re-derived
// from the already-summed additive columns: blended CPV = Budget/Views,
// blended VTR = Views/Impressions. ctr/click_to_session/conv_rate/
// lead_to_mql/mql_to_sql reuse the base RATE_FROM map unchanged since
// Video's funnel from clicks onward is the same shape as every other
// impression-based channel.
const RATE_FROM_LI_VIDEO: Record<string, [string, string]> = {
  cpv: ['Budget', 'views'],
  view_rate: ['views', 'impressions'],
};
const RATE_FROM_LGF: Record<string, [string, string]> = {
  ctr: ['clicks', 'impressions'],
  form_completion_rate: ['form_completions', 'clicks'],
  lead_to_mql: ['mql', 'form_completions'],
  mql_to_sql: ['sql', 'mql'],
};

function numFmt(key: string): string {
  if (key === 'roas') return '0.00"x"';
  if (PCT_KEYS.has(key)) return '0.00%';
  if (EUR_KEYS.has(key)) return '#,##0.00';
  return '#,##0';
}

const BM_LABELS: Record<string, string> = {
  cpm: 'CPM / Cost per Send (€)', cpc: 'CPC (€)', cpv: 'CPV (€)', view_rate: 'View Rate',
  ctr: 'CTR / CTA Click Rate', frequency: 'Frequency',
  click_to_session: 'Click→Session', open_rate: 'Open Rate',
  form_completion_rate: 'Form Completion Rate',
  conv_rate: 'Session→Lead % / CTA→Lead % / Click→Order %',
  lead_to_mql: 'Lead→MQL %', mql_to_sql: 'MQL→SQL %',
  roas: 'ROAS (x)', units_per_order: 'Units per Order',
  dpv_rate: 'Click→DPV %', atc_rate: 'DPV→Add-to-Cart %', new_to_brand_pct: 'New-to-Brand %',
};
const BM_NUM_FMT: Record<string, string> = {
  cpm: '#,##0.0000', cpc: '#,##0.00', cpv: '#,##0.0000', view_rate: '0.00%',
  ctr: '0.00%', frequency: '0.0', click_to_session: '0%',
  open_rate: '0.0%', form_completion_rate: '0.0%',
  conv_rate: '0.00%', lead_to_mql: '0%', mql_to_sql: '0%',
  roas: '0.00"x"', units_per_order: '0.00',
  dpv_rate: '0.0%', atc_rate: '0.0%', new_to_brand_pct: '0.0%',
};

function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function formula(key: string, colMap: Record<string, string>, bmMap: Record<string, string>, ch: Channel, liFmt?: LinkedInFormat): string | null {
  const ref = (k: string) => `${colMap[k] ?? 'A'}${bmMap.__row ?? ''}`;
  const bm = (k: string) => bmMap[k] ?? '0';
  const ie = (f: string) => `IFERROR(${f},"")`;

  if (key === 'Budget') return null;

  if (ch === 'LinkedIn' && (liFmt === 'Sponsored Message / Conversational Ad' || liFmt === 'Conversation Ad')) {
    if (key === 'sends') return ie(`${ref('Budget')}/${bm('cpm')}`);
    if (key === 'cost_per_send') return ie(`${ref('Budget')}/${ref('sends')}`);
    if (key === 'opens') return ie(`${ref('sends')}*${bm('open_rate')}`);
    if (key === 'cost_per_open') return ie(`${ref('Budget')}/${ref('opens')}`);
    if (key === 'open_rate') return `${bm('open_rate')}`;
    if (key === 'cta_clicks') return ie(`${ref('opens')}*${bm('ctr')}`);
    if (key === 'ctr') return ie(`${ref('cta_clicks')}/${ref('opens')}`);
    if (key === 'conv_rate') return `${bm('conv_rate')}`;
    if (key === 'conversions') return ie(`${ref('cta_clicks')}*${bm('conv_rate')}`);
    if (key === 'cpa') return ie(`${ref('Budget')}/${ref('conversions')}`);
    if (key === 'lead_to_mql') return `${bm('lead_to_mql')}`;
    if (key === 'mql') return ie(`${ref('conversions')}*${bm('lead_to_mql')}`);
    if (key === 'cost_per_mql') return ie(`${ref('Budget')}/${ref('mql')}`);
    if (key === 'mql_to_sql') return `${bm('mql_to_sql')}`;
    if (key === 'sql') return ie(`${ref('mql')}*${bm('mql_to_sql')}`);
    if (key === 'cost_per_sql') return ie(`${ref('Budget')}/${ref('sql')}`);
    return null;
  }

  if (ch === 'Amazon Ads') {
    if (key === 'clicks') return ie(`${ref('Budget')}/${bm('cpc')}`);
    if (key === 'impressions') return ie(`${ref('clicks')}/${bm('ctr')}`);
    if (key === 'ctr') return ie(`${ref('clicks')}/${ref('impressions')}`);
    if (key === 'cpc') return ie(`${ref('Budget')}/${ref('clicks')}`);
    if (key === 'conv_rate') return `${bm('conv_rate')}`;
    if (key === 'conversions') return ie(`${ref('clicks')}*${bm('conv_rate')}`);
    if (key === 'cpa') return ie(`${ref('Budget')}/${ref('conversions')}`);
    if (key === 'roas') return `${bm('roas')}`;
    if (key === 'revenue') return ie(`${ref('Budget')}*${bm('roas')}`);
    if (key === 'units') return ie(`${ref('conversions')}*${bm('units_per_order')}`);
    // Sponsored Brands/Display only — never requested for Sponsored
    // Products since phaseColsFor()/benchFieldsFor() never include these
    // keys for that format.
    if (key === 'detail_page_views') return ie(`${ref('clicks')}*${bm('dpv_rate')}`);
    if (key === 'add_to_cart') return ie(`${ref('detail_page_views')}*${bm('atc_rate')}`);
    if (key === 'new_to_brand_pct') return `${bm('new_to_brand_pct')}`;
    if (key === 'new_to_brand_orders') return ie(`${ref('conversions')}*${bm('new_to_brand_pct')}`);
    return null;
  }

  if (ch === 'LinkedIn' && (liFmt === 'Lead Gen Form' || liFmt === 'Document Ad')) {
    if (key === 'impressions') return ie(`${ref('Budget')}/${bm('cpm')}*1000`);
    if (key === 'eff_cpm') return ie(`${ref('Budget')}/${ref('impressions')}*1000`);
    if (key === 'clicks') return ie(`${ref('impressions')}*${bm('ctr')}`);
    if (key === 'ctr') return ie(`${ref('clicks')}/${ref('impressions')}`);
    if (key === 'form_completions') return ie(`${ref('clicks')}*${bm('form_completion_rate')}`);
    if (key === 'form_completion_rate') return `${bm('form_completion_rate')}`;
    if (key === 'lead_to_mql') return `${bm('lead_to_mql')}`;
    if (key === 'mql') return ie(`${ref('form_completions')}*${bm('lead_to_mql')}`);
    if (key === 'cost_per_mql') return ie(`${ref('Budget')}/${ref('mql')}`);
    if (key === 'mql_to_sql') return `${bm('mql_to_sql')}`;
    if (key === 'sql') return ie(`${ref('mql')}*${bm('mql_to_sql')}`);
    if (key === 'cost_per_sql') return ie(`${ref('Budget')}/${ref('sql')}`);
    return null;
  }

  if (ch === 'LinkedIn' && liFmt === 'Video') {
    // CPV-first, the reverse causal order from every other impression-
    // based channel below: views come straight from Budget/CPV, and
    // impressions/CPM are DERIVED from views, not the other way round.
    if (key === 'views') return ie(`${ref('Budget')}/${bm('cpv')}`);
    if (key === 'cpv') return `${bm('cpv')}`;
    if (key === 'impressions') return ie(`${ref('views')}/${bm('view_rate')}`);
    if (key === 'view_rate') return `${bm('view_rate')}`;
    if (key === 'eff_cpm') return ie(`${ref('Budget')}/${ref('impressions')}*1000`);
    if (key === 'reach') return ie(`${ref('impressions')}/${bm('frequency')}`);
    if (key === 'clicks') return ie(`${ref('impressions')}*${bm('ctr')}`);
    if (key === 'ctr') return ie(`${ref('clicks')}/${ref('impressions')}`);
    if (key === 'cpc') return ie(`${ref('Budget')}/${ref('clicks')}`);
    if (key === 'click_to_session') return `${bm('click_to_session')}`;
    if (key === 'sessions') return ie(`${ref('clicks')}*${bm('click_to_session')}`);
    if (key === 'conv_rate') return `${bm('conv_rate')}`;
    if (key === 'conversions') return ie(`${ref('sessions')}*${bm('conv_rate')}`);
    if (key === 'cpa') return ie(`${ref('Budget')}/${ref('conversions')}`);
    if (key === 'lead_to_mql') return `${bm('lead_to_mql')}`;
    if (key === 'mql') return ie(`${ref('conversions')}*${bm('lead_to_mql')}`);
    if (key === 'cost_per_mql') return ie(`${ref('Budget')}/${ref('mql')}`);
    if (key === 'mql_to_sql') return `${bm('mql_to_sql')}`;
    if (key === 'sql') return ie(`${ref('mql')}*${bm('mql_to_sql')}`);
    if (key === 'cost_per_sql') return ie(`${ref('Budget')}/${ref('sql')}`);
    return null;
  }

  if (key === 'impressions') return ch === 'Search' ? ie(`${ref('clicks')}/${bm('ctr')}`) : ie(`${ref('Budget')}/${bm('cpm')}*1000`);
  if (key === 'reach') return ie(`${ref('impressions')}/${bm('frequency')}`);
  if (key === 'views') return ie(`${ref('impressions')}*${bm('view_rate')}`);
  if (key === 'clicks') return ch === 'Search' ? ie(`${ref('Budget')}/${bm('cpc')}`) : ie(`${ref('impressions')}*${bm('ctr')}`);
  if (key === 'ctr') return ie(`${ref('clicks')}/${ref('impressions')}`);
  if (key === 'cpc') return ie(`${ref('Budget')}/${ref('clicks')}`);
  if (key === 'cpv') return ie(`${ref('Budget')}/${ref('views')}`);
  if (key === 'eff_cpm') return ie(`${ref('Budget')}/${ref('impressions')}*1000`);
  if (key === 'click_to_session') return `${bm('click_to_session')}`;
  if (key === 'sessions') return ie(`${ref('clicks')}*${bm('click_to_session')}`);
  if (key === 'conv_rate') return `${bm('conv_rate')}`;
  if (key === 'conversions') return ie(`${ref('sessions')}*${bm('conv_rate')}`);
  if (key === 'cpa') return ie(`${ref('Budget')}/${ref('conversions')}`);
  if (key === 'lead_to_mql') return `${bm('lead_to_mql')}`;
  if (key === 'mql') return ie(`${ref('conversions')}*${bm('lead_to_mql')}`);
  if (key === 'cost_per_mql') return ie(`${ref('Budget')}/${ref('mql')}`);
  if (key === 'mql_to_sql') return `${bm('mql_to_sql')}`;
  if (key === 'sql') return ie(`${ref('mql')}*${bm('mql_to_sql')}`);
  if (key === 'cost_per_sql') return ie(`${ref('Budget')}/${ref('sql')}`);
  return null;
}

function totalFormula(key: string, colMap: Record<string, string>, bmMap: Record<string, string>, firstR: number, lastR: number, ch: Channel, liFmt?: LinkedInFormat): string | null {
  if (ADDITIVE_SET.has(key)) {
    const L = colMap[key] ?? 'A';
    return `SUM(${L}${firstR}:${L}${lastR})`;
  }
  const rateKeysSm = ['open_rate', 'conv_rate', 'lead_to_mql', 'mql_to_sql'];
  const rateKeysLgf = ['form_completion_rate', 'lead_to_mql', 'mql_to_sql'];
  const rateKeysStd = ['click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql'];
  const rateKeysAmazon = ['conv_rate', 'roas', 'new_to_brand_pct'];
  if (ch === 'LinkedIn' && (liFmt === 'Sponsored Message / Conversational Ad' || liFmt === 'Conversation Ad')) {
    if (rateKeysSm.includes(key)) return `${bmMap[key] ?? '0'}`;
  } else if (ch === 'LinkedIn' && (liFmt === 'Document Ad' || liFmt === 'Lead Gen Form')) {
    if (rateKeysLgf.includes(key)) return `${bmMap[key] ?? '0'}`;
  } else if (ch === 'Amazon Ads') {
    if (rateKeysAmazon.includes(key)) return `${bmMap[key] ?? '0'}`;
  } else if (rateKeysStd.includes(key)) {
    return `${bmMap[key] ?? '0'}`;
  }
  return formula(key, colMap, bmMap, ch, liFmt);
}

const WHITE = { argb: 'FFFFFFFF' };
function fill(hex: string) { return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${hex}` } }; }
const C_TITLE = fill('1F3864');
const C_MKT = fill('2BB5A5');
const C_GOAL = fill('1F3864');
const C_CH = fill('2E75B6');
const C_ASSM_H = fill('E2EFDA');
const C_ASSM_V = fill('FFFDE7');
const C_HDR = fill('4472C4');
const C_TOTAL = fill('CFE1F3');
const C_STOT = fill('D6E4F0');
const C_ODD = fill('FFFFFF');
const C_EVEN = fill('EEF3FB');
const AC = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };
const AL = { horizontal: 'left' as const, vertical: 'middle' as const };

function mergeRow(
  ws: ExcelJS.Worksheet, nColsTotal: number, row: number,
  fillStyle: ReturnType<typeof fill>, font: Partial<ExcelJS.Font>, text: string,
  height = 18, align: typeof AC | typeof AL = AL,
) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.fill = fillStyle;
  cell.font = font;
  cell.alignment = align;
  ws.mergeCells(row, 1, row, nColsTotal);
  ws.getRow(row).height = height;
}

// One (goal, channel, liFormat) combination's TOTAL rows across every market
// in a channel's tab — tracked so the totals section at the bottom of that
// tab can SUM them, and so the Overview tab can point a live cross-sheet
// formula at the final "ALL COUNTRIES" row this produces.
type Tracked = { rows: number[]; colKeys: string[]; colMap: Record<string, string>; liFmt?: LinkedInFormat };

// Renders one market's one channel instance: assumptions block, period table,
// TOTAL row. Returns the next free row. Registers its TOTAL row in
// totalTracker, keyed by (goal, channel, liFormat), for the tab's own totals
// section further down.
function renderChannelBlock(
  ws: ExcelJS.Worksheet, startRow: number,
  scenario: Scenario, market: MarketConfig, goal: GoalConfig, goalName: Goal, chCfg: ChannelConfig,
  periods: Period[], totalTracker: Map<string, Tracked>,
): number {
  let row = startRow;
  const chBud = channelBudget(scenario, market, goal, chCfg.splitPct);
  const liFmt = chCfg.channel === 'LinkedIn' ? chCfg.liFormat : undefined;
  const key: ChannelKey = channelKeyFor(chCfg.channel, liFmt);
  const colKeys = phaseColsFor(key, goalName, chCfg.amazonFormat);
  const nChCols = colKeys.length + 1;
  const colMap: Record<string, string> = {};
  colKeys.forEach((k, i) => { colMap[k] = colLetter(2 + i); });
  const activeDays = periods
    .filter((p) => isPeriodActive(p, chCfg.activeFrom, chCfg.activeTo))
    .reduce((n, p) => n + p.days, 0) || 1;
  const dailyBud = chBud / activeDays;

  const chLabel = liFmt ? `${chCfg.channel} (${liFmt})`
    : chCfg.channel === 'Amazon Ads' && chCfg.amazonFormat ? `${chCfg.channel} (${chCfg.amazonFormat})`
    : chCfg.channel;
  let c = ws.getCell(row, 1);
  c.value = `${chLabel}     Daily Budget: €${dailyBud.toFixed(2)} / day`;
  c.fill = C_CH; c.font = { color: WHITE, bold: true }; c.alignment = AC;
  ws.mergeCells(row, 1, row, nChCols);
  ws.getRow(row).height = 18;
  row += 1;

  const bmParams = benchFieldsFor(key, goalName, chCfg.amazonFormat);
  c = ws.getCell(row, 1);
  c.value = 'ASSUMPTIONS  —  edit the yellow cells to recalculate the whole table';
  c.fill = C_ASSM_H; c.font = { italic: true, size: 9, color: { argb: 'FF375623' } }; c.alignment = AL;
  ws.mergeCells(row, 1, row, nChCols);
  ws.getRow(row).height = 14;
  row += 1;

  const bmColMap: Record<string, string> = {};
  bmParams.forEach((p, i) => { bmColMap[p] = colLetter(2 + i); });
  bmParams.forEach((p, i) => {
    const cc = ws.getCell(row, 2 + i);
    cc.value = BM_LABELS[p] ?? p;
    cc.fill = C_ASSM_H; cc.font = { bold: true, size: 9, color: { argb: 'FF375623' } }; cc.alignment = AC;
  });
  ws.getRow(row).height = 14;
  row += 1;

  const bmValRow = row;
  const bmMap: Record<string, string> = { __row: String(bmValRow) };
  bmParams.forEach((p) => { bmMap[p] = `$${bmColMap[p]}$${bmValRow}`; });
  bmParams.forEach((p, i) => {
    const raw = chCfg.benchmark[p as BenchmarkField] ?? 0;
    const cc = ws.getCell(row, 2 + i);
    cc.value = raw;
    cc.fill = C_ASSM_V; cc.font = { bold: true, size: 10 }; cc.alignment = AC;
    cc.numFmt = BM_NUM_FMT[p] ?? 'General';
  });
  ws.getRow(row).height = 18;
  row += 2;

  c = ws.getCell(row, 1);
  c.value = 'PERIOD';
  c.fill = C_HDR; c.font = { color: WHITE, bold: true }; c.alignment = AC;
  colKeys.forEach((k, i) => {
    const cc = ws.getCell(row, 2 + i);
    cc.value = colLabel(k, chCfg.channel);
    cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
  });
  ws.getRow(row).height = 28;
  row += 1;

  const firstDataRow = row;
  periods.forEach((p, rIdx) => {
    const active = isPeriodActive(p, chCfg.activeFrom, chCfg.activeTo);
    const bud = active ? (chBud * p.days) / activeDays : 0;
    const rowFill = rIdx % 2 === 0 ? C_ODD : C_EVEN;
    const cc0 = ws.getCell(row, 1);
    cc0.value = String(p.label);
    cc0.fill = rowFill; cc0.font = { bold: true }; cc0.alignment = AC;
    colKeys.forEach((k, i) => {
      const cc = ws.getCell(row, 2 + i);
      if (k === 'Budget') {
        cc.value = bud;
      } else {
        const rowBmMap = { ...bmMap, __row: String(row) };
        const f = formula(k, colMap, rowBmMap, chCfg.channel, liFmt);
        cc.value = f !== null ? { formula: f } : 0;
      }
      cc.fill = rowFill; cc.font = {}; cc.alignment = AC;
      cc.numFmt = numFmt(k);
    });
    row += 1;
  });
  const lastDataRow = row - 1;

  const totalRowNum = row;
  const cc0 = ws.getCell(row, 1);
  cc0.value = 'TOTAL';
  cc0.fill = C_TOTAL; cc0.font = { bold: true }; cc0.alignment = AC;
  colKeys.forEach((k, i) => {
    const cc = ws.getCell(row, 2 + i);
    const rowBmMap = { ...bmMap, __row: String(row) };
    const f = totalFormula(k, colMap, rowBmMap, firstDataRow, lastDataRow, chCfg.channel, liFmt);
    cc.value = f !== null ? { formula: f } : 0;
    cc.fill = C_TOTAL; cc.font = { bold: true }; cc.alignment = AC;
    cc.numFmt = numFmt(k);
  });
  ws.getRow(row).height = 15;
  row += 2;

  const trackKey = `${goalName}|${chCfg.channel}|${liFmt ?? ''}`;
  if (!totalTracker.has(trackKey)) totalTracker.set(trackKey, { rows: [], colKeys, colMap, liFmt });
  totalTracker.get(trackKey)!.rows.push(totalRowNum);

  return row;
}

// Renders one (goal, channel, liFormat) group's "All Countries Combined"
// totals block — period-by-period sums across every market plus a final
// ALL COUNTRIES row. Returns the next free row and the ALL COUNTRIES row
// number, since the Overview tab needs that row to build its own
// cross-sheet references.
function renderChannelTotalsGroup(
  ws: ExcelJS.Worksheet, startRow: number, periods: Period[],
  chName: Channel, liFmt: LinkedInFormat | undefined, tr: Tracked,
): { nextRow: number; totalsRowNum: number; periodRowNums: number[] } {
  let row = startRow;
  const { colKeys, colMap, rows: trows } = tr;
  const nChCols = colKeys.length + 1;

  let rateFrom = RATE_FROM;
  if (chName === 'LinkedIn' && (liFmt === 'Sponsored Message / Conversational Ad' || liFmt === 'Conversation Ad')) rateFrom = RATE_FROM_SM;
  else if (chName === 'LinkedIn' && (liFmt === 'Document Ad' || liFmt === 'Lead Gen Form')) rateFrom = RATE_FROM_LGF;
  else if (chName === 'LinkedIn' && liFmt === 'Video') rateFrom = { ...RATE_FROM, ...RATE_FROM_LI_VIDEO };
  else if (chName === 'Amazon Ads') rateFrom = { ...RATE_FROM, ...RATE_FROM_AMAZON };

  const chLabel = liFmt ? `${chName} (${liFmt})` : chName;
  let c = ws.getCell(row, 1);
  c.value = `${chLabel}  —  All Countries Combined`;
  c.fill = C_CH; c.font = { color: WHITE, bold: true }; c.alignment = AC;
  ws.mergeCells(row, 1, row, nChCols);
  ws.getRow(row).height = 18;
  row += 1;

  c = ws.getCell(row, 1);
  c.value = '';
  c.fill = C_HDR; c.alignment = AC;
  colKeys.forEach((k, i) => {
    const cc = ws.getCell(row, 2 + i);
    cc.value = colLabel(k, chName);
    cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
  });
  ws.getRow(row).height = 28;
  row += 1;

  // Period-by-period breakdown, same periods/labels as the per-market tables above —
  // each row here sums that period's value for this channel across every market.
  // A market's Nth period row sits at (its TOTAL row − periods.length + N), since the
  // per-market block always lays out periods contiguously right before its TOTAL row.
  const periodRowsList: number[] = [];
  periods.forEach((p, i) => {
    const periodRow = row;
    const rowFill = i % 2 === 0 ? C_ODD : C_EVEN;
    const cc0 = ws.getCell(row, 1);
    cc0.value = String(p.label);
    cc0.fill = rowFill; cc0.font = { bold: true }; cc0.alignment = AC;
    colKeys.forEach((k, ci) => {
      const colLetterForKey = colMap[k] ?? 'B';
      let f = '';
      if (ADDITIVE_SET.has(k)) {
        const refs = trows.map((tr2) => `${colLetterForKey}${tr2 - periods.length + i}`).join(', ');
        f = `IFERROR(SUM(${refs}),"")`;
      } else if (k in rateFrom) {
        const [nk, dk] = rateFrom[k];
        if (colMap[nk] && colMap[dk]) f = `IFERROR(${colMap[nk]}${periodRow}/${colMap[dk]}${periodRow},"")`;
      } else {
        const ff = formula(k, colMap, { __row: String(periodRow) }, chName, liFmt);
        f = ff ?? '';
      }
      const cc = ws.getCell(row, 2 + ci);
      cc.value = f ? { formula: f } : '';
      cc.fill = rowFill; cc.font = {}; cc.alignment = AC;
      cc.numFmt = numFmt(k);
    });
    ws.getRow(row).height = 15;
    row += 1;
    periodRowsList.push(periodRow);
  });

  const totalsRowNum = row;
  const cc0 = ws.getCell(row, 1);
  cc0.value = 'ALL COUNTRIES';
  cc0.fill = C_STOT; cc0.font = { bold: true }; cc0.alignment = AC;
  colKeys.forEach((k, i) => {
    const colLetterForKey = colMap[k] ?? 'B';
    let f = '';
    if (ADDITIVE_SET.has(k)) {
      const refs = periodRowsList.map((r) => `${colLetterForKey}${r}`).join(', ');
      f = `IFERROR(SUM(${refs}),"")`;
    } else if (k in rateFrom) {
      const [nk, dk] = rateFrom[k];
      if (colMap[nk] && colMap[dk]) f = `IFERROR(${colMap[nk]}${row}/${colMap[dk]}${row},"")`;
    } else {
      const ff = formula(k, colMap, { __row: String(row) }, chName, liFmt);
      f = ff ?? '';
    }
    const cc = ws.getCell(row, 2 + i);
    cc.value = f ? { formula: f } : '';
    cc.fill = C_STOT; cc.font = { bold: true }; cc.alignment = AC;
    cc.numFmt = numFmt(k);
  });
  ws.getRow(row).height = 18;
  row += 2;

  return { nextRow: row, totalsRowNum, periodRowNums: periodRowsList };
}

// One channel/format/goal group the Overview tab will render — a live
// pointer at a channel tab's own per-period rows and its final "ALL
// COUNTRIES" row, not a pre-computed value.
type OverviewGroup = {
  channelName: Channel;
  liFmt: LinkedInFormat | undefined;
  goalName: Goal;
  sheetName: string;
  colMap: Record<string, string>;
  colKeys: string[];
  totalsRow: number;
  periodRowNums: number[];
};

function renderOverviewTab(
  ws: ExcelJS.Worksheet, scenario: Scenario, plan: PlanConfig, flight: string,
  totalBudgetAll: number, groups: OverviewGroup[], periods: Period[],
) {
  const extraMetricsPerGroup = groups.map((g) => g.colKeys.filter((k) => k !== 'Budget' && ADDITIVE_SET.has(k)));
  const maxExtras = Math.max(0, ...extraMetricsPerGroup.map((m) => m.length));
  const nColsTotal = Math.max(3 + maxExtras, 6);

  let row = 1;
  mergeRow(ws, nColsTotal, row, C_TITLE, { color: WHITE, bold: true, size: 13 }, `OVERVIEW  —  ${scenario.name}  —  ${plan.campaignName}`, 22);
  row += 1;
  mergeRow(ws, nColsTotal, row, C_TITLE, { color: WHITE, size: 10 }, `Total Budget: €${totalBudgetAll.toLocaleString(undefined, { maximumFractionDigits: 0 })}  |  ${flight}  |  ${plan.breakdown}`, 15);
  row += 2;

  if (groups.length === 0) {
    const cc = ws.getCell(row, 1);
    cc.value = 'No channels configured yet.';
    cc.font = { italic: true };
    ws.getColumn(1).width = 40;
    return;
  }

  // ── Grand Total Budget by Period — the overall spend phasing across every
  // channel combined, at the same granularity (bi-weekly/monthly/...) as
  // every channel's own tab, not just one flat end-of-flight number. ──────
  mergeRow(ws, nColsTotal, row, C_GOAL, { color: WHITE, bold: true }, 'GRAND TOTAL BUDGET BY PERIOD', 18, AC);
  row += 1;
  ['Period', 'Budget (€)', '% of Total'].forEach((text, i) => {
    const cc = ws.getCell(row, 1 + i);
    cc.value = text;
    cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
  });
  ws.getRow(row).height = 22;
  row += 1;

  const grandPeriodRows: number[] = [];
  periods.forEach((p, i) => {
    const rowFill = i % 2 === 0 ? C_ODD : C_EVEN;
    const cLabel = ws.getCell(row, 1);
    cLabel.value = p.label; cLabel.fill = rowFill; cLabel.font = { bold: true }; cLabel.alignment = AL;

    const refs = groups.map((g) => `'${g.sheetName}'!${g.colMap.Budget}${g.periodRowNums[i]}`).join(', ');
    const cBudget = ws.getCell(row, 2);
    cBudget.value = { formula: `IFERROR(SUM(${refs}),0)` };
    cBudget.fill = rowFill; cBudget.font = { bold: true }; cBudget.alignment = AC; cBudget.numFmt = '#,##0.00';

    const cPct = ws.getCell(row, 3);
    cPct.fill = rowFill; cPct.alignment = AC; cPct.numFmt = '0.0%';
    // Formula filled in below once the grand total row exists.

    ws.getRow(row).height = 18;
    grandPeriodRows.push(row);
    row += 1;
  });
  const grandPeriodFirstRow = grandPeriodRows[0];
  const grandPeriodLastRow = grandPeriodRows[grandPeriodRows.length - 1];

  const grandTotalRow = row;
  const cLabel = ws.getCell(row, 1);
  cLabel.value = 'TOTAL'; cLabel.fill = C_TOTAL; cLabel.font = { bold: true }; cLabel.alignment = AL;
  const cBudget = ws.getCell(row, 2);
  cBudget.value = { formula: `SUM(B${grandPeriodFirstRow}:B${grandPeriodLastRow})` };
  cBudget.fill = C_TOTAL; cBudget.font = { bold: true }; cBudget.alignment = AC; cBudget.numFmt = '#,##0.00';
  const cPct = ws.getCell(row, 3);
  cPct.value = 1;
  cPct.fill = C_TOTAL; cPct.font = { bold: true }; cPct.alignment = AC; cPct.numFmt = '0.0%';
  ws.getRow(row).height = 18;
  row += 2;

  grandPeriodRows.forEach((r) => {
    const cell = ws.getCell(r, 3);
    cell.value = { formula: `IFERROR(B${r}/B${grandTotalRow},0)` };
  });

  // ── Budget by Channel — Period Detail — one period-by-period table per
  // (channel, format, goal) group, same shape as that channel's own ALL
  // COUNTRIES breakdown, mirrored here so every channel's phasing is
  // visible without switching tabs. The % column shows this group's share
  // of the OVERALL budget for that same period (cross-referencing the
  // Grand Total section above), not its own channel's total. ────────────
  mergeRow(ws, nColsTotal, row, C_GOAL, { color: WHITE, bold: true }, 'BUDGET BY CHANNEL — PERIOD DETAIL', 18, AC);
  row += 1;

  groups.forEach((g, gi) => {
    const label = g.liFmt ? `${g.channelName} (${g.liFmt})` : g.channelName;
    const extras = extraMetricsPerGroup[gi];
    const nGroupCols = 3 + extras.length;

    mergeRow(ws, nGroupCols, row, C_CH, { color: WHITE, bold: true }, `${label}  —  ${g.goalName}`, 18, AC);
    row += 1;

    ['Period', 'Budget (€)', '% of Overall'].forEach((text, i) => {
      const cc = ws.getCell(row, 1 + i);
      cc.value = text;
      cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
    });
    extras.forEach((k, ei) => {
      const cc = ws.getCell(row, 4 + ei);
      cc.value = colLabel(k, g.channelName);
      cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
    });
    ws.getRow(row).height = 22;
    row += 1;

    periods.forEach((p, i) => {
      const rowFill = i % 2 === 0 ? C_ODD : C_EVEN;
      const cPeriod = ws.getCell(row, 1);
      cPeriod.value = p.label; cPeriod.fill = rowFill; cPeriod.font = { bold: true }; cPeriod.alignment = AL;

      const groupPeriodRow = g.periodRowNums[i];
      const cBud = ws.getCell(row, 2);
      cBud.value = { formula: `IFERROR('${g.sheetName}'!${g.colMap.Budget}${groupPeriodRow},0)` };
      cBud.fill = rowFill; cBud.font = { bold: true }; cBud.alignment = AC; cBud.numFmt = '#,##0.00';

      const cPctGroup = ws.getCell(row, 3);
      cPctGroup.value = { formula: `IFERROR(B${row}/B${grandPeriodRows[i]},0)` };
      cPctGroup.fill = rowFill; cPctGroup.alignment = AC; cPctGroup.numFmt = '0.0%';

      extras.forEach((k, ei) => {
        const cc = ws.getCell(row, 4 + ei);
        cc.value = { formula: `IFERROR('${g.sheetName}'!${g.colMap[k]}${groupPeriodRow},0)` };
        cc.fill = rowFill; cc.font = { bold: true }; cc.alignment = AC; cc.numFmt = numFmt(k);
      });

      ws.getRow(row).height = 15;
      row += 1;
    });

    const cTotalLabel = ws.getCell(row, 1);
    cTotalLabel.value = 'TOTAL'; cTotalLabel.fill = C_STOT; cTotalLabel.font = { bold: true }; cTotalLabel.alignment = AL;
    const cTotalBud = ws.getCell(row, 2);
    cTotalBud.value = { formula: `IFERROR('${g.sheetName}'!${g.colMap.Budget}${g.totalsRow},0)` };
    cTotalBud.fill = C_STOT; cTotalBud.font = { bold: true }; cTotalBud.alignment = AC; cTotalBud.numFmt = '#,##0.00';
    const cTotalPct = ws.getCell(row, 3);
    cTotalPct.value = { formula: `IFERROR(B${row}/B${grandTotalRow},0)` };
    cTotalPct.fill = C_STOT; cTotalPct.font = { bold: true }; cTotalPct.alignment = AC; cTotalPct.numFmt = '0.0%';
    extras.forEach((k, ei) => {
      const cc = ws.getCell(row, 4 + ei);
      cc.value = { formula: `IFERROR('${g.sheetName}'!${g.colMap[k]}${g.totalsRow},0)` };
      cc.fill = C_STOT; cc.font = { bold: true }; cc.alignment = AC; cc.numFmt = numFmt(k);
    });
    ws.getRow(row).height = 18;
    row += 2;
  });

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 14;
  for (let i = 4; i <= nColsTotal; i++) ws.getColumn(i).width = 14;
}

export async function buildExcelAll(scenarios: Scenario[], plan: PlanConfig): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const periods = generatePeriods(plan.startDate, plan.endDate, plan.breakdown);
  const flight = `${plan.startDate} – ${plan.endDate}`;
  const multiScenario = scenarios.length > 1;

  for (const scenario of scenarios) {
    const totalBudgetAll = scenario.markets.reduce((n, m) => n + marketBudget(scenario, m), 0) || 1;
    const usedChannels = ALL_CHANNELS.filter((ch) =>
      scenario.markets.some((m) => m.goals.some((g) => g.channels.some((c) => c.channel === ch))));

    const scenarioPrefix = multiScenario ? `${scenario.name} – ` : '';
    const overviewWs = wb.addWorksheet(`${scenarioPrefix}Overview`.slice(0, 31));
    const groups: OverviewGroup[] = [];

    usedChannels.forEach((channel) => {
      const ws = wb.addWorksheet(`${scenarioPrefix}${channel}`.slice(0, 31));

      const maxDataCols = Math.max(
        ...scenario.markets.flatMap((m) => m.goals.flatMap((g) => g.channels
          .filter((c) => c.channel === channel)
          .map((c) => {
            const key = channelKeyFor(c.channel, c.liFormat);
            return phaseColsFor(key, g.goal, c.amazonFormat).length;
          }))),
        8,
      );
      const nColsTotal = 1 + maxDataCols;

      const chanBudget = scenario.markets.reduce((n, m) => n + m.goals.reduce((n2, g) => n2 + g.channels
        .filter((c) => c.channel === channel)
        .reduce((n3, c) => n3 + channelBudget(scenario, m, g, c.splitPct), 0), 0), 0);

      let row = 1;
      mergeRow(ws, nColsTotal, row, C_TITLE, { color: WHITE, bold: true, size: 13 }, `${channel}  —  ${scenario.name}  —  ${plan.campaignName}`, 22);
      row += 1;
      mergeRow(ws, nColsTotal, row, C_TITLE, { color: WHITE, size: 10 }, `${channel} Budget: €${chanBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}  |  ${flight}  |  ${plan.breakdown}`, 15);
      row += 2;

      const totalTracker = new Map<string, Tracked>();

      scenario.markets.forEach((market) => {
        const hasChannel = market.goals.some((g) => g.channels.some((c) => c.channel === channel));
        if (!hasChannel) return;

        const mktLabel = MARKET_LABELS[market.market] ?? market.market;
        const mktBudget = marketBudget(scenario, market);
        const mktPct = (mktBudget / totalBudgetAll) * 100;
        mergeRow(ws, nColsTotal, row, C_MKT, { color: WHITE, bold: true }, `${mktLabel}  —  €${mktBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}  (${mktPct.toFixed(0)}%)`, 20, AC);
        row += 1;

        (['Awareness', 'Traffic', 'Conversion'] as Goal[]).forEach((goalName) => {
          const goal = market.goals.find((g) => g.goal === goalName);
          const filteredChannels = goal?.channels.filter((c) => c.channel === channel) ?? [];
          if (!goal || filteredChannels.length === 0) return;

          mergeRow(ws, nColsTotal, row, C_GOAL, { color: WHITE, bold: true }, goalName.toUpperCase(), 18, AC);
          row += 1;

          filteredChannels.forEach((chCfg) => {
            row = renderChannelBlock(ws, row, scenario, market, goal, goalName, chCfg, periods, totalTracker);
          });

          row += 1;
        });

        row += 2;
      });

      row += 1;
      mergeRow(ws, nColsTotal, row, C_TITLE, { color: WHITE, bold: true, size: 13 }, `${channel.toUpperCase()} TOTALS  —  ${scenario.name}  —  ${scenario.markets.length} countr${scenario.markets.length === 1 ? 'y' : 'ies'}`, 22, AC);
      row += 2;

      (['Awareness', 'Traffic', 'Conversion'] as Goal[]).forEach((goalName) => {
        const anyHasGoal = scenario.markets.some((m) => m.goals.some((g) => g.goal === goalName && g.channels.some((c) => c.channel === channel)));
        if (!anyHasGoal) return;

        mergeRow(ws, nColsTotal, row, C_GOAL, { color: WHITE, bold: true }, goalName.toUpperCase(), 18, AC);
        row += 1;

        const seenFormats = new Set<string>();
        scenario.markets.forEach((m) => m.goals.forEach((g) => {
          if (g.goal !== goalName) return;
          g.channels.forEach((c) => { if (c.channel === channel) seenFormats.add(c.liFormat ?? ''); });
        }));

        seenFormats.forEach((liFmtRaw) => {
          const liFmt = (liFmtRaw || undefined) as LinkedInFormat | undefined;
          const trackKey = `${goalName}|${channel}|${liFmtRaw}`;
          const tr = totalTracker.get(trackKey);
          if (!tr) return;

          const { nextRow, totalsRowNum, periodRowNums } = renderChannelTotalsGroup(ws, row, periods, channel, liFmt, tr);
          row = nextRow;

          groups.push({
            channelName: channel, liFmt, goalName,
            sheetName: `${scenarioPrefix}${channel}`.slice(0, 31),
            colMap: tr.colMap, colKeys: tr.colKeys, totalsRow: totalsRowNum, periodRowNums,
          });
        });

        row += 1;
      });

      ws.getColumn(1).width = 18;
      for (let i = 2; i <= nColsTotal; i++) ws.getColumn(i).width = 12;
    });

    renderOverviewTab(overviewWs, scenario, plan, flight, totalBudgetAll, groups, periods);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
