// Canonical Performance Max model. Deliberately independent of
// GoogleCampaign/GoogleAd (../types.ts) and of the Search model
// (../google/searchTypes.ts) — PMAX has no ad groups, no keywords, no RSAs,
// and must never inherit Search/YouTube/Demand Gen fields or defaults. See
// "Google PMAX Builder Extension.md" for the full spec this implements.
//
// P0 scope: Standard PMAX only. Retail/Merchant Center types are defined
// below so the discriminated union is complete and future code doesn't need
// a breaking change to add them, but nothing in pmaxValidation.ts or
// pmaxPackageBuilder.ts reads or validates them yet — Retail needs a
// Merchant Center-linked account and its own verified fixtures, same reason
// Search sitelinks are still gated on a missing bulk-upload template.

export type PmaxVariant = 'standard' | 'retail';
export type PmaxStatus = 'Enabled' | 'Paused' | 'Removed';

// Only these two bidding families are ever valid for PMAX — Manual CPC,
// Maximize Clicks, Target Impression Share, CPM, CPV and portfolio
// strategies are all Search/Display/Video concepts that don't apply here.
export type PmaxBidStrategyType = 'Maximize Conversions' | 'Maximize Conversion Value';

export interface PmaxBudget {
  /** Always a positive, non-shared, average daily amount for P0 — PMAX
   *  never exposes a campaign-total budget. */
  amount: number;
}

export interface PmaxConversionGoalSelection {
  mode: 'account_default' | 'campaign_specific';
  /** Free-text goal names the user intends to use. A name here is NOT proof
   *  the conversion action exists in the destination account — see
   *  `unresolved` and the manual manifest. */
  goalNames: string[];
  /** True until this is resolved against a real Google Ads account — there's
   *  no account connection in this app, so this is always true for now and
   *  conversion-goal readiness always lands in the manual checklist. */
  unresolved: boolean;
}

export interface PmaxBrandGuidelines {
  enabled: boolean;
}

export interface PmaxAssetAutomation {
  /** On by default for new PMAX campaigns, per Google's current behavior. */
  finalUrlExpansion: boolean;
  textCustomization: boolean;
  /** URL substrings/paths Final URL expansion must never redirect into. */
  urlExclusions: string[];
}

export type PmaxLocationMode = 'presence' | 'presence_or_interest';

export interface PmaxLocationTarget {
  name: string;
  excluded: boolean;
}

export type PmaxLifecycleMode = 'inherit' | 'campaign_override';

export interface PmaxLifecycleConfig {
  mode: PmaxLifecycleMode;
  newCustomerAcquisitionEnabled: boolean;
  /** Required by Google when acquisition bidding is enabled — "bid higher
   *  for new customers" only works under value-based bidding. */
  newCustomerValueAdjustmentPct?: number;
  retentionEnabled: boolean;
  /** Customer Match list names this depends on. Free text until there's an
   *  account connection to resolve them against — see manual manifest. */
  requiredCustomerMatchLists: string[];
}

export type PmaxAssetRole =
  | 'headline'
  | 'long_headline'
  | 'description'
  | 'business_name'
  | 'marketing_image_landscape'
  | 'marketing_image_square'
  | 'marketing_image_portrait'
  | 'logo_square'
  | 'logo_landscape'
  | 'youtube_video';

export const PMAX_TEXT_ROLES = ['headline', 'long_headline', 'description', 'business_name'] as const;
export const PMAX_IMAGE_ROLES = ['marketing_image_landscape', 'marketing_image_square', 'marketing_image_portrait', 'logo_square', 'logo_landscape'] as const;

/**
 * One physical asset, stored once and linked by role from either a
 * PmaxCampaignAssetLink (brand-guideline scope) or a
 * PmaxAssetGroupAssetLink (creative scope) — never duplicated per link.
 * Text assets carry `text`; image/video assets carry the metadata extracted
 * at attach time (see pmaxAssetValidation.ts) instead of raw bytes, the same
 * by-reference pattern this app already uses for Facebook image_hash and
 * Search sitelinks — there's no binary file-storage backend here.
 */
export interface PmaxAsset {
  id: string;
  role: PmaxAssetRole;
  text?: string;
  sourceFilename?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  /** SHA-256 hex digest of the decoded file, computed server-side at
   *  attach time — not trusted from the client. */
  checksum?: string;
  /** 11-character YouTube video ID, for role === 'youtube_video'. */
  youtubeVideoId?: string;
  youtubeUrl?: string;
}

export interface PmaxCampaignAssetLink {
  id: string;
  assetId: string;
}

export interface PmaxAssetGroup {
  id: string;
  campaignId: string;
  name: string;
  status: PmaxStatus;
  finalUrl: string;
  finalMobileUrl?: string;
  path1: string;
  path2: string;
  trackingTemplate?: string;
  finalUrlSuffix?: string;
  customParameter?: string;
  /** Automated by default — exact Editor CTA tokens are fixture-gated. */
  cta: string;
}

export interface PmaxAssetGroupAssetLink {
  id: string;
  assetGroupId: string;
  assetId: string;
}

export type PmaxSignalKind = 'audience' | 'search_theme';

export interface PmaxAssetGroupSignal {
  id: string;
  assetGroupId: string;
  kind: PmaxSignalKind;
  /** Resolved audience-resource reference (name only — not account-verified). */
  audienceRef?: string;
  searchThemeText?: string;
}

// ---- Retail/Merchant Center — defined, intentionally unused in P0 ---------

export type PmaxRetailMode = 'feed_generated_assets_only' | 'custom_assets_complete';

export interface PmaxRetailSettings {
  merchantCenterId: string;
  merchantAccountLinkVerified: boolean;
  merchantWebsiteDomain: string;
  feedLabel?: string;
  campaignPriority?: number;
  localInventoryEnabled: boolean;
  mode: PmaxRetailMode;
}

export type PmaxListingGroupNodeType = 'root' | 'subdivision' | 'unit';
export type PmaxListingGroupInclusion = 'include' | 'exclude';
export type PmaxListingGroupDimension = 'category' | 'brand' | 'item_id' | 'condition' | 'product_type' | 'channel' | 'custom_label';

export interface PmaxListingGroupNode {
  id: string;
  assetGroupId: string;
  parentId: string | null;
  type: PmaxListingGroupNodeType;
  inclusion: PmaxListingGroupInclusion;
  dimension?: PmaxListingGroupDimension;
  /** The specific value for this dimension, or undefined for the `Other`
   *  catch-all child every subdivision must have. */
  value?: string;
}

export interface PmaxManualManifestItem {
  category: string;
  description: string;
}

/**
 * The full canonical PMAX campaign, as stored (store.ts holds
 * `pmaxCampaigns: PmaxCampaign[]` as its own parallel collection — never
 * bolted onto GoogleCampaign).
 */
export interface PmaxCampaign {
  id: string;
  name: string;
  variant: PmaxVariant;
  status: PmaxStatus;
  budget: PmaxBudget;
  bidStrategyType: PmaxBidStrategyType;
  targetCpa?: number;
  targetRoas?: number;
  startDate: string;
  endDate: string;
  locations: PmaxLocationTarget[];
  locationMode: PmaxLocationMode;
  /** Required on create, same reasoning as Search — never defaulted. */
  euPoliticalAds: 'Yes' | 'No' | '';
  labels: string;
  trackingTemplate: string;
  finalUrlSuffix: string;
  customParameter: string;
  conversionGoal: PmaxConversionGoalSelection;
  brandGuidelines: PmaxBrandGuidelines;
  assetAutomation: PmaxAssetAutomation;
  lifecycle: PmaxLifecycleConfig;

  /** All assets owned by this campaign, text and media alike. */
  assets: PmaxAsset[];
  /** Campaign-level (brand-guideline) asset links — business name + logos. */
  campaignAssetLinks: PmaxCampaignAssetLink[];

  assetGroups: PmaxAssetGroup[];
  assetGroupAssetLinks: PmaxAssetGroupAssetLink[];
  signals: PmaxAssetGroupSignal[];

  /** Retail-only. Always undefined when variant === 'standard'. */
  retail?: PmaxRetailSettings;
  listingGroupNodes?: PmaxListingGroupNode[];
}

/** The unit pmaxValidation/pmaxPackageBuilder operate on — one campaign plus
 *  everything scoped to it, flattened for convenience (mirrors the Search
 *  bundle shape in google/searchTypes.ts). */
export interface PmaxCampaignBundle {
  campaign: PmaxCampaign;
}
