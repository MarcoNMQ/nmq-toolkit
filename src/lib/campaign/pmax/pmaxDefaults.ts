import type { PmaxBidStrategyType, PmaxCampaign } from './pmaxTypes';

export const PMAX_BID_STRATEGIES: readonly PmaxBidStrategyType[] = ['Maximize Conversions', 'Maximize Conversion Value'] as const;

export function bidStrategyNeedsTargetCpa(strategy: string): boolean {
  return strategy === 'Maximize Conversions';
}
export function bidStrategyNeedsTargetRoas(strategy: string): boolean {
  return strategy === 'Maximize Conversion Value';
}

// Image/logo specs from the PMAX report — minimums, recommendations and
// required ratios, keyed by asset role. Ratios are width/height.
export const PMAX_IMAGE_SPECS = {
  marketing_image_landscape: { ratio: 1.91, minWidth: 600, minHeight: 314, recommendMinCount: 4, maxCount: 20 },
  marketing_image_square: { ratio: 1, minWidth: 300, minHeight: 300, recommendMinCount: 4, maxCount: 20 },
  marketing_image_portrait: { ratio: 4 / 5, minWidth: 480, minHeight: 600, recommendMinCount: 2, maxCount: 20 },
  logo_square: { ratio: 1, minWidth: 128, minHeight: 128, recommendMinCount: 1, maxCount: 5 },
  logo_landscape: { ratio: 4, minWidth: 512, minHeight: 128, recommendMinCount: 1, maxCount: 5 },
} as const;

export const PMAX_MAX_IMAGE_FILE_SIZE_KB = 5120;
export const PMAX_RATIO_TOLERANCE = 0.03; // ±3% to allow for ordinary rounding in exported images

export const PMAX_MAX_VIDEOS = 15;
export const PMAX_MIN_VIDEO_DURATION_SECONDS = 10;

export const PMAX_MAX_ASSET_GROUPS = 100;
export const PMAX_ASSET_GROUP_NAME_MAX_LENGTH = 128;

export const PMAX_HEADLINE_MIN = 3;
export const PMAX_HEADLINE_MAX = 15;
export const PMAX_HEADLINE_MAX_CHARS = 30;
export const PMAX_HEADLINE_RECOMMEND_MIN = 11;

export const PMAX_LONG_HEADLINE_MIN = 1;
export const PMAX_LONG_HEADLINE_MAX = 5;
export const PMAX_LONG_HEADLINE_MAX_CHARS = 90;
export const PMAX_LONG_HEADLINE_RECOMMEND_MIN = 2;

export const PMAX_DESCRIPTION_MIN = 2;
export const PMAX_DESCRIPTION_MAX = 5;
export const PMAX_DESCRIPTION_MAX_CHARS = 90;
export const PMAX_DESCRIPTION_SHORT_MAX_CHARS = 60;
export const PMAX_DESCRIPTION_RECOMMEND_MIN = 4;

export const PMAX_BUSINESS_NAME_MAX_CHARS = 25;

export const PMAX_MAX_SEARCH_THEMES = 25;

export const PMAX_FINAL_URL_MAX_CHARS = 2048;
export const PMAX_PATH_MAX_CHARS = 15;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function newPmaxCampaign(): PmaxCampaign {
  return {
    id: uid(),
    name: '',
    variant: 'standard',
    status: 'Paused',
    budget: { amount: 0 },
    bidStrategyType: 'Maximize Conversions',
    startDate: '',
    endDate: '',
    locations: [],
    locationMode: 'presence',
    euPoliticalAds: '',
    labels: '',
    trackingTemplate: '',
    finalUrlSuffix: '',
    customParameter: '',
    conversionGoal: { mode: 'account_default', goalNames: [], unresolved: true },
    brandGuidelines: { enabled: true },
    assetAutomation: { finalUrlExpansion: true, textCustomization: true, urlExclusions: [] },
    lifecycle: { mode: 'inherit', newCustomerAcquisitionEnabled: false, retentionEnabled: false, requiredCustomerMatchLists: [] },
    assets: [],
    campaignAssetLinks: [],
    assetGroups: [],
    assetGroupAssetLinks: [],
    signals: [],
  };
}

export function newPmaxAssetGroup(campaignId: string): PmaxCampaign['assetGroups'][number] {
  return {
    id: uid(),
    campaignId,
    name: '',
    status: 'Paused',
    finalUrl: '',
    path1: '',
    path2: '',
    cta: 'Automated',
  };
}
