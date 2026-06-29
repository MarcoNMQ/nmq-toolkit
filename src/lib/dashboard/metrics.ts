export type MetricKey =
  | 'impressions' | 'clicks' | 'spend'
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
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  impressions:        { label: 'Impressions',       shortLabel: 'Impr.',    format: 'int', category: 'delivery',   order: 1 },
  clicks:             { label: 'Clicks',             shortLabel: 'Clicks',   format: 'int', category: 'delivery',   order: 2 },
  spend:              { label: 'Spend',              shortLabel: 'Spend',    format: 'eur', category: 'delivery',   order: 3 },
  link_clicks:        { label: 'Link Clicks',        shortLabel: 'L.Clicks', format: 'int', category: 'delivery',   order: 4 },
  landing_page_views: { label: 'LP Views',           shortLabel: 'LPV',      format: 'int', category: 'delivery',   order: 5 },
  engagements:        { label: 'Engagements',        shortLabel: 'Eng.',     format: 'int', category: 'delivery',   order: 6 },
  video_plays:        { label: 'Video Plays',        shortLabel: 'V.Plays',  format: 'int', category: 'video',      order: 7 },
  video_100:          { label: 'Completions',        shortLabel: 'Compl.',   format: 'int', category: 'video',      order: 8 },
  conversions:        { label: 'Conversions',        shortLabel: 'Conv.',    format: 'int', category: 'conversion', order: 9 },
  revenue:            { label: 'Revenue',            shortLabel: 'Rev.',     format: 'eur', category: 'conversion', order: 10 },
  ctr:                { label: 'CTR',                shortLabel: 'CTR',      format: 'pct', category: 'rate',       order: 11 },
  cpc:                { label: 'CPC',                shortLabel: 'CPC',      format: 'eur', category: 'rate',       order: 12 },
  cpm:                { label: 'CPM',                shortLabel: 'CPM',      format: 'eur', category: 'rate',       order: 13 },
  roas:               { label: 'ROAS',               shortLabel: 'ROAS',     format: 'x',   category: 'conversion', order: 14 },
  cvr:                { label: 'CVR',                shortLabel: 'CVR',      format: 'pct', category: 'rate',       order: 15 },
  vtr:                { label: 'VTR',                shortLabel: 'VTR',      format: 'pct', category: 'video',      order: 16 },
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
