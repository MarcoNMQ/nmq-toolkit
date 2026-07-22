import type { Benchmark, BenchmarkField, Channel, ChannelKey, Goal } from './types';

export const MARKET_LABELS: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus',
  CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FI: 'Finland', FR: 'France',
  DE: 'Germany', GR: 'Greece', HU: 'Hungary', IE: 'Ireland', IT: 'Italy',
  LV: 'Latvia', LT: 'Lithuania', LU: 'Luxembourg', MT: 'Malta', NL: 'Netherlands',
  NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', SK: 'Slovakia',
  SI: 'Slovenia', ES: 'Spain', SE: 'Sweden', CH: 'Switzerland', UK: 'United Kingdom',
};

export const ALL_GOALS: Goal[] = ['Awareness', 'Traffic', 'Conversion'];
export const ALL_CHANNELS: Channel[] = ['YouTube', 'LinkedIn', 'Search', 'Display'];

export const MARKET_GROUPS: Record<string, string[]> = {
  DACH: ['DE', 'AT', 'CH'],
  Nordics: ['DK', 'FI', 'NO', 'SE'],
  BeNeLux: ['BE', 'NL', 'LU'],
  'Southern EU': ['ES', 'IT', 'PT', 'GR'],
  CEE: ['PL', 'CZ', 'HU', 'RO', 'BG', 'SK', 'SI', 'HR'],
  'UK + IE': ['UK', 'IE'],
  'All EU': [
    'DE', 'AT', 'CH', 'DK', 'FI', 'NO', 'SE', 'BE', 'NL', 'LU', 'ES', 'IT', 'PT', 'GR',
    'PL', 'CZ', 'HU', 'RO', 'BG', 'SK', 'SI', 'HR', 'FR', 'UK', 'IE', 'EE', 'LV', 'LT',
    'CY', 'MT',
  ],
};

export interface PlanTemplate {
  markets: string[];
  budget: number;
  goals: Partial<Record<Goal, Channel[]>>;
}

export const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  'DACH Awareness Launch': {
    markets: ['DE', 'AT', 'CH'], budget: 50000,
    goals: { Awareness: ['YouTube'] },
  },
  'Pan-EU Lead Gen': {
    markets: ['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'SE', 'PL'], budget: 120000,
    goals: { Traffic: ['LinkedIn', 'Search'], Conversion: ['Search'] },
  },
  'Single Market Full Funnel': {
    markets: ['DE'], budget: 80000,
    goals: { Awareness: ['YouTube'], Traffic: ['LinkedIn', 'Search'], Conversion: ['Search'] },
  },
  'Nordics Brand Building': {
    markets: ['DK', 'FI', 'NO', 'SE'], budget: 60000,
    goals: { Awareness: ['YouTube', 'LinkedIn'] },
  },
  'BeNeLux Performance': {
    markets: ['BE', 'NL', 'LU'], budget: 40000,
    goals: { Traffic: ['Search', 'LinkedIn'], Conversion: ['Search'] },
  },
};

function defaultBench(
  cpmYt: number, cpmLi: number, viewRate: number, ctrYt: number, ctrLi: number, freq: number,
  cpcS: number, ctrS: number,
  c2sYt = 0.80, c2sLi = 0.82, c2sS = 0.86, cr = 0.02, l2m = 0.20, m2s = 0.30,
): Record<Channel, Benchmark> {
  const shared = { conv_rate: cr, lead_to_mql: l2m, mql_to_sql: m2s };
  // Display CPM is ~30% of YouTube; CTR is much lower (~0.15%) due to banner
  // format; click intent is lower so click_to_session is also lower (~0.70).
  const cpmDis = Math.round(cpmYt * 0.30 * 10) / 10;
  return {
    YouTube: { cpm: cpmYt, view_rate: viewRate, ctr: ctrYt, frequency: freq, click_to_session: c2sYt, ...shared },
    LinkedIn: { cpm: cpmLi, ctr: ctrLi, frequency: freq, click_to_session: c2sLi, ...shared },
    Search: { cpc: cpcS, ctr: ctrS, click_to_session: c2sS, ...shared },
    Display: { cpm: cpmDis, ctr: 0.0015, frequency: 4.0, click_to_session: 0.70, ...shared },
  };
}

export const BENCH: Record<string, Record<Channel, Benchmark>> = {
  AT: defaultBench(11.0, 18.0, 0.31, 0.0035, 0.0038, 3.0, 2.30, 0.030),
  BE: defaultBench(11.0, 17.0, 0.31, 0.0035, 0.0038, 3.0, 2.20, 0.030),
  BG: defaultBench(3.5, 7.0, 0.30, 0.0028, 0.0032, 3.0, 0.70, 0.022),
  HR: defaultBench(4.5, 9.0, 0.30, 0.0030, 0.0033, 3.0, 0.90, 0.023),
  CY: defaultBench(7.0, 13.0, 0.30, 0.0030, 0.0035, 3.0, 1.50, 0.026),
  CZ: defaultBench(5.0, 9.5, 0.30, 0.0030, 0.0033, 3.0, 1.00, 0.024),
  DK: defaultBench(13.0, 21.0, 0.31, 0.0035, 0.0040, 3.0, 2.80, 0.032),
  EE: defaultBench(4.5, 9.0, 0.30, 0.0030, 0.0033, 3.0, 0.90, 0.023),
  FI: defaultBench(12.0, 19.0, 0.31, 0.0035, 0.0038, 3.0, 2.50, 0.030),
  FR: defaultBench(10.0, 17.0, 0.31, 0.0033, 0.0038, 3.0, 2.00, 0.028),
  DE: defaultBench(11.0, 18.0, 0.31, 0.0035, 0.0038, 3.0, 2.20, 0.030),
  GR: defaultBench(5.0, 10.0, 0.30, 0.0028, 0.0032, 3.0, 1.00, 0.024),
  HU: defaultBench(4.0, 8.0, 0.30, 0.0028, 0.0032, 3.0, 0.80, 0.022),
  IE: defaultBench(12.0, 19.0, 0.31, 0.0035, 0.0040, 3.0, 2.50, 0.032),
  IT: defaultBench(8.0, 14.0, 0.30, 0.0030, 0.0035, 3.0, 1.60, 0.026),
  LV: defaultBench(4.5, 9.0, 0.30, 0.0030, 0.0033, 3.0, 0.90, 0.023),
  LT: defaultBench(4.5, 9.0, 0.30, 0.0030, 0.0033, 3.0, 0.90, 0.023),
  LU: defaultBench(12.0, 18.0, 0.31, 0.0035, 0.0038, 3.0, 2.40, 0.030),
  MT: defaultBench(7.0, 13.0, 0.30, 0.0030, 0.0035, 3.0, 1.40, 0.025),
  NL: defaultBench(10.0, 16.0, 0.31, 0.0035, 0.0040, 3.0, 2.00, 0.030),
  NO: defaultBench(13.0, 22.0, 0.31, 0.0035, 0.0040, 3.0, 2.80, 0.032),
  PL: defaultBench(5.0, 9.0, 0.30, 0.0030, 0.0035, 3.0, 1.00, 0.025),
  PT: defaultBench(6.0, 11.0, 0.30, 0.0030, 0.0035, 3.0, 1.20, 0.025),
  RO: defaultBench(3.5, 7.0, 0.30, 0.0028, 0.0032, 3.0, 0.70, 0.022),
  SK: defaultBench(4.5, 9.0, 0.30, 0.0030, 0.0033, 3.0, 0.90, 0.023),
  SI: defaultBench(5.0, 10.0, 0.30, 0.0030, 0.0033, 3.0, 1.00, 0.024),
  ES: defaultBench(6.0, 12.0, 0.30, 0.0030, 0.0035, 3.0, 1.50, 0.025),
  SE: defaultBench(12.0, 20.0, 0.31, 0.0035, 0.0040, 3.0, 2.60, 0.031),
  CH: defaultBench(13.0, 21.0, 0.31, 0.0035, 0.0040, 3.0, 2.90, 0.032),
  UK: defaultBench(12.0, 20.0, 0.31, 0.0035, 0.0040, 3.0, 2.50, 0.035),
};

export const CH_COLORS: Record<Channel, string[]> = {
  YouTube: ['#1F497D', '#437CA3', '#6B9FBF', '#9FC3D5', '#C5DCE8'],
  LinkedIn: ['#1F6152', '#2E8A72', '#4DB896', '#7DCFB0', '#A8E4D0'],
  Search: ['#4285F4', '#5A95F5', '#74A5F6', '#8EB5F7', '#A8C5F8'],
  Display: ['#B45309', '#D97706', '#F59E0B', '#FCD34D', '#FEF3C7'],
};

export const BENCH_PRESET_FACTORS: Record<string, Record<string, number>> = {
  Conservative: { cpm: 1.15, cpc: 1.15, ctr: 0.80, view_rate: 0.85, conv_rate: 0.75 },
  Average: { cpm: 1.00, cpc: 1.00, ctr: 1.00, view_rate: 1.00, conv_rate: 1.00 },
  Aggressive: { cpm: 0.88, cpc: 0.88, ctr: 1.25, view_rate: 1.15, conv_rate: 1.30 },
};

export const BENCH_HELP: Record<string, string> = {
  cpm: 'Cost per 1,000 impressions. Western EU: €10–13. Eastern EU: €3.5–5.',
  cpc: 'Cost per click on Search. Ranges €0.70 (Eastern EU) to €2.90 (DACH/Nordics).',
  ctr: 'Click-through rate — % of ad impressions that result in a click.',
  view_rate: 'YouTube: % of impressions resulting in a 30-second (or full-video) view.',
  frequency: 'Average number of times one unique user sees your ad across the campaign.',
  click_to_session: '% of clicks that result in a tracked site session (accounts for pixel gaps and bounces).',
  conv_rate: '% of sessions that convert to a lead. Typical B2B range: 1–5%.',
  lead_to_mql: '% of raw leads that qualify as Marketing Qualified Leads. Typical B2B: 15–35%.',
  mql_to_sql: '% of MQLs accepted by sales as Sales Qualified Leads. Typical B2B: 20–40%.',
  open_rate: 'Sponsored Message / Conversation Ad: % of sends that are opened.',
  form_completion_rate: 'Lead Gen Form: % of ad clicks that complete and submit the LinkedIn form.',
};

export const DONUT_PALETTE = [
  '#2BB5A5', '#1F497D', '#4DB896', '#437CA3', '#5A3E7A', '#E8A838', '#8B3A3A', '#6B7280',
  '#229990', '#2E8A72', '#6B9FBF', '#7DCFB0',
];

export const ADDITIVE = [
  'Budget', 'impressions', 'reach', 'views', 'clicks', 'sessions',
  'conversions', 'mql', 'sql', 'sends', 'opens', 'cta_clicks', 'form_completions',
];

export const COL_FMT: Record<string, { label: string; fmt: (x: number) => string }> = {
  Budget: { label: 'Spent (€)', fmt: (x) => `€${x.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  impressions: { label: 'Impressions', fmt: (x) => Math.round(x).toLocaleString() },
  eff_cpm: { label: 'CPM (€)', fmt: (x) => `€${x.toFixed(2)}` },
  reach: { label: 'Reach', fmt: (x) => Math.round(x).toLocaleString() },
  views: { label: 'Views', fmt: (x) => Math.round(x).toLocaleString() },
  clicks: { label: 'Clicks', fmt: (x) => Math.round(x).toLocaleString() },
  cpc: { label: 'CPC (€)', fmt: (x) => `€${x.toFixed(2)}` },
  ctr: { label: 'CTR', fmt: (x) => `${(x * 100).toFixed(2)}%` },
  click_to_session: { label: 'Click→Session %', fmt: (x) => `${(x * 100).toFixed(0)}%` },
  sessions: { label: 'Sessions', fmt: (x) => Math.round(x).toLocaleString() },
  conv_rate: { label: 'Session→Lead %', fmt: (x) => `${(x * 100).toFixed(2)}%` },
  conversions: { label: 'Leads', fmt: (x) => Math.round(x).toLocaleString() },
  cpa: { label: 'Cost per Lead (€)', fmt: (x) => `€${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
  lead_to_mql: { label: 'Lead→MQL %', fmt: (x) => `${(x * 100).toFixed(0)}%` },
  mql: { label: 'MQL', fmt: (x) => Math.round(x).toLocaleString() },
  cost_per_mql: { label: 'CPMQL (€)', fmt: (x) => `€${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
  mql_to_sql: { label: 'MQL→SQL %', fmt: (x) => `${(x * 100).toFixed(0)}%` },
  sql: { label: 'SQL', fmt: (x) => Math.round(x).toLocaleString() },
  cost_per_sql: { label: 'CPSQL (€)', fmt: (x) => `€${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
  view_rate: { label: 'View Rate', fmt: (x) => `${(x * 100).toFixed(1)}%` },
  cpv: { label: 'CPV (€)', fmt: (x) => `€${x.toFixed(2)}` },
  cvr: { label: 'Click→Lead %', fmt: (x) => `${(x * 100).toFixed(2)}%` },
  sends: { label: 'Sends', fmt: (x) => Math.round(x).toLocaleString() },
  open_rate: { label: 'Open Rate', fmt: (x) => `${(x * 100).toFixed(1)}%` },
  opens: { label: 'Opens', fmt: (x) => Math.round(x).toLocaleString() },
  cta_clicks: { label: 'CTA Clicks', fmt: (x) => Math.round(x).toLocaleString() },
  form_completions: { label: 'Form Completions', fmt: (x) => Math.round(x).toLocaleString() },
  form_completion_rate: { label: 'Form Completion %', fmt: (x) => `${(x * 100).toFixed(1)}%` },
  cost_per_send: { label: 'Cost per Send (€)', fmt: (x) => `€${x.toFixed(4)}` },
  cost_per_open: { label: 'Cost per Open (€)', fmt: (x) => `€${x.toFixed(4)}` },
  cta_ctr: { label: 'CTA CTR', fmt: (x) => `${(x * 100).toFixed(2)}%` },
};

const TRAFFIC_COLS = ['Budget', 'impressions', 'eff_cpm', 'clicks', 'cpc', 'ctr', 'click_to_session', 'sessions'];
const CONVERSION_COLS = [
  'Budget', 'impressions', 'eff_cpm', 'clicks', 'cpc', 'ctr', 'click_to_session', 'sessions',
  'conv_rate', 'conversions', 'cpa', 'lead_to_mql', 'mql', 'cost_per_mql',
  'mql_to_sql', 'sql', 'cost_per_sql',
];

// Keyed by `${ChannelKey}|${Goal}` since TS object keys can't be tuples.
export const PHASE_COLS: Record<string, string[]> = {
  'YouTube|Awareness': ['Budget', 'impressions', 'reach', 'views', 'cpv', 'ctr', 'clicks', 'cpc'],
  'YouTube|Traffic': TRAFFIC_COLS,
  'YouTube|Conversion': CONVERSION_COLS,
  'Search|Awareness': ['Budget', 'impressions', 'ctr', 'clicks', 'cpc'],
  'Search|Traffic': TRAFFIC_COLS,
  'Search|Conversion': CONVERSION_COLS,
  'LinkedIn|Awareness': ['Budget', 'impressions', 'reach', 'ctr', 'clicks', 'cpc'],
  'LinkedIn|Traffic': TRAFFIC_COLS,
  'LinkedIn|Conversion': CONVERSION_COLS,
  'LinkedIn_SM|Awareness': ['Budget', 'sends', 'cost_per_send', 'opens', 'cost_per_open', 'open_rate', 'cta_clicks', 'ctr'],
  'LinkedIn_SM|Traffic': ['Budget', 'sends', 'cost_per_send', 'opens', 'cost_per_open', 'open_rate', 'cta_clicks', 'ctr'],
  'LinkedIn_SM|Conversion': [
    'Budget', 'sends', 'cost_per_send', 'opens', 'cost_per_open', 'open_rate', 'cta_clicks', 'ctr',
    'conv_rate', 'conversions', 'cpa', 'lead_to_mql', 'mql', 'cost_per_mql', 'mql_to_sql', 'sql', 'cost_per_sql',
  ],
  'LinkedIn_CA|Awareness': ['Budget', 'sends', 'cost_per_send', 'opens', 'cost_per_open', 'open_rate', 'cta_clicks', 'ctr'],
  'LinkedIn_CA|Traffic': ['Budget', 'sends', 'cost_per_send', 'opens', 'cost_per_open', 'open_rate', 'cta_clicks', 'ctr'],
  'LinkedIn_CA|Conversion': [
    'Budget', 'sends', 'cost_per_send', 'opens', 'cost_per_open', 'open_rate', 'cta_clicks', 'ctr',
    'conv_rate', 'conversions', 'cpa', 'lead_to_mql', 'mql', 'cost_per_mql', 'mql_to_sql', 'sql', 'cost_per_sql',
  ],
  'LinkedIn_DA|Awareness': ['Budget', 'impressions', 'eff_cpm', 'clicks', 'ctr', 'form_completions', 'form_completion_rate'],
  'LinkedIn_DA|Traffic': ['Budget', 'impressions', 'eff_cpm', 'clicks', 'ctr', 'form_completions', 'form_completion_rate'],
  'LinkedIn_DA|Conversion': [
    'Budget', 'impressions', 'eff_cpm', 'clicks', 'ctr', 'form_completions', 'form_completion_rate',
    'lead_to_mql', 'mql', 'cost_per_mql', 'mql_to_sql', 'sql', 'cost_per_sql',
  ],
  'LinkedIn_LGF|Awareness': ['Budget', 'impressions', 'eff_cpm', 'clicks', 'ctr', 'form_completions', 'form_completion_rate'],
  'LinkedIn_LGF|Traffic': ['Budget', 'impressions', 'eff_cpm', 'clicks', 'ctr', 'form_completions', 'form_completion_rate'],
  'LinkedIn_LGF|Conversion': [
    'Budget', 'impressions', 'eff_cpm', 'clicks', 'ctr', 'form_completions', 'form_completion_rate',
    'lead_to_mql', 'mql', 'cost_per_mql', 'mql_to_sql', 'sql', 'cost_per_sql',
  ],
  'Display|Awareness': ['Budget', 'impressions', 'reach', 'eff_cpm', 'ctr', 'clicks', 'cpc'],
  'Display|Traffic': TRAFFIC_COLS,
  'Display|Conversion': CONVERSION_COLS,
};

export const BENCH_FIELDS: Record<string, BenchmarkField[]> = {
  'YouTube|Awareness': ['cpm', 'view_rate', 'ctr', 'frequency'],
  'YouTube|Traffic': ['cpm', 'ctr', 'click_to_session'],
  'YouTube|Conversion': ['cpm', 'ctr', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql'],
  'LinkedIn|Awareness': ['cpm', 'ctr', 'frequency'],
  'LinkedIn|Traffic': ['cpm', 'ctr', 'click_to_session'],
  'LinkedIn|Conversion': ['cpm', 'ctr', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql'],
  'LinkedIn_SM|Awareness': ['cpm', 'open_rate', 'ctr'],
  'LinkedIn_SM|Traffic': ['cpm', 'open_rate', 'ctr'],
  'LinkedIn_SM|Conversion': ['cpm', 'open_rate', 'ctr', 'conv_rate', 'lead_to_mql', 'mql_to_sql'],
  'LinkedIn_CA|Awareness': ['cpm', 'open_rate', 'ctr'],
  'LinkedIn_CA|Traffic': ['cpm', 'open_rate', 'ctr'],
  'LinkedIn_CA|Conversion': ['cpm', 'open_rate', 'ctr', 'conv_rate', 'lead_to_mql', 'mql_to_sql'],
  'LinkedIn_DA|Awareness': ['cpm', 'ctr', 'form_completion_rate'],
  'LinkedIn_DA|Traffic': ['cpm', 'ctr', 'form_completion_rate'],
  'LinkedIn_DA|Conversion': ['cpm', 'ctr', 'form_completion_rate', 'lead_to_mql', 'mql_to_sql'],
  'LinkedIn_LGF|Awareness': ['cpm', 'ctr', 'form_completion_rate'],
  'LinkedIn_LGF|Traffic': ['cpm', 'ctr', 'form_completion_rate'],
  'LinkedIn_LGF|Conversion': ['cpm', 'ctr', 'form_completion_rate', 'lead_to_mql', 'mql_to_sql'],
  'Search|Awareness': ['cpc', 'ctr'],
  'Search|Traffic': ['cpc', 'ctr', 'click_to_session'],
  'Search|Conversion': ['cpc', 'ctr', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql'],
  'Display|Awareness': ['cpm', 'ctr', 'frequency'],
  'Display|Traffic': ['cpm', 'ctr', 'click_to_session'],
  'Display|Conversion': ['cpm', 'ctr', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql'],
};

export const BENCH_FIELD_DESC: Record<string, string> = {
  cpm: 'Cost per thousand impressions in EUR (e.g. 12.5). For Sponsored Message: cost per send in EUR (e.g. 0.50)',
  cpc: 'Cost per click in EUR (e.g. 2.5)',
  ctr: 'Click-through rate as decimal proportion — NOT percentage (e.g. 0.003 for 0.3%)',
  view_rate: 'Video view/completion rate as decimal proportion (e.g. 0.30 for 30%)',
  frequency: 'Average ad exposures per unique user over the campaign flight (e.g. 3.0)',
  click_to_session: 'Post-click session rate as decimal proportion (e.g. 0.80 for 80%)',
  conv_rate: 'Session-to-lead conversion rate as decimal proportion (e.g. 0.02 for 2%)',
  lead_to_mql: 'Lead-to-MQL rate as decimal proportion (e.g. 0.20 for 20%)',
  mql_to_sql: 'MQL-to-SQL rate as decimal proportion (e.g. 0.30 for 30%)',
  open_rate: 'Sponsored/Conversation Message open rate as decimal proportion (e.g. 0.35 for 35%)',
  form_completion_rate: 'Lead Gen Form / Document Ad: % of clicks that complete the form, as decimal (e.g. 0.08 for 8%)',
};

export const PRESET_DESC: Record<string, string> = {
  Conservative: 'pessimistic but realistic — higher costs, lower engagement — safe for budget planning',
  Average: 'typical industry benchmark — most likely outcome based on current market conditions',
  Aggressive: 'optimistic stretch target — lower costs, higher engagement — best-case realistic scenario',
};

export const BENCH_IS_PCT = new Set<BenchmarkField>([
  'ctr', 'view_rate', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql',
  'open_rate', 'form_completion_rate',
]);

/** LinkedIn's ChannelKey depends on its creative format — mirrors the
 *  ch_key/bench_key swap in media_plan.py's fmt_df()/_apply_bench_preset_ai(). */
export function channelKeyFor(channel: Channel, liFormat?: string): ChannelKey {
  if (channel !== 'LinkedIn' || !liFormat) return channel;
  if (liFormat === 'Sponsored Message / Conversational Ad') return 'LinkedIn_SM';
  if (liFormat === 'Conversation Ad') return 'LinkedIn_CA';
  if (liFormat === 'Document Ad') return 'LinkedIn_DA';
  if (liFormat === 'Lead Gen Form') return 'LinkedIn_LGF';
  return channel;
}
