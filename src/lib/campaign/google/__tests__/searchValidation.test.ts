import { describe, expect, it } from 'vitest';
import { googleCharWidth, validateSearchBundles } from '../searchValidation';
import type { SearchCampaignBundle } from '../searchTypes';

function makeBundle(overrides: Partial<SearchCampaignBundle['campaign']> = {}): SearchCampaignBundle {
  const campaignId = 'c1';
  const adGroupId = 'ag1';
  return {
    campaign: {
      id: campaignId,
      name: 'SRC_TRAFFIC_NOV_RODS',
      status: 'Paused',
      budget: 50,
      budgetType: 'Daily',
      bidStrategyType: 'Maximize clicks',
      startDate: '2027-11-01',
      endDate: '2027-11-30',
      searchPartners: false,
      displayExpansionEnabled: false,
      locations: [{ name: 'Portugal', excluded: false }],
      euPoliticalAds: 'No',
      labels: '',
      trackingTemplate: '',
      finalUrlSuffix: '',
      customParameter: '',
      ...overrides,
    },
    adGroups: [{ id: adGroupId, campaignId, name: 'SRC_RODS_BRAND_PT', status: 'Paused' }],
    keywords: [{ id: 'k1', adGroupId, text: 'shimano fishing rods', matchType: 'Phrase match', status: 'Paused' }],
    negativeKeywords: [],
    rsas: [{
      id: 'r1',
      adGroupId,
      status: 'Paused',
      headlines: [{ text: 'Explore Shimano Rods' }, { text: 'Find Your Next Rod' }, { text: 'Built For Every Cast' }],
      descriptions: [{ text: 'Discover rods designed for performance.' }, { text: 'Browse the range today.' }],
      path1: 'rods',
      path2: 'fishing',
      finalUrl: 'https://example.com/rods',
    }],
  };
}

describe('validateSearchBundles — minimal valid campaign', () => {
  it('produces no errors for a well-formed paused campaign', () => {
    expect(validateSearchBundles([makeBundle()])).toEqual([]);
  });
});

describe('validateSearchBundles — blocking errors', () => {
  it('blocks zero budget', () => {
    const errors = validateSearchBundles([makeBundle({ budget: 0 })]);
    expect(errors.some((e) => /budget must be greater than zero/.test(e))).toBe(true);
  });

  it('blocks missing EU political ads declaration', () => {
    const b = makeBundle({ euPoliticalAds: '' });
    const errors = validateSearchBundles([b]);
    expect(errors.some((e) => /EU political ads/.test(e))).toBe(true);
  });

  it('blocks a past start date', () => {
    const errors = validateSearchBundles([makeBundle({ startDate: '2020-01-01' })]);
    expect(errors.some((e) => /start date cannot be in the past/.test(e))).toBe(true);
  });

  it('blocks end date before start date', () => {
    const errors = validateSearchBundles([makeBundle({ startDate: '2027-11-10', endDate: '2027-11-01' })]);
    expect(errors.some((e) => /end date must be on or after/.test(e))).toBe(true);
  });

  it('blocks a campaign with no included locations', () => {
    const errors = validateSearchBundles([makeBundle({ locations: [] })]);
    expect(errors.some((e) => /at least one included location/.test(e))).toBe(true);
  });

  it('blocks Target CPA strategy without a target value', () => {
    const errors = validateSearchBundles([makeBundle({ bidStrategyType: 'Target CPA' })]);
    expect(errors.some((e) => /Target CPA requires/.test(e))).toBe(true);
  });

  it('allows Target CPA strategy with a target value', () => {
    const errors = validateSearchBundles([makeBundle({ bidStrategyType: 'Target CPA', targetCpa: 5 })]);
    expect(errors.some((e) => /Target CPA requires/.test(e))).toBe(false);
  });

  it('blocks duplicate campaign names across the export', () => {
    const errors = validateSearchBundles([makeBundle(), makeBundle()]);
    expect(errors.some((e) => /collides with another campaign/.test(e))).toBe(true);
  });

  it('blocks a keyword over 80 characters', () => {
    const bundle = makeBundle();
    bundle.keywords[0].text = 'x'.repeat(81);
    expect(validateSearchBundles([bundle]).some((e) => /max 80/.test(e))).toBe(true);
  });

  it('blocks a keyword with more than 10 words', () => {
    const bundle = makeBundle();
    bundle.keywords[0].text = Array.from({ length: 11 }, () => 'word').join(' ');
    expect(validateSearchBundles([bundle]).some((e) => /more than 10 words/.test(e))).toBe(true);
  });

  it('blocks a duplicate keyword + match type in the same ad group', () => {
    const bundle = makeBundle();
    bundle.keywords.push({ ...bundle.keywords[0], id: 'k2' });
    expect(validateSearchBundles([bundle]).some((e) => /duplicate keyword/.test(e))).toBe(true);
  });

  it('blocks Max CPC on a keyword when the bid strategy is not Manual CPC', () => {
    const bundle = makeBundle();
    bundle.keywords[0].maxCpc = 1.5;
    expect(validateSearchBundles([bundle]).some((e) => /only valid when/.test(e))).toBe(true);
  });

  it('blocks Manual CPC ad groups with no default max CPC', () => {
    const bundle = makeBundle({ bidStrategyType: 'Manual CPC' });
    expect(validateSearchBundles([bundle]).some((e) => /requires a default max\. CPC/.test(e))).toBe(true);
  });

  it('blocks fewer than 3 RSA headlines', () => {
    const bundle = makeBundle();
    bundle.rsas[0].headlines = bundle.rsas[0].headlines.slice(0, 2);
    expect(validateSearchBundles([bundle]).some((e) => /3 to 15 non-empty headlines/.test(e))).toBe(true);
  });

  it('blocks more than 15 RSA headlines', () => {
    const bundle = makeBundle();
    bundle.rsas[0].headlines = Array.from({ length: 16 }, (_, i) => ({ text: `Headline ${i}` }));
    expect(validateSearchBundles([bundle]).some((e) => /3 to 15 non-empty headlines/.test(e))).toBe(true);
  });

  it('blocks duplicate RSA headlines', () => {
    const bundle = makeBundle();
    bundle.rsas[0].headlines[1] = { text: bundle.rsas[0].headlines[0].text };
    expect(validateSearchBundles([bundle]).some((e) => /headlines must be unique/.test(e))).toBe(true);
  });

  it('blocks fewer than 2 RSA descriptions', () => {
    const bundle = makeBundle();
    bundle.rsas[0].descriptions = bundle.rsas[0].descriptions.slice(0, 1);
    expect(validateSearchBundles([bundle]).some((e) => /2 to 4 non-empty descriptions/.test(e))).toBe(true);
  });

  it('blocks a headline over 30 characters wide', () => {
    const bundle = makeBundle();
    bundle.rsas[0].headlines[0] = { text: 'x'.repeat(31) };
    expect(validateSearchBundles([bundle]).some((e) => /max 30/.test(e))).toBe(true);
  });

  it('blocks a description over 90 characters wide', () => {
    const bundle = makeBundle();
    bundle.rsas[0].descriptions[0] = { text: 'x'.repeat(91) };
    expect(validateSearchBundles([bundle]).some((e) => /max 90/.test(e))).toBe(true);
  });

  it('blocks Path 2 without Path 1', () => {
    const bundle = makeBundle();
    bundle.rsas[0].path1 = '';
    bundle.rsas[0].path2 = 'fishing';
    expect(validateSearchBundles([bundle]).some((e) => /Path 2 requires Path 1/.test(e))).toBe(true);
  });

  it('blocks a non-http(s) final URL', () => {
    const bundle = makeBundle();
    bundle.rsas[0].finalUrl = 'ftp://example.com';
    expect(validateSearchBundles([bundle]).some((e) => /absolute http/.test(e))).toBe(true);
  });

  it('blocks a final URL over 2,084 bytes', () => {
    const bundle = makeBundle();
    bundle.rsas[0].finalUrl = `https://example.com/${'a'.repeat(2100)}`;
    expect(validateSearchBundles([bundle]).some((e) => /2,084-byte/.test(e))).toBe(true);
  });

  it('blocks more than 3 pinned headline positions', () => {
    const bundle = makeBundle();
    bundle.rsas[0].headlines = [
      { text: 'H1', pin: 1 }, { text: 'H2', pin: 1 }, { text: 'H3', pin: 2 }, { text: 'H4', pin: 3 },
    ];
    expect(validateSearchBundles([bundle]).some((e) => /at most 3 pinned headline/.test(e))).toBe(true);
  });
});

describe('googleCharWidth', () => {
  it('counts ASCII characters as width 1', () => {
    expect(googleCharWidth('hello')).toBe(5);
  });

  it('counts CJK characters as width 2', () => {
    expect(googleCharWidth('日本語')).toBe(6);
  });

  it('handles mixed ASCII + CJK text', () => {
    expect(googleCharWidth('abc日')).toBe(5);
  });
});
