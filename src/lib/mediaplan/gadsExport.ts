import { channelBudget } from './budgets';
import { MARKET_LABELS } from './constants';
import type { Channel, PlanConfig, Scenario } from './types';

// Direct port of _build_gads_csv_scenario() in media_plan.py — Google Ads
// Editor bulk-upload CSV (Campaign + Location + Language + Ad Group rows
// per market/goal/channel combination). LinkedIn is excluded — Google Ads
// Editor has no concept of it.

const MARKET_LANGUAGE: Record<string, string> = {
  AT: 'German', BE: 'French', BG: 'Bulgarian', HR: 'Croatian', CY: 'Greek',
  CZ: 'Czech', DK: 'Danish', EE: 'Estonian', FI: 'Finnish', FR: 'French',
  DE: 'German', GR: 'Greek', HU: 'Hungarian', IE: 'English', IT: 'Italian',
  LV: 'Latvian', LT: 'Lithuanian', LU: 'French', MT: 'English', NL: 'Dutch',
  NO: 'Norwegian', PL: 'Polish', PT: 'Portuguese', RO: 'Romanian',
  SK: 'Slovak', SI: 'Slovenian', ES: 'Spanish', SE: 'Swedish',
  CH: 'German', UK: 'English',
};

const GADS_TYPE: Partial<Record<Channel, string>> = { YouTube: 'Video', Search: 'Search', Display: 'Display' };
const GADS_BID: Record<string, string> = {
  'YouTube|Awareness': 'Target CPM',
  'YouTube|Traffic': 'Maximize conversions',
  'YouTube|Conversion': 'Target CPA',
  'Search|Awareness': 'Manual CPC',
  'Search|Traffic': 'Maximize clicks',
  'Search|Conversion': 'Target CPA',
  'Display|Awareness': 'Target CPM',
  'Display|Traffic': 'Maximize clicks',
  'Display|Conversion': 'Target CPA',
};

const GADS_COLS = [
  'Campaign', 'Campaign Status', 'Campaign Type',
  'Budget', 'Budget Type',
  'Bid Strategy Type', 'Target CPA', 'Target CPM',
  'Start Date', 'End Date',
  'Location', 'Location Type',
  'Language', 'Language Type',
  'Ad Group', 'Ad Group Status', 'Default Max. CPC',
];

function mdy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildGadsCsv(scenario: Scenario, plan: PlanConfig): string {
  const days = Math.max(
    Math.round((new Date(`${plan.endDate}T00:00:00`).getTime() - new Date(`${plan.startDate}T00:00:00`).getTime()) / 86400000) + 1,
    1,
  );
  const sDt = mdy(plan.startDate);
  const eDt = mdy(plan.endDate);
  const rows: Record<string, string | number>[] = [];
  const empty = () => Object.fromEntries(GADS_COLS.map((c) => [c, ''])) as Record<string, string | number>;

  scenario.markets.forEach((market) => {
    market.goals.forEach((goal) => {
      const gadsChannels = goal.channels.filter((c) => c.channel in GADS_TYPE);
      gadsChannels.forEach((chCfg) => {
        const chBud = channelBudget(scenario, market, goal, chCfg.splitPct);
        const daily = Math.round((chBud / days) * 100) / 100;
        const name = `${plan.campaignName}_${market.market}_${goal.goal}_${chCfg.channel}`;
        const bid = GADS_BID[`${chCfg.channel}|${goal.goal}`] ?? 'Manual CPC';
        const targetCpm = (chCfg.channel === 'YouTube' || chCfg.channel === 'Display') ? (chCfg.benchmark.cpm ?? '') : '';
        const defaultCpc = chCfg.channel === 'Search' ? (chCfg.benchmark.cpc ?? '') : '';

        const r1 = empty();
        Object.assign(r1, {
          Campaign: name, 'Campaign Status': 'Enabled', 'Campaign Type': GADS_TYPE[chCfg.channel] ?? '',
          Budget: daily, 'Budget Type': 'Daily', 'Bid Strategy Type': bid,
          'Target CPM': targetCpm, 'Start Date': sDt, 'End Date': eDt,
        });
        rows.push(r1);

        const r2 = empty();
        Object.assign(r2, { Campaign: name, Location: MARKET_LABELS[market.market] ?? market.market, 'Location Type': 'Location' });
        rows.push(r2);

        const r3 = empty();
        Object.assign(r3, { Campaign: name, Language: MARKET_LANGUAGE[market.market] ?? 'English', 'Language Type': 'Language' });
        rows.push(r3);

        const r4 = empty();
        Object.assign(r4, { Campaign: name, 'Ad Group': `${name}_AdGroup_01`, 'Ad Group Status': 'Enabled', 'Default Max. CPC': defaultCpc });
        rows.push(r4);
      });
    });
  });

  const lines = [GADS_COLS.join(',')];
  rows.forEach((r) => lines.push(GADS_COLS.map((c) => csvCell(r[c] ?? '')).join(',')));
  return lines.join('\r\n');
}
