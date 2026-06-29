import type { AdRow } from './types';

// Canonical KPI field → list of column header aliases (lowercase, trimmed)
export const COLUMN_ALIASES: Partial<Record<keyof AdRow, string[]>> = {
  date:               ['date', 'day', 'period', 'week', 'month', 'reporting date', 'report date', 'data date'],
  campaign_name:      ['campaign', 'campaign name', 'campaign id', 'campaign_name'],
  adset_name:         ['ad set', 'adset', 'ad set name', 'ad group', 'ad group name', 'adgroup'],
  ad_name:            ['ad name', 'ad', 'creative', 'creative name', 'ad_name'],
  platform:           ['platform', 'source', 'network', 'ad network'],
  channel:            ['channel', 'media type', 'placement', 'campaign type', 'channel_name', 'media channel'],
  market:             ['market', 'market code', 'country code'],
  country:            ['country', 'country name', 'geo', 'region', 'location'],
  category:           ['category', 'product category', 'vertical', 'product_category', 'key categories', 'campaign bucket'],
  product:            ['product', 'product name', 'product name (clean)', 'product name (raw)', 'item', 'sku'],
  product_family:     ['product family', 'family', 'product group', 'product_family'],
  key_family:         ['key family', 'key product', 'key_family'],
  funnel_stage:       ['funnel stage', 'funnel', 'objective', 'optimization goal', 'goal', 'campaign objective', 'funnel_stage', 'marketing objective'],
  spend:              ['spend', 'amount spent', 'amount spent (eur)', 'amount spent (usd)', 'cost', 'cost (*)', 'budget spent', 'total cost', 'total spend', 'advertising cost', 'ad spend'],
  impressions:        ['impressions', 'impr.', 'impr', 'total impressions', 'impression'],
  // "clicks (all)" and "clicks (destination)" both strip to "clicks" via normalize — handled by ordering
  clicks:             ['clicks', 'clicks (all)', 'all clicks', 'total clicks', 'click'],
  // Platform-specific link click names — listed before the generic "link clicks" fallback
  link_clicks:        ['link clicks', 'clicks (destination)', 'destination clicks', 'outbound clicks', 'website clicks', 'link click', 'url clicks'],
  landing_page_views: ['landing page views', 'lpv', 'landing pages', 'page views', 'landing page view'],
  engagements:        ['engagements', 'post engagement', 'post engagements', 'total engagements', 'interactions', 'engagement'],
  video_plays:        [
    'video plays', 'video views', 'views', 'video play', 'video starts',
    '3-second video views', '2-second video views', '6-second video views',
    'total video watched actions', 'thruplay', 'thruplays', 'video_plays',
  ],
  video_25:           ['video watches at 25%', 'views (25%)', 'video 25%', '25% video views', 'video_25'],
  video_50:           ['video watches at 50%', 'views (50%)', 'video 50%', '50% video views', 'video_50'],
  video_75:           ['video watches at 75%', 'views (75%)', 'video 75%', '75% video views', 'video_75'],
  video_100:          [
    'video watches at 100%', 'views (100%)', 'video 100%', 'completed views',
    'video completions', '100% video views', 'video_100', 'video complete',
    'completed video views', 'video completion',
  ],
  conversions:        [
    'conversions', 'results', 'total conversions', 'website conversions',
    'purchases', 'website purchases', 'complete payment', 'total results',
    'leads', 'goal completions', 'conversion', 'purchase',
  ],
  revenue:            ['revenue', 'conversion value', 'purchase conversion value', 'total value', 'purchase value', 'sales', 'transaction value'],
  // Pre-calculated rate columns — platforms like TikTok, Meta, LinkedIn export these ready-made
  ctr:                ['ctr', 'click through rate', 'click-through rate', 'ctr (link click-through rate)', 'ctr (all)', 'ctr (destination)', 'click-through rate (ctr)'],
  cpc:                ['cpc', 'cost per click', 'cost per link click', 'avg. cpc', 'cpc (destination)', 'cost per destination click', 'cost per all click'],
  cpm:                ['cpm', 'cost per 1000 impressions', 'cost per 1,000 impressions', 'cost per mille', 'cost per 1000 reached', 'cost per 1,000 reached', 'cpm (cost per mille)'],
  roas:               ['roas', 'return on ad spend', 'purchase roas', 'website purchase roas', 'website purchase roas (return on ad spend)', 'return on investment', 'roi'],
  cvr:                ['cvr', 'conversion rate', 'conv. rate', 'result rate', 'purchase rate', 'click to conversion rate'],
  vtr:                ['vtr', 'video completion rate', 'video through rate', 'view through rate', 'vcr', 'video view rate', 'complete video rate'],
};

// Which fields are numeric (vs string/date)
export const NUMERIC_FIELDS = new Set<keyof AdRow>([
  'spend', 'impressions', 'clicks', 'link_clicks', 'landing_page_views',
  'engagements', 'video_plays', 'video_25', 'video_50', 'video_75', 'video_100',
  'conversions', 'revenue', 'ctr', 'cpc', 'cpm', 'roas', 'cvr', 'vtr',
]);

// Fields we want to auto-calculate — skip if they come pre-calculated (avoid double-calculating)
export const DERIVED_FIELDS = new Set<keyof AdRow>(['ctr', 'cpc', 'cpm', 'roas', 'cvr', 'vtr']);

export interface ColumnMapping {
  rawColumn: string;
  stdField: keyof AdRow;
  confidence: 'auto' | 'manual';
}

export interface DetectionResult {
  mapped: ColumnMapping[];
  unmapped: string[]; // raw columns we couldn't map
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')   // strip parenthetical suffixes, e.g. (eur), (cost per click), (destination)
    .replace(/[^a-z0-9 ]/g, ' ')    // remove remaining special chars
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectColumns(rawColumns: string[]): DetectionResult {
  const mapped: ColumnMapping[] = [];
  const usedStdFields = new Set<keyof AdRow>();
  const usedRawCols = new Set<string>();

  // First pass: exact match
  for (const raw of rawColumns) {
    const norm = normalize(raw);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof AdRow, string[]][]) {
      if (usedStdFields.has(field)) continue;
      if (aliases.includes(norm)) {
        mapped.push({ rawColumn: raw, stdField: field, confidence: 'auto' });
        usedStdFields.add(field);
        usedRawCols.add(raw);
        break;
      }
    }
  }

  // Second pass: partial/contains match for anything not yet mapped
  for (const raw of rawColumns) {
    if (usedRawCols.has(raw)) continue;
    const norm = normalize(raw);
    let bestField: keyof AdRow | null = null;
    let bestScore = 0;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof AdRow, string[]][]) {
      if (usedStdFields.has(field)) continue;
      for (const alias of aliases) {
        if (norm.includes(alias) || alias.includes(norm)) {
          // Prefer longer alias matches (more specific)
          const score = Math.min(norm.length, alias.length) / Math.max(norm.length, alias.length);
          if (score > bestScore && score > 0.5) {
            bestScore = score;
            bestField = field;
          }
        }
      }
    }

    if (bestField) {
      mapped.push({ rawColumn: raw, stdField: bestField, confidence: 'auto' });
      usedStdFields.add(bestField);
      usedRawCols.add(raw);
    }
  }

  const unmapped = rawColumns.filter((c) => !usedRawCols.has(c));
  return { mapped, unmapped };
}

// Channel name → funnel stage (fallback when no explicit funnel_stage column)
const CHANNEL_TO_STAGE: Record<string, AdRow['funnel_stage']> = {
  youtube:         'awareness',
  video:           'awareness',
  display:         'awareness',
  facebook:        'awareness',
  instagram:       'awareness',
  'demand gen':    'consideration',
  demandgen:       'consideration',
  search:          'consideration',
  linkedin:        'consideration',
  shopping:        'conversion',
  'performance max': 'conversion',
  pmax:            'conversion',
  'smart shopping': 'conversion',
};

const FUNNEL_STAGE_KEYWORDS: Record<AdRow['funnel_stage'] & string, string[]> = {
  awareness:     ['awareness', 'reach', 'brand', 'impressions', 'branding', 'awa'],
  consideration: ['consideration', 'traffic', 'engagement', 'link clicks', 'video views', 'con', 'cns'],
  conversion:    ['conversion', 'purchase', 'lead', 'sales', 'conv', 'cvr', 'retargeting'],
  unknown:       [],
};

export function inferFunnelStage(row: Record<string, string>): AdRow['funnel_stage'] {
  // If funnel_stage is directly mapped and has a value, normalise it
  const raw = row.__funnel_stage ?? '';
  if (raw) {
    const norm = raw.toLowerCase().trim();
    for (const [stage, keywords] of Object.entries(FUNNEL_STAGE_KEYWORDS)) {
      if (keywords.some((k) => norm.includes(k))) return stage as AdRow['funnel_stage'];
    }
  }

  // Fall back to channel
  const channel = (row.__channel ?? '').toLowerCase().trim();
  for (const [k, stage] of Object.entries(CHANNEL_TO_STAGE)) {
    if (channel.includes(k)) return stage;
  }

  return 'unknown';
}

export function applyMapping(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping[]
): AdRow[] {
  const result: AdRow[] = [];

  for (const rawRow of rawRows) {
    const row: Record<string, unknown> = {
      platform: 'meta' as AdRow['platform'], // default; overridden if column present
      spend: 0,
      impressions: 0,
      clicks: 0,
    };

    // Remap values according to confirmed mapping
    for (const { rawColumn, stdField } of mapping) {
      const val = rawRow[rawColumn];
      if (val === undefined || val === null || val === '') continue;

      if (stdField === 'date') {
        // Normalise date
        const d = new Date(val);
        row.date = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : val;
      } else if (NUMERIC_FIELDS.has(stdField)) {
        const n = parseFloat(String(val).replace(/,/g, '').trim());
        row[stdField] = isNaN(n) ? 0 : n;
      } else {
        row[stdField] = val;
      }
    }

    // Stash raw channel/funnel_stage for inference
    const channelMapping = mapping.find((m) => m.stdField === 'channel');
    const stageMapping = mapping.find((m) => m.stdField === 'funnel_stage');
    const inferCtx: Record<string, string> = {
      __channel: channelMapping ? String(rawRow[channelMapping.rawColumn] ?? '') : '',
      __funnel_stage: stageMapping ? String(rawRow[stageMapping.rawColumn] ?? '') : '',
    };
    row.funnel_stage = inferFunnelStage(inferCtx);

    // Normalise multi-product rows
    if (row.product && row.category) {
      if (String(row.product).trim().toLowerCase() === String(row.category).trim().toLowerCase()) {
        row.product = 'Multi-product';
      }
    }

    // Auto-derive KPIs if not already present
    const imp = Number(row.impressions ?? 0);
    const clk = Number(row.clicks ?? 0);
    const spd = Number(row.spend ?? 0);
    const conv = Number(row.conversions ?? 0);
    const v100 = Number(row.video_100 ?? 0);
    const rev = Number(row.revenue ?? 0);

    if (!row.ctr)  row.ctr  = imp  > 0 ? clk  / imp  : 0;
    if (!row.cpc)  row.cpc  = clk  > 0 ? spd  / clk  : 0;
    if (!row.cpm)  row.cpm  = imp  > 0 ? spd  / imp  * 1000 : 0;
    if (!row.cvr && conv)  row.cvr  = clk > 0 ? conv / clk  : 0;
    if (!row.roas && rev)  row.roas = spd > 0 ? rev  / spd  : 0;
    if (!row.vtr  && v100) row.vtr  = imp > 0 ? v100 / imp  : 0;

    // Skip rows with no date or no spend/impressions
    if (!row.date || (imp === 0 && Number(row.spend ?? 0) === 0)) continue;

    result.push(row as unknown as AdRow);
  }

  return result;
}
