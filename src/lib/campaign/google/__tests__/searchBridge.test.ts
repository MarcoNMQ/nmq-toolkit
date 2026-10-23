import { describe, expect, it } from 'vitest';
import { buildSearchBundles } from '../searchBridge';
import type { GoogleCampaign } from '../../types';

function makeCampaign(overrides: Partial<GoogleCampaign> = {}): GoogleCampaign {
  return {
    id: 'c1',
    campaign_name: 'SRC_TRAFFIC_NOV_RODS',
    adset_name: 'SRC_RODS_BRAND_PT',
    channel: 'Search',
    main_goal: 'Traffic',
    perf_goal: 'Traffic',
    month: 'November',
    client_profile: 'Shimano',
    product_category: 'Predator',
    product_subcategory: '',
    product_promoted: '',
    market: 'SEU',
    key_category: 'NO',
    country_group: 'Europe',
    countries: ['PT'],
    location_level: 'campaign',
    budget: 50,
    bid_strategy: 'Maximize clicks',
    networks: '',
    languages: '',
    labels: '',
    start_date: '2027-11-01',
    end_date: '2027-11-30',
    budget_type: 'Daily',
    cta: '',
    ads: [],
    keywords: [{ id: 'k1', text: 'shimano rods', matchType: 'Phrase' }],
    sitelinks: [],
    negative_keywords: [{ id: 'n1', text: 'free', matchType: 'Broad', level: 'campaign' }],
    eu_political_ads: 'No',
    search_partners: true,
    display_expansion: false,
    ...overrides,
  };
}

describe('buildSearchBundles', () => {
  it('ignores non-Search campaigns', () => {
    const campaign = makeCampaign({ channel: 'YouTube' });
    expect(buildSearchBundles([campaign])).toEqual([]);
  });

  it('maps a Search campaign into a bundle with one ad group', () => {
    const [bundle] = buildSearchBundles([makeCampaign()]);
    expect(bundle.campaign.name).toBe('SRC_TRAFFIC_NOV_RODS');
    expect(bundle.campaign.status).toBe('Paused');
    expect(bundle.campaign.budgetType).toBe('Daily');
    expect(bundle.campaign.euPoliticalAds).toBe('No');
    expect(bundle.campaign.locations).toEqual([{ name: 'Portugal', excluded: false }]);
    expect(bundle.adGroups).toHaveLength(1);
    expect(bundle.adGroups[0].name).toBe('SRC_RODS_BRAND_PT');
  });

  it('always forces Daily budget type even if the form says Campaign total', () => {
    const [bundle] = buildSearchBundles([makeCampaign({ budget_type: 'Campaign total' })]);
    expect(bundle.campaign.budgetType).toBe('Daily');
  });

  it('converts short match types to the verified full-word Bulk Upload values', () => {
    const [bundle] = buildSearchBundles([makeCampaign()]);
    expect(bundle.keywords[0].matchType).toBe('Phrase match');
  });

  it('scopes a campaign-level negative keyword to the campaign id', () => {
    const [bundle] = buildSearchBundles([makeCampaign()]);
    expect(bundle.negativeKeywords[0].level).toBe('Campaign');
    expect(bundle.negativeKeywords[0].scopeId).toBe('c1');
  });

  it('leaves a missing EU political ads value blank rather than guessing Yes or No', () => {
    const [bundle] = buildSearchBundles([makeCampaign({ eu_political_ads: '' })]);
    expect(bundle.campaign.euPoliticalAds).toBe('');
  });
});
