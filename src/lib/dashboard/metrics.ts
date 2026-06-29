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

// Default metrics per channel name pattern
const CHANNEL_METRIC_DEFAULTS: Array<{ pattern: RegExp; metrics: MetricKey[] }> = [
  { pattern: /youtube|demand.?gen|video/i,     metrics: ['impressions', 'spend', 'video_plays', 'video_100', 'vtr', 'cpm'] },
  { pattern: /search|pmax|performance.?max/i,  metrics: ['impressions', 'clicks', 'spend', 'ctr', 'cpc', 'conversions'] },
  { pattern: /shopping/i,                      metrics: ['impressions', 'clicks', 'spend', 'conversions', 'roas', 'cpc'] },
  { pattern: /linkedin/i,                      metrics: ['impressions', 'spend', 'clicks', 'ctr', 'cpm', 'engagements'] },
  { pattern: /facebook|instagram|meta|social/i, metrics: ['impressions', 'spend', 'clicks', 'ctr', 'cpm', 'link_clicks'] },
];

const DEFAULT_METRICS: MetricKey[] = ['impressions', 'spend', 'clicks', 'ctr', 'cpm'];

export function defaultMetricsForChannels(channels: string[]): MetricKey[] {
  if (!channels.length) return DEFAULT_METRICS;
  for (const ch of channels) {
    for (const { pattern, metrics } of CHANNEL_METRIC_DEFAULTS) {
      if (pattern.test(ch)) return metrics;
    }
  }
  return DEFAULT_METRICS;
}
