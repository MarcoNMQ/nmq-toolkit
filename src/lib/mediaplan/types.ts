export type Channel = 'YouTube' | 'LinkedIn' | 'Search' | 'Display';
export type Goal = 'Awareness' | 'Traffic' | 'Conversion';
export type Breakdown = 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
export type Audience = 'B2B' | 'B2C';

// LinkedIn has sub-formats that change which benchmark fields/KPI formulas
// apply — 'LinkedIn' itself is the channel, this is the creative format.
export type LinkedInFormat =
  | 'Static'
  | 'Video'
  | 'Carousel'
  | 'Sponsored Message / Conversational Ad'
  | 'Conversation Ad'
  | 'Document Ad'
  | 'Lead Gen Form';

// The "effective channel key" used to look up benchmark fields / column
// layout — LinkedIn splits into 4 keys depending on format, everything
// else is just the channel name. Mirrors media_plan.py's bench_key/ch_key.
export type ChannelKey = Channel | 'LinkedIn_SM' | 'LinkedIn_CA' | 'LinkedIn_DA' | 'LinkedIn_LGF';

export interface Benchmark {
  cpm?: number;
  cpc?: number;
  ctr?: number;
  view_rate?: number;
  frequency?: number;
  click_to_session?: number;
  conv_rate?: number;
  lead_to_mql?: number;
  mql_to_sql?: number;
  open_rate?: number;
  form_completion_rate?: number;
}

export type BenchmarkField = keyof Benchmark;

// One channel's settings within a (market, goal) — its budget split %,
// benchmark assumptions, and (LinkedIn only) format.
export interface ChannelConfig {
  // Stable identity for this entry — required because a goal can hold more
  // than one instance of the same channel (e.g. two separate LinkedIn line
  // items, one Sponsored Message and one Lead Gen Form, both under the same
  // goal). All per-channel store actions target by id, never by `channel`
  // name, so duplicates never collide or get updated together.
  id: string;
  channel: Channel;
  splitPct: number;
  benchmark: Benchmark;
  liFormat?: LinkedInFormat;
  // Optional sub-range of the plan's overall flight (ISO 'YYYY-MM-DD') during
  // which THIS channel instance actually runs — e.g. one LinkedIn format for
  // the first two weeks, a retargeting format for the next two. When unset,
  // the channel runs across the entire flight (unchanged default behavior).
  // Stored as dates rather than period indices so a selection stays valid
  // even if the plan's breakdown (Daily/Weekly/...) changes afterward.
  activeFrom?: string;
  activeTo?: string;
}

// One goal's settings within a market — which channels are on, the
// goal's % share of the market budget (when the market has >1 goal).
export interface GoalConfig {
  goal: Goal;
  goalPct: number;
  channels: ChannelConfig[];
}

// One market within a scenario — its % budget share and the goals running
// in it. Deliberately does NOT store a € budget alongside pct (the Python
// source kept both `pct_{m}` and `bud_mkt_{m}` in sync via on_change
// callbacks, which is a classic dual-source-of-truth bug risk). Here pct
// is the only stored value; € is always derived via budgets.ts so there's
// nothing to fall out of sync. Editing the € field just back-solves for
// pct and stores that instead.
export interface MarketConfig {
  market: string;
  pct: number;
  expanded: boolean;
  goals: GoalConfig[];
}

export interface Scenario {
  id: string;
  name: string;
  totalBudget: number;
  markets: MarketConfig[];
  pinnedMarket?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AiChatKind = 'insights' | 'recs' | 'bench';

export interface PlanConfig {
  campaignName: string;
  audience: Audience;
  industry: string;
  startDate: string;
  endDate: string;
  breakdown: Breakdown;
}

export interface Period {
  label: string;
  days: number;
  // ISO date strings ('YYYY-MM-DD') for this period's calendar boundaries —
  // lets a channel's active window (ChannelConfig.activeFrom/activeTo) be
  // tested for overlap regardless of the plan's breakdown granularity.
  start: string;
  end: string;
}

// Output of calcRow() — a sparse bag of metrics, only the keys relevant
// to the channel/goal/format combination are populated. Mirrors Python's
// dict-based `r` in calc_row().
export interface KpiRow {
  Budget: number;
  impressions?: number;
  reach?: number;
  views?: number;
  clicks?: number;
  cpc?: number;
  ctr?: number;
  click_to_session?: number;
  sessions?: number;
  conv_rate?: number;
  conversions?: number;
  cpa?: number;
  cvr?: number;
  lead_to_mql?: number;
  mql?: number;
  cost_per_mql?: number;
  mql_to_sql?: number;
  sql?: number;
  cost_per_sql?: number;
  eff_cpm?: number;
  cpv?: number;
  sends?: number;
  cost_per_send?: number;
  opens?: number;
  cost_per_open?: number;
  open_rate?: number;
  cta_clicks?: number;
  form_completions?: number;
  form_completion_rate?: number;
}

export interface PeriodRow extends KpiRow {
  Period: string;
  Days: number;
}
