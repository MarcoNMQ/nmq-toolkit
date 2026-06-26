// Types for the Google Ads (YouTube/Demand Gen) campaign shape.
// Mirrors the dict shape that builder.py expects (see generate_campaign_name,
// build_campaign_row, build_adgroup_row, build_ad_row, validate_campaigns).

export interface GoogleAd {
  id: string;
  ad_name: string;
  video_id: string;
  headline_1: string;
  headline_2: string;
  headline_3: string;
  headline_4: string;
  headline_5: string;
  headline_6: string;
  headline_7: string;
  headline_8: string;
  headline_9: string;
  headline_10: string;
  headline_11: string;
  headline_12: string;
  headline_13: string;
  headline_14: string;
  headline_15: string;
  long_headline_1: string;
  long_headline_2: string;
  long_headline_3: string;
  long_headline_4: string;
  long_headline_5: string;
  description_1: string;
  description_2: string;
  description_3: string;
  description_4: string;
  description_5: string;
  cta?: string;
  final_url: string;
  // Search-ad-only (Channel = "Search"): the path segments appended after
  // the domain in the displayed URL, e.g. example.com/path1/path2. Unused
  // and left blank for Demand Gen/YouTube ads.
  path1?: string;
  path2?: string;
}

// Search-only. Google Ads Editor's CSV column for match type is literally
// "Criterion Type" with values Exact/Phrase/Broad — see builder.ts.
export interface GoogleKeyword {
  id: string;
  text: string;
  matchType: 'Broad' | 'Phrase' | 'Exact';
}

// Search-only sitelink extension. Campaign-level (the common case) leaves
// the exported "Ad group" column blank — see builder.ts.
export interface GoogleSitelink {
  id: string;
  linkText: string;
  description1: string;
  description2: string;
  finalUrl: string;
}

export interface GoogleCampaign {
  id: string;
  campaign_name: string;
  adset_name: string;
  channel: string;
  main_goal: string;
  perf_goal: string;
  month: string;
  // Empty string = generic free-text product fields. A known client name
  // (e.g. "Shimano") switches Product category/family/promoted to that
  // client's fixed taxonomy dropdowns instead — see CLIENT_TAXONOMIES.
  client_profile: string;
  product_category: string;
  product_subcategory: string;
  product_promoted: string;
  market: string;
  key_category: 'YES' | 'NO' | '';
  country_group: string;
  countries: string[];
  location_level: 'campaign' | 'adgroup';
  budget: number;
  bid_strategy: string;
  networks: string;
  languages: string;
  labels: string;
  start_date: string;
  end_date: string;
  max_cpc?: number;
  max_cpm?: number;
  target_cpv?: number;
  target_cpm?: number;
  cta?: string;
  ads: GoogleAd[];
  // Search-only — see GoogleKeyword/GoogleSitelink above. Empty arrays for
  // any other channel, simply unused.
  keywords: GoogleKeyword[];
  sitelinks: GoogleSitelink[];
}

// Types for the Facebook/Instagram campaign shape.
// Mirrors the dict shape that fb_builder.py expects.

export interface FbAd {
  id: string;
  ad_name: string;
  ad_status: string;
  title: string;
  body: string;
  link: string;
  link_description: string;
  display_link: string;
  image_file_name: string;
  creative_type: string;
  url_tags: string;
  cta: string;
}

export interface FbCampaign {
  id: string;
  campaign_name: string;
  campaign_status: string;
  campaign_objective: string;
  buying_type: string;
  campaign_bid_strategy: string;
  tags: string;
  campaign_start_time: string;
  campaign_stop_time: string;
  budget_type: 'Daily' | 'Lifetime';
  budget: number;

  adset_name: string;
  adset_status: string;
  adset_start_time: string;
  adset_stop_time: string;
  adset_budget_type: 'Daily' | 'Lifetime';
  adset_budget: number;

  countries: string[];
  gender: string;
  age_min?: number;
  age_max?: number;
  custom_audiences: string;
  excluded_custom_audiences: string;
  publisher_platforms: string[];
  device_platforms: string[];
  facebook_positions: string[];
  instagram_positions: string[];
  optimization_goal: string;
  billing_event: string;
  bid_amount?: number;
  adset_bid_strategy: string;
  adset_min_spend?: number;
  adset_max_spend?: number;

  ads: FbAd[];
}

export type Platform = 'google' | 'facebook';

export type SelectedView =
  | { type: 'welcome' }
  | { type: 'new_campaign' }
  | { type: 'campaign'; campaignId: string }
  | { type: 'adgroup'; campaignId: string }
  | { type: 'new_ad'; campaignId: string }
  | { type: 'ad'; campaignId: string; adId: string };
