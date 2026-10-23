// Converts the store's GoogleCampaign shape (channel === 'Search') into the
// typed SearchCampaignBundle used by searchValidation.ts/searchSerializer.ts.
// The store models one ad group per campaign today (c.adset_name), so every
// bundle has exactly one SearchAdGroup — matches builder.ts's existing
// buildAdgroupRow behavior.

import { COUNTRY_MAP } from '../constants';
import { resolveDuplicateNames } from '../naming/dedupe';
import type { GoogleCampaign } from '../types';
import { SEARCH_DEFAULT_BID_STRATEGY, SEARCH_DEFAULT_BUDGET_TYPE, SEARCH_DEFAULT_STATUS } from './searchDefaults';
import type {
  KeywordMatchType, SearchBidStrategyType, SearchCampaignBundle, SearchRsa, SearchRsaDescription, SearchRsaHeadline,
} from './searchTypes';

function toMatchType(m: 'Broad' | 'Phrase' | 'Exact'): KeywordMatchType {
  if (m === 'Phrase') return 'Phrase match';
  if (m === 'Exact') return 'Exact match';
  return 'Broad match';
}

function toBidStrategy(s: string): SearchBidStrategyType {
  const valid: SearchBidStrategyType[] = [
    'Manual CPC', 'Maximize clicks', 'Maximize Conversions', 'Target CPA',
    'Maximize Conversion Value', 'Target ROAS', 'Target Impression Share',
  ];
  return (valid as string[]).includes(s) ? (s as SearchBidStrategyType) : SEARCH_DEFAULT_BID_STRATEGY;
}

function toHeadlines(ad: GoogleCampaign['ads'][number]): SearchRsaHeadline[] {
  const out: SearchRsaHeadline[] = [];
  for (let i = 1; i <= 15; i++) {
    const text = (ad as unknown as Record<string, string>)[`headline_${i}`] ?? '';
    if (text.trim()) out.push({ text });
  }
  return out;
}

function toDescriptions(ad: GoogleCampaign['ads'][number]): SearchRsaDescription[] {
  const out: SearchRsaDescription[] = [];
  for (let i = 1; i <= 4; i++) {
    const text = (ad as unknown as Record<string, string>)[`description_${i}`] ?? '';
    if (text.trim()) out.push({ text });
  }
  return out;
}

/**
 * Builds one bundle per Search campaign in the input. Non-Search campaigns
 * are ignored — callers should pre-filter, but this stays defensive.
 * Campaign/ad-group names are resolved for collisions first, exactly like
 * builder.ts's buildCsv does for YouTube/Demand Gen.
 */
export function buildSearchBundles(campaigns: GoogleCampaign[]): SearchCampaignBundle[] {
  const searchCampaigns = campaigns.filter((c) => c.channel === 'Search');
  const resolved = resolveDuplicateNames(
    searchCampaigns.map((c) => ({ id: c.id, campaignName: c.campaign_name, adsetName: c.adset_name })),
  );
  const resolvedById = new Map(resolved.map((r) => [r.id, r]));

  return searchCampaigns.map((c) => {
    const names = resolvedById.get(c.id);
    const campaignName = names?.campaignName ?? c.campaign_name;
    const adGroupName = names?.adsetName ?? c.adset_name;
    const adGroupId = `${c.id}__adgroup`;

    return {
      campaign: {
        id: c.id,
        name: campaignName,
        status: SEARCH_DEFAULT_STATUS,
        budget: Number(c.budget ?? 0),
        // Search always exports Daily for P0, regardless of the form's
        // Daily/Total toggle — Campaign Total's exact Budget type value
        // isn't fixture-verified for Search yet (see searchManifest.ts).
        budgetType: SEARCH_DEFAULT_BUDGET_TYPE,
        bidStrategyType: toBidStrategy(c.bid_strategy ?? ''),
        targetCpa: c.target_cpa,
        targetRoas: c.target_roas,
        targetImpressionShare: c.target_impression_share,
        startDate: c.start_date ?? '',
        endDate: c.end_date ?? '',
        searchPartners: !!c.search_partners,
        displayExpansionEnabled: !!c.display_expansion,
        locations: (c.countries ?? [])
          .map((code) => COUNTRY_MAP[code])
          .filter((name): name is string => !!name)
          .map((name) => ({ name, excluded: false })),
        // Never guessed — an unset value stays blank and the validator
        // blocks export until the user picks Yes or No explicitly.
        euPoliticalAds: (c.eu_political_ads === 'Yes' || c.eu_political_ads === 'No') ? c.eu_political_ads : '',
        labels: c.labels ?? '',
        trackingTemplate: '',
        finalUrlSuffix: '',
        customParameter: '',
      },
      adGroups: [{
        id: adGroupId,
        campaignId: c.id,
        name: adGroupName,
        status: SEARCH_DEFAULT_STATUS,
        defaultMaxCpc: c.max_cpc,
      }],
      keywords: (c.keywords ?? [])
        .filter((kw) => kw.text.trim())
        .map((kw) => ({
          id: kw.id,
          adGroupId,
          text: kw.text,
          matchType: toMatchType(kw.matchType),
          status: SEARCH_DEFAULT_STATUS,
        })),
      negativeKeywords: (c.negative_keywords ?? [])
        .filter((n) => n.text.trim())
        .map((n) => ({
          id: n.id,
          scopeId: n.level === 'campaign' ? c.id : adGroupId,
          level: n.level === 'campaign' ? 'Campaign' as const : 'Ad group' as const,
          text: n.text,
          matchType: toMatchType(n.matchType),
        })),
      rsas: (c.ads ?? []).map((ad): SearchRsa => ({
        id: ad.id,
        adGroupId,
        status: SEARCH_DEFAULT_STATUS,
        headlines: toHeadlines(ad),
        descriptions: toDescriptions(ad),
        path1: ad.path1 ?? '',
        path2: ad.path2 ?? '',
        finalUrl: ad.final_url ?? '',
      })),
    };
  });
}
