// Canonical Search model for the Google Ads Bulk Upload spreadsheet format
// (Tools & Settings > Bulk Actions > Uploads), NOT Google Ads Editor's
// separate CSV import. Verified against six official templates downloaded
// from that bulk-upload screen (campaign_template, ad_group_template,
// keyword_template, ad_group_negative_keyword_template,
// responsive_search_ad_template, responsive_display_ad_template — the last
// one read only as a negative control to confirm Display/Search are
// genuinely separate row shapes).
//
// This module intentionally does NOT reuse GoogleCampaign/GoogleAd from
// ../types.ts — those carry YouTube/Demand Gen fields (video_id, long
// headlines, Description 5, cta, business name/logo) that must never leak
// into a Search row. searchBridge.ts converts a GoogleCampaign with
// channel === 'Search' into these typed entities.

export type BulkStatus = 'Enabled' | 'Paused' | 'Removed';
export type KeywordMatchType = 'Broad match' | 'Phrase match' | 'Exact match';
export type NegativeKeywordLevel = 'Ad group' | 'Campaign';

// Verified Search-safe subset of the Bid strategy type enum from
// campaign_template (the full template list also includes Target CPM,
// Target CPV, Fixed CPM, Viewable CPM, cpm, Commission, Target Position,
// Share of voice, Target Outranking Share, CPC% — all video/Hotel/legacy,
// excluded here on purpose).
export const SEARCH_BID_STRATEGIES = [
  'Manual CPC',
  'Maximize clicks',
  'Maximize Conversions',
  'Target CPA',
  'Maximize Conversion Value',
  'Target ROAS',
  'Target Impression Share',
] as const;
export type SearchBidStrategyType = (typeof SEARCH_BID_STRATEGIES)[number];

export const SEARCH_BUDGET_TYPES = ['Daily', 'Campaign Total', 'Monthly'] as const;
export type SearchBudgetType = (typeof SEARCH_BUDGET_TYPES)[number];

export interface SearchLocationTarget {
  /** Editor/Bulk Upload location name, e.g. "Portugal". */
  name: string;
  excluded: boolean;
}

export interface SearchCampaign {
  id: string;
  name: string;
  status: BulkStatus;
  budget: number;
  budgetType: SearchBudgetType;
  bidStrategyType: SearchBidStrategyType;
  /** Required only for Target CPA. */
  targetCpa?: number;
  /** Required only for Target ROAS — a percentage, e.g. 350 for 350%. */
  targetRoas?: number;
  /** Required only for Target Impression Share. */
  targetImpressionShare?: number;
  startDate: string;
  endDate: string;
  /** Always includes "Google search"; "Search partners" is an explicit opt-in. */
  searchPartners: boolean;
  /** Explicit opt-in only — appends "Display Network" to Networks. Off by default. */
  displayExpansionEnabled: boolean;
  locations: SearchLocationTarget[];
  /** Required on create per the verified template — never guessed. Blank
   *  means "not yet chosen" and must be blocked by the validator, never
   *  defaulted to Yes or No on the user's behalf. */
  euPoliticalAds: 'Yes' | 'No' | '';
  labels: string;
  trackingTemplate: string;
  finalUrlSuffix: string;
  customParameter: string;
}

export interface SearchAdGroup {
  id: string;
  campaignId: string;
  name: string;
  status: BulkStatus;
  /** Required when the campaign's bid strategy is Manual CPC. */
  defaultMaxCpc?: number;
}

export interface SearchKeyword {
  id: string;
  adGroupId: string;
  text: string;
  matchType: KeywordMatchType;
  status: BulkStatus;
  maxCpc?: number;
  finalUrl?: string;
  finalMobileUrl?: string;
}

export interface SearchNegativeKeyword {
  id: string;
  /** Ad group id when level is "Ad group"; campaign id when level is "Campaign". */
  scopeId: string;
  level: NegativeKeywordLevel;
  text: string;
  matchType: KeywordMatchType;
}

export interface SearchRsaHeadline {
  text: string;
  pin?: 1 | 2 | 3;
}

export interface SearchRsaDescription {
  text: string;
  pin?: 1 | 2;
}

export interface SearchRsa {
  id: string;
  adGroupId: string;
  status: BulkStatus;
  headlines: SearchRsaHeadline[];
  descriptions: SearchRsaDescription[];
  path1: string;
  path2: string;
  finalUrl: string;
  finalMobileUrl?: string;
  trackingTemplate?: string;
  finalUrlSuffix?: string;
  customParameter?: string;
}

export interface SearchCampaignBundle {
  campaign: SearchCampaign;
  adGroups: SearchAdGroup[];
  keywords: SearchKeyword[];
  negativeKeywords: SearchNegativeKeyword[];
  rsas: SearchRsa[];
}
