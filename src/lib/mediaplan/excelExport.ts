import ExcelJS from 'exceljs';
import { generatePeriods } from './calc';
import { marketBudget, goalBudget, channelBudget } from './budgets';
import { ADDITIVE, BENCH_FIELDS, COL_FMT, MARKET_LABELS, PHASE_COLS, channelKeyFor } from './constants';
import type { BenchmarkField, Channel, ChannelKey, Goal, LinkedInFormat, PlanConfig, Scenario } from './types';

// Direct port of _build_excel_all() in media_plan.py — one workbook, one
// tab per scenario, countries stacked vertically, a Scenario Totals
// section at the bottom that SUMs each country's TOTAL row via real Excel
// formulas (not pre-computed values), so the exported file stays a live,
// editable model — changing a yellow assumption cell recalculates
// everything downstream of it, exactly like the original.

const PCT_KEYS = new Set(['ctr', 'view_rate', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql', 'cvr', 'open_rate', 'form_completion_rate']);
const EUR_KEYS = new Set(['Budget', 'cpc', 'cpa', 'cpv', 'eff_cpm', 'cost_per_mql', 'cost_per_sql', 'cost_per_send', 'cost_per_open']);
const ADDITIVE_SET = new Set(ADDITIVE);

const RATE_FROM: Record<string, [string, string]> = {
  ctr: ['clicks', 'impressions'],
  click_to_session: ['sessions', 'clicks'],
  conv_rate: ['conversions', 'sessions'],
  lead_to_mql: ['mql', 'conversions'],
  mql_to_sql: ['sql', 'mql'],
};
const RATE_FROM_SM: Record<string, [string, string]> = {
  open_rate: ['opens', 'sends'],
  ctr: ['cta_clicks', 'opens'],
  conv_rate: ['conversions', 'cta_clicks'],
  lead_to_mql: ['mql', 'conversions'],
  mql_to_sql: ['sql', 'mql'],
};
const RATE_FROM_LGF: Record<string, [string, string]> = {
  ctr: ['clicks', 'impressions'],
  form_completion_rate: ['form_completions', 'clicks'],
  lead_to_mql: ['mql', 'form_completions'],
  mql_to_sql: ['sql', 'mql'],
};

function numFmt(key: string): string {
  if (PCT_KEYS.has(key)) return '0.00%';
  if (EUR_KEYS.has(key)) return '#,##0.00';
  return '#,##0';
}

const BM_LABELS: Record<string, string> = {
  cpm: 'CPM / Cost per Send (€)', cpc: 'CPC (€)', view_rate: 'View Rate',
  ctr: 'CTR / CTA Click Rate', frequency: 'Frequency',
  click_to_session: 'Click→Session', open_rate: 'Open Rate',
  form_completion_rate: 'Form Completion Rate',
  conv_rate: 'Session→Lead % / CTA→Lead %',
  lead_to_mql: 'Lead→MQL %', mql_to_sql: 'MQL→SQL %',
};
const BM_NUM_FMT: Record<string, string> = {
  cpm: '#,##0.0000', cpc: '#,##0.00', view_rate: '0.00%',
  ctr: '0.00%', frequency: '0.0', click_to_session: '0%',
  open_rate: '0.0%', form_completion_rate: '0.0%',
  conv_rate: '0.00%', lead_to_mql: '0%', mql_to_sql: '0%',
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
  if (ch === 'LinkedIn' && (liFmt === 'Sponsored Message / Conversational Ad' || liFmt === 'Conversation Ad')) {
    if (rateKeysSm.includes(key)) return `${bmMap[key] ?? '0'}`;
  } else if (ch === 'LinkedIn' && (liFmt === 'Document Ad' || liFmt === 'Lead Gen Form')) {
    if (rateKeysLgf.includes(key)) return `${bmMap[key] ?? '0'}`;
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

export async function buildExcelAll(scenarios: Scenario[], plan: PlanConfig): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const periods = generatePeriods(plan.startDate, plan.endDate, plan.breakdown);
  const totalDays = periods.reduce((n, p) => n + p.days, 0) || 1;
  const flight = `${plan.startDate} – ${plan.endDate}`;

  for (const scenario of scenarios) {
    const ws = wb.addWorksheet(scenario.name.slice(0, 31));
    const maxDataCols = Math.max(
      ...scenario.markets.flatMap((m) => m.goals.flatMap((g) => g.channels.map((c) => {
        const key = channelKeyFor(c.channel, c.liFormat);
        return (PHASE_COLS[`${key}|${g.goal}`] ?? []).length;
      }))),
      8,
    );
    const nColsTotal = 1 + maxDataCols;

    function merge(row: number, fillStyle: typeof C_TITLE, font: Partial<ExcelJS.Font>, text: string, height = 18, align: typeof AC | typeof AL = AL) {
      const cell = ws.getCell(row, 1);
      cell.value = text;
      cell.fill = fillStyle;
      cell.font = font;
      cell.alignment = align;
      ws.mergeCells(row, 1, row, nColsTotal);
      ws.getRow(row).height = height;
    }

    const totalBudgetAll = scenario.markets.reduce((n, m) => n + marketBudget(scenario, m), 0) || 1;

    let row = 1;
    merge(row, C_TITLE, { color: WHITE, bold: true, size: 13 }, `${scenario.name}  —  ${plan.campaignName}`, 22);
    row += 1;
    merge(row, C_TITLE, { color: WHITE, size: 10 }, `Total Budget: €${totalBudgetAll.toLocaleString(undefined, { maximumFractionDigits: 0 })}  |  ${flight}  |  ${plan.breakdown}`, 15);
    row += 2;

    type Tracked = { rows: number[]; colKeys: string[]; colMap: Record<string, string>; liFmt?: LinkedInFormat };
    const totalTracker = new Map<string, Tracked>();

    scenario.markets.forEach((market, mktIdx) => {
      const mktLabel = MARKET_LABELS[market.market] ?? market.market;
      const mktBudget = marketBudget(scenario, market);
      const mktPct = (mktBudget / totalBudgetAll) * 100;

      merge(row, C_MKT, { color: WHITE, bold: true }, `${mktLabel}  —  €${mktBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}  (${mktPct.toFixed(0)}%)`, 20, AC);
      row += 1;

      (['Awareness', 'Traffic', 'Conversion'] as Goal[]).forEach((goalName) => {
        const goal = market.goals.find((g) => g.goal === goalName);
        if (!goal || goal.channels.length === 0) return;

        merge(row, C_GOAL, { color: WHITE, bold: true }, goalName.toUpperCase(), 18, AC);
        row += 1;

        goal.channels.forEach((chCfg) => {
          const chBud = channelBudget(scenario, market, goal, chCfg.splitPct);
          const liFmt = chCfg.channel === 'LinkedIn' ? chCfg.liFormat : undefined;
          const key: ChannelKey = channelKeyFor(chCfg.channel, liFmt);
          const colKeys = PHASE_COLS[`${key}|${goalName}`] ?? [];
          const nChCols = colKeys.length + 1;
          const colMap: Record<string, string> = {};
          colKeys.forEach((k, i) => { colMap[k] = colLetter(2 + i); });
          const dailyBud = chBud / totalDays;

          const chLabel = liFmt ? `${chCfg.channel} (${liFmt})` : chCfg.channel;
          let c = ws.getCell(row, 1);
          c.value = `${chLabel}     Daily Budget: €${dailyBud.toFixed(2)} / day`;
          c.fill = C_CH; c.font = { color: WHITE, bold: true }; c.alignment = AC;
          ws.mergeCells(row, 1, row, nChCols);
          ws.getRow(row).height = 18;
          row += 1;

          const bmParams = BENCH_FIELDS[`${key}|${goalName}`] ?? [];
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
            cc.value = COL_FMT[k]?.label ?? k;
            cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
          });
          ws.getRow(row).height = 28;
          row += 1;

          const firstDataRow = row;
          periods.forEach((p, rIdx) => {
            const bud = (chBud * p.days) / totalDays;
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
        });

        row += 1;
      });

      if (mktIdx < scenario.markets.length - 1) row += 2;
    });

    // ── Scenario Totals ──────────────────────────────────────────────────
    row += 2;
    merge(row, C_TITLE, { color: WHITE, bold: true, size: 13 }, `SCENARIO TOTALS  —  ${scenario.name}  —  ${scenario.markets.length} countr${scenario.markets.length === 1 ? 'y' : 'ies'}`, 22, AC);
    row += 2;

    (['Awareness', 'Traffic', 'Conversion'] as Goal[]).forEach((goalName) => {
      const anyHasGoal = scenario.markets.some((m) => m.goals.some((g) => g.goal === goalName && g.channels.length > 0));
      if (!anyHasGoal) return;

      merge(row, C_GOAL, { color: WHITE, bold: true }, goalName.toUpperCase(), 18, AC);
      row += 1;

      const seenChannels = new Set<string>();
      scenario.markets.forEach((m) => m.goals.forEach((g) => {
        if (g.goal !== goalName) return;
        g.channels.forEach((c) => seenChannels.add(`${c.channel}|${c.liFormat ?? ''}`));
      }));

      seenChannels.forEach((chKey) => {
        const [chName, liFmtRaw] = chKey.split('|');
        const liFmt = (liFmtRaw || undefined) as LinkedInFormat | undefined;
        const trackKey = `${goalName}|${chName}|${liFmtRaw}`;
        const tr = totalTracker.get(trackKey);
        if (!tr) return;
        const { colKeys, colMap, rows: trows } = tr;
        const nChCols = colKeys.length + 1;

        let rateFrom = RATE_FROM;
        if (chName === 'LinkedIn' && (liFmt === 'Sponsored Message / Conversational Ad' || liFmt === 'Conversation Ad')) rateFrom = RATE_FROM_SM;
        else if (chName === 'LinkedIn' && (liFmt === 'Document Ad' || liFmt === 'Lead Gen Form')) rateFrom = RATE_FROM_LGF;

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
          cc.value = COL_FMT[k]?.label ?? k;
          cc.fill = C_HDR; cc.font = { color: WHITE, bold: true }; cc.alignment = AC;
        });
        ws.getRow(row).height = 28;
        row += 1;

        c = ws.getCell(row, 1);
        c.value = 'ALL COUNTRIES';
        c.fill = C_STOT; c.font = { bold: true }; c.alignment = AC;
        colKeys.forEach((k, i) => {
          const colLetterForKey = colMap[k] ?? 'B';
          let f = '';
          if (ADDITIVE_SET.has(k)) {
            const refs = trows.map((r) => `${colLetterForKey}${r}`).join(', ');
            f = `IFERROR(SUM(${refs}),"")`;
          } else if (k in rateFrom) {
            const [nk, dk] = rateFrom[k];
            if (colMap[nk] && colMap[dk]) f = `IFERROR(${colMap[nk]}${row}/${colMap[dk]}${row},"")`;
          } else {
            const ff = formula(k, colMap, { __row: String(row) }, chName as Channel, liFmt);
            f = ff ?? '';
          }
          const cc = ws.getCell(row, 2 + i);
          cc.value = f ? { formula: f } : '';
          cc.fill = C_STOT; cc.font = { bold: true }; cc.alignment = AC;
          cc.numFmt = numFmt(k);
        });
        ws.getRow(row).height = 18;
        row += 2;
      });

      row += 1;
    });

    ws.getColumn(1).width = 18;
    for (let i = 2; i <= nColsTotal; i++) ws.getColumn(i).width = 12;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
