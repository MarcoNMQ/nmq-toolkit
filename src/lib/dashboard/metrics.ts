export type MetricKey =
  | 'impressions' | 'reach' | 'clicks' | 'spend'
  | 'link_clicks' | 'landing_page_views' | 'engagements'
  | 'video_plays' | 'video_100' | 'conversions' | 'revenue'
  | 'ctr' | 'cpc' | 'cpm' | 'roas' | 'cvr' | 'vtr';

type MetricFormat = 'int' | 'eur' | 'pct' | 'x' | 'dec';
type MetricCategory = 'delivery' | 'video' | 'conversion' | 'rate';

export interface MetricDef {
  label: string;
  shortLabel: string;
  format: MetricFormat;
  category: MetricCategory;
  order: number;
  description: string;
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  impressions:        { label: 'Impressions',       shortLabel: 'Impr.',    format: 'int', category: 'delivery',   order: 1,  description: 'How many times your ads were shown. The raw reach figure — good for awareness but says nothing about quality.' },
  reach:              { label: 'Reach',             shortLabel: 'Reach',    format: 'int', category: 'delivery',   order: 1.5, description: 'Unique people who saw your ad at least once. Unlike impressions, this does not double-count repeat views — the true audience-size metric for awareness.' },
  clicks:             { label: 'Clicks',             shortLabel: 'Clicks',   format: 'int', category: 'delivery',   order: 2,  description: 'How many times someone clicked your ad. The primary volume metric for traffic and lead gen campaigns.' },
  spend:              { label: 'Spend',              shortLabel: 'Spend',    format: 'eur', category: 'delivery',   order: 3,  description: 'Total budget consumed. Watch this against your pacing target to catch under- or over-delivery early.' },
  link_clicks:        { label: 'Link Clicks',        shortLabel: 'L.Clicks', format: 'int', category: 'delivery',   order: 4,  description: 'Clicks specifically on links within your ad, as reported by social platforms. Usually lower than total clicks.' },
  landing_page_views: { label: 'LP Views',           shortLabel: 'LPV',      format: 'int', category: 'delivery',   order: 5,  description: 'Users who actually loaded your landing page. Lower than clicks because some users click but bounce before the page loads.' },
  engagements:        { label: 'Engagements',        shortLabel: 'Eng.',     format: 'int', category: 'delivery',   order: 6,  description: 'Likes, comments, shares, reactions, and saves. Core quality signal for social awareness and consideration ads.' },
  video_plays:        { label: 'Video Plays',        shortLabel: 'V.Plays',  format: 'int', category: 'video',      order: 7,  description: 'Number of times your video started playing, including auto-play. A high-level reach metric for video campaigns.' },
  video_100:          { label: 'Completions',        shortLabel: 'Compl.',   format: 'int', category: 'video',      order: 8,  description: 'Users who watched 100% of your video. Key quality signal — a high completion rate means the creative holds attention.' },
  conversions:        { label: 'Conversions',        shortLabel: 'Conv.',    format: 'int', category: 'conversion', order: 9,  description: 'Goal completions: form fills, purchases, sign-ups, or whatever event you\'re tracking as a conversion.' },
  revenue:            { label: 'Revenue',            shortLabel: 'Rev.',     format: 'eur', category: 'conversion', order: 10, description: 'Total attributed revenue from your ads. Pair with ROAS to assess e-commerce efficiency.' },
  ctr:                { label: 'CTR',                shortLabel: 'CTR',      format: 'pct', category: 'rate',       order: 11, description: 'Click-through rate — clicks ÷ impressions. Measures how relevant your creative and audience targeting are.' },
  cpc:                { label: 'CPC',                shortLabel: 'CPC',      format: 'eur', category: 'rate',       order: 12, description: 'Cost per click — spend ÷ clicks. Lower is better for traffic and lead gen. High CPC can signal strong competition or weak CTR.' },
  cpm:                { label: 'CPM',                shortLabel: 'CPM',      format: 'eur', category: 'rate',       order: 13, description: 'Cost per 1,000 impressions — the reach efficiency metric. Lower CPM means you\'re buying reach more cheaply. Core for awareness campaigns.' },
  roas:               { label: 'ROAS',               shortLabel: 'ROAS',     format: 'x',   category: 'conversion', order: 14, description: 'Return on ad spend — revenue ÷ spend. A ROAS of 4× means €4 revenue per €1 spent. The main e-commerce efficiency metric.' },
  cvr:                { label: 'CVR',                shortLabel: 'CVR',      format: 'pct', category: 'rate',       order: 15, description: 'Conversion rate — conversions ÷ clicks. Shows how well your landing page or checkout funnel is converting traffic into results.' },
  vtr:                { label: 'VTR',                shortLabel: 'VTR',      format: 'pct', category: 'video',      order: 16, description: 'View-through rate — completions ÷ impressions. Core quality metric for video. Higher VTR means the creative grabs and holds attention.' },
};

export const METRIC_CATEGORIES: Array<{ key: MetricCategory; label: string }> = [
  { key: 'delivery',   label: 'Delivery' },
  { key: 'video',      label: 'Video' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'rate',       label: 'Rates' },
];

export function formatMetric(key: MetricKey, val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  const fmt = METRIC_DEFS[key]?.format ?? 'dec';
  switch (fmt) {
    case 'int':
      return val >= 1_000_000
        ? `${(val / 1_000_000).toFixed(1)}M`
        : val >= 1_000
        ? `${(val / 1_000).toFixed(0)}K`
        : val.toLocaleString('en-GB', { maximumFractionDigits: 0 });
    case 'eur':
      return val >= 1_000
        ? `€${(val / 1_000).toFixed(1)}K`
        : `€${val.toFixed(2)}`;
    case 'pct': return `${(val * 100).toFixed(2)}%`;
    case 'x':   return `${val.toFixed(2)}x`;
    case 'dec': return val.toFixed(2);
  }
}

// ── KPI Matrix defaults (sourced from kpi_matrix.py) ────────────────────────
// Reflects core/secondary KPIs per channel × phase combination.
// When a single phase is active, phase-specific defaults win over channel-only.
// CTR/CPC are explicitly diagnostic at awareness stage per the KPI matrix.

export function defaultMetricsForChannels(channels: string[], phases: string[] = []): MetricKey[] {
  const singlePhase = phases.length === 1 ? phases[0] : null;

  const has = (re: RegExp) => channels.some((ch) => re.test(ch));
  const isVideo    = has(/youtube|demand.?gen|video/i);
  const isSearch   = has(/search|pmax|performance.?max/i);
  const isShopping = has(/shopping/i);
  const isLinkedIn = has(/linkedin/i);
  const isSocial   = has(/facebook|instagram|meta|tiktok|social/i);

  // ── Single phase active → phase-first defaults ──────────────────────────
  if (singlePhase === 'awareness') {
    // YouTube / video / social: CPM, VTR, Views are core; CTR is diagnostic
    if (isVideo || isSocial) return ['impressions', 'spend', 'cpm', 'video_plays', 'vtr', 'engagements'];
    // LinkedIn awareness: CPM, Reach, Frequency, VTR (video)
    if (isLinkedIn)          return ['impressions', 'spend', 'cpm', 'engagements', 'vtr'];
    // Display / other: CPM, Impressions (not CTR)
    return ['impressions', 'cpm', 'spend'];
  }

  if (singlePhase === 'consideration') {
    // LinkedIn consideration: Engagement Rate is core
    if (isLinkedIn)  return ['clicks', 'ctr', 'cpc', 'engagements', 'landing_page_views', 'spend'];
    // YouTube / Demand Gen consideration: Clicks, CTR, CPC, LPV
    if (isVideo)     return ['clicks', 'ctr', 'cpc', 'landing_page_views', 'video_plays', 'spend'];
    // Search / Display consideration
    return ['clicks', 'ctr', 'cpc', 'landing_page_views', 'impressions', 'spend'];
  }

  if (singlePhase === 'conversion') {
    // Search / Shopping / PMax: CPA, Conversions, CVR, CPC, ROAS
    if (isSearch || isShopping) return ['conversions', 'cvr', 'cpc', 'roas', 'clicks', 'spend'];
    // LinkedIn Lead Gen / others
    return ['conversions', 'cvr', 'cpc', 'clicks', 'spend'];
  }

  // ── No phase filter or multi-phase → channel-only defaults ──────────────
  if (!channels.length)  return ['impressions', 'spend', 'clicks', 'ctr', 'cpm'];
  if (isVideo)           return ['impressions', 'spend', 'video_plays', 'video_100', 'vtr', 'cpm'];
  if (isSearch)          return ['impressions', 'clicks', 'spend', 'ctr', 'cpc', 'conversions'];
  if (isShopping)        return ['impressions', 'clicks', 'spend', 'conversions', 'roas', 'cpc'];
  if (isLinkedIn)        return ['impressions', 'spend', 'clicks', 'ctr', 'cpm', 'engagements'];
  if (isSocial)          return ['impressions', 'spend', 'clicks', 'ctr', 'cpm', 'link_clicks'];
  return ['impressions', 'spend', 'clicks', 'ctr', 'cpm'];
}
