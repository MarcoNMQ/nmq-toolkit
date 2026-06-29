// A single row of standardized ad data (one row = one day x campaign combination)
export interface AdRow {
  date: string; // YYYY-MM-DD
  campaign_name: string;
  adset_name?: string;
  ad_name?: string;
  platform: 'meta' | 'google_ads';
  country?: string;
  market?: string;
  channel?: string;
  funnel_stage?: 'awareness' | 'consideration' | 'conversion' | 'unknown';
  category?: string;
  product?: string;
  product_family?: string;
  key_family?: string;
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks?: number;
  landing_page_views?: number;
  engagements?: number;
  video_plays?: number;
  video_25?: number;
  video_50?: number;
  video_75?: number;
  video_100?: number;
  conversions?: number;
  revenue?: number;
  // Calculated
  ctr?: number;
  cpc?: number;
  cpm?: number;
  roas?: number;
  cvr?: number;
  vtr?: number; // video completion rate (video_100 / impressions)
}

// Aggregated KPIs for a time period or segment
export interface KpiBlock {
  spend: number;
  impressions: number;
  reach?: number;
  clicks: number;
  link_clicks?: number;
  landing_page_views?: number;
  engagements?: number;
  video_plays?: number;
  video_100?: number;
  conversions?: number;
  revenue?: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas?: number;
  cvr?: number;
  vtr?: number;
  frequency?: number;
}

// A data point in a time series (one entry per period label)
export interface TrendPoint {
  label: string; // e.g. "Jun 01", "Week 1"
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  video_plays: number;
  ctr: number;
  cpm: number;
}

// A row in the breakdown table (by category, channel, market, etc.)
export interface BreakdownRow {
  dim: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  video_plays: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas?: number;
}

// The full response from /api/dashboard/data
export interface DashboardData {
  client: string;
  refreshedAt: string; // ISO timestamp
  rows: AdRow[];
  // Pre-aggregated for fast rendering
  totals: KpiBlock;
  byFunnelStage: Record<string, KpiBlock>;
  trend: TrendPoint[];
  breakdown: BreakdownRow[];
}

// Active filter state (client-side)
export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  platforms: Array<'meta' | 'google_ads'>;
  channels: string[];
  markets: string[];
  funnelStages: Array<'awareness' | 'consideration' | 'conversion'>;
  breakdownDim: 'category' | 'channel' | 'market' | 'product_family';
}

// Client config entry — one per client in the registry
export interface ClientConfig {
  id: string;
  name: string;
  accentColor: string;
  sheetId: string;
  sheets: Array<{
    tabName: string;
    platform: 'meta' | 'google_ads';
    columnMap: Record<string, keyof AdRow>;
    funnelStageMap?: Record<string, AdRow['funnel_stage']>;
    // If a column holds the funnel stage under a non-standard name, set this
    funnelStageColumn?: string;
    // For google_ads: derive funnel_stage from channel value
    channelToFunnelStage?: Record<string, AdRow['funnel_stage']>;
  }>;
  phases: {
    awareness: { color: string; label: string };
    consideration: { color: string; label: string };
    conversion: { color: string; label: string };
  };
  breakdownDimLabel: string;
  defaultBreakdownDim: DashboardFilters['breakdownDim'];
}
