export type Channel = 'YouTube' | 'LinkedIn' | 'Search' | 'Display' | 'Amazon Ads';
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

// Amazon has sub-formats too (Sponsored Products, Sponsored Brands,
// Sponsored Display), but unlike LinkedIn's they mostly share an identical
// KPI funnel — clicks/orders math doesn't change between them, only the
// label does — so this is just metadata on ChannelConfig, not a ChannelKey
// split (mirrors how LinkedIn's own Static/Video/Carousel formats stay on
// the plain 'LinkedIn' key). Sponsored Brands/Display additionally report a
// Detail Page View/Add-to-Cart/New-to-Brand tail Sponsored Products doesn't.
export type AmazonFormat = 'Sponsored Products' | 'Sponsored Brands' | 'Sponsored Display';

// The "effective channel key" used to look up benchmark fields / column
// layout — LinkedIn splits into 5 keys depending on format, everything
// else is just the channel name. Mirrors media_plan.py's bench_key/ch_key.
export type ChannelKey = Channel | 'LinkedIn_SM' | 'LinkedIn_CA' | 'LinkedIn_DA' | 'LinkedIn_LGF' | 'LinkedIn_Video';

export interface Benchmark {
  cpm?: number;
  cpc?: number;
  ctr?: number;
  view_rate?: number;
  // Cost per view, EUR — LinkedIn Video only. Unlike YouTube (CPM-driven,
  // views derived from impressions x view_rate), LinkedIn Video is bought
  // and reported on views directly, so CPV is an input here, not an output.
  cpv?: number;
  frequency?: number;
  click_to_session?: number;
  conv_rate?: number;
  lead_to_mql?: number;
  mql_to_sql?: number;
  open_rate?: number;
  form_completion_rate?: number;
  // Return on ad spend (revenue / spend, as a multiple e.g. 4.5 for 4.5x) —
  // Amazon Ads' headline efficiency metric.
  roas?: number;
  // Average SKU units per order — Amazon-only, separate from the order
  // count itself since one order can include multiple units.
  units_per_order?: number;
  // Sponsored Brands/Display-only mid-funnel inputs — Amazon doesn't report
  // these for Sponsored Products at all (its ads land straight on the
  // product's own detail page, no separate DPV/ATC event to attribute).
  dpv_rate?: number;
  atc_rate?: number;
  new_to_brand_pct?: number;
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
  amazonFormat?: AmazonFormat;
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
  // Free text, same convention as industry — identifies which client this
  // plan belongs to. Used (so far) only to scope actuals-based benchmark
  // suggestions to the right client's own historical data; never sent
  // anywhere external.
  clientName?: string;
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
  // Amazon Ads funnel tail — orders attribute directly to ad clicks (via the
  // shared `conversions`/`cpa` fields above, labeled "Orders"/"Cost per
  // Order" for this channel — see colLabel() in constants.ts), plus
  // revenue/ROAS/units (no MQL/SQL step; Amazon doesn't have a lead-
  // qualification stage). detail_page_views/add_to_cart/new_to_brand_*
  // only populate for Sponsored Brands/Display line items.
  revenue?: number;
  roas?: number;
  units?: number;
  detail_page_views?: number;
  add_to_cart?: number;
  new_to_brand_orders?: number;
  new_to_brand_pct?: number;
}

export interface PeriodRow extends KpiRow {
  Period: string;
  Days: number;
}

// ── Plan vs Actuals ────────────────────────────────────────────────────

// The metric fields an imported actuals row can report. A strict subset
// of KpiRow's additive fields — only the ones a real export is
// realistically going to report, and the ones calc.ts's funnels actually
// produce, so a comparison never invents a planned-vs-actual pair for a
// metric neither side has. Includes the Sponsored Message/Conversation Ad
// funnel's own fields (sends/opens/cta_clicks) and the Document
// Ad/Lead Gen Form funnel's (form_completions) — those channels don't
// report impressions/clicks in the conventional sense at all.
export type ActualsMetricKey =
  | 'impressions' | 'reach' | 'clicks' | 'views' | 'conversions' | 'sessions'
  | 'sends' | 'opens' | 'cta_clicks' | 'form_completions';

// One imported row of real campaign results — one market/channel/format
// combination's reported numbers over a date range. Metric fields are
// optional and sparse on purpose: a row only ever carries the metrics its
// source file actually had a column for, never a zero standing in for
// "not reported" (a missing metric must never be silently treated as 0 —
// that would corrupt both comparisons and suggestion averages).
export interface ActualsRow {
  id: string;
  // Free text as imported — comparison/matching normalizes these against
  // the app's own vocabulary (MARKET_LABELS codes, Channel, Goal,
  // LinkedInFormat/AmazonFormat) where recognizable, but keeps the raw
  // string too so the import review can show exactly what was read.
  marketRaw: string;
  market?: string;
  channel: Channel;
  liFormat?: LinkedInFormat;
  amazonFormat?: AmazonFormat;
  goal?: Goal;
  campaignName?: string;
  startDate: string; // ISO 'YYYY-MM-DD'
  endDate: string; // ISO 'YYYY-MM-DD' — same as startDate for a single-day row
  spend: number;
  metrics: Partial<Record<ActualsMetricKey, number>>;
}

// A named, saved import batch — one client's historical performance data,
// built up over however many imports. Mirrors SavedPlan's shape/pattern
// in savedPlansStore.ts, and lives behind the same kind of store module
// so swapping localStorage for a real backend later touches one file.
export interface ActualsDataset {
  id: string;
  name: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  rows: ActualsRow[];
}
