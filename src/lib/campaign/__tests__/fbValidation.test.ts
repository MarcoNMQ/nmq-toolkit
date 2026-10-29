import { describe, expect, it } from 'vitest';
import { validateFbCampaigns } from '../fbBuilder';
import type { FbCampaign } from '../types';

function makeCard(overrides: Partial<FbCampaign> = {}): FbCampaign {
  return {
    id: Math.random().toString(36),
    campaign_name: 'My Campaign',
    campaign_status: 'PAUSED',
    campaign_objective: 'OUTCOME_TRAFFIC',
    buying_type: 'AUCTION',
    campaign_bid_strategy: '',
    tags: '',
    campaign_start_time: '2026-11-01',
    campaign_stop_time: '2026-11-30',
    budget_type: 'Daily',
    budget: 100,
    adset_name: 'My Ad Set',
    adset_status: 'PAUSED',
    adset_start_time: '2026-11-01',
    adset_stop_time: '2026-11-30',
    adset_budget_type: 'Daily',
    adset_budget: 0,
    countries: ['DE', 'FR'],
    gender: 'All',
    custom_audiences: '',
    excluded_custom_audiences: '',
    publisher_platforms: ['facebook', 'instagram'],
    device_platforms: ['mobile', 'desktop'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream'],
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    adset_bid_strategy: '',
    ads: [{
      id: 'ad1', ad_name: 'Ad 1', ad_status: 'PAUSED', ad_type: 'new_creative',
      title: 'Headline', body: 'Body copy', link: 'https://example.com', link_description: '', display_link: '',
      image_hash: 'abc:123', image_file_name: '', story_id: '', video_id: '', post_url: '',
      creative_type: 'Video Page Post Ad', url_tags: '', cta: 'LEARN_MORE',
    }],
    ...overrides,
  };
}

describe('validateFbCampaigns — required fields', () => {
  it('passes a fully filled-in campaign with no errors', () => {
    expect(validateFbCampaigns([makeCard()])).toEqual([]);
  });

  it('reports no campaigns at all', () => {
    const errors = validateFbCampaigns([]);
    expect(errors).toEqual(['Add at least one campaign before exporting.']);
  });

  it.each([
    ['campaign_name', '', /Campaign Name/],
    ['adset_name', '', /Ad Set Name/],
    ['campaign_objective', '', /Campaign Objective/],
    ['optimization_goal', '', /Optimization Goal/],
    ['billing_event', '', /Billing Event/],
  ] as const)('flags a blank %s', (field, value, pattern) => {
    const errors = validateFbCampaigns([makeCard({ [field]: value } as Partial<FbCampaign>)]);
    expect(errors.some((e) => pattern.test(e))).toBe(true);
  });

  it('flags no countries selected', () => {
    const errors = validateFbCampaigns([makeCard({ countries: [] })]);
    expect(errors.some((e) => /at least one country/.test(e))).toBe(true);
  });

  it('flags a campaign with zero ads', () => {
    const errors = validateFbCampaigns([makeCard({ ads: [] })]);
    expect(errors.some((e) => /Add at least one ad/.test(e))).toBe(true);
  });
});

describe('validateFbCampaigns — per-ad checks', () => {
  function withAd(overrides: Partial<FbCampaign['ads'][number]>): FbCampaign {
    const base = makeCard();
    return { ...base, ads: [{ ...base.ads[0], ...overrides }] };
  }

  it('flags a blank ad name', () => {
    const errors = validateFbCampaigns([withAd({ ad_name: '' })]);
    expect(errors.some((e) => /Ad Name is required/.test(e))).toBe(true);
  });

  it('flags a missing destination link', () => {
    const errors = validateFbCampaigns([withAd({ link: '' })]);
    expect(errors.some((e) => /Destination URL is required/.test(e))).toBe(true);
  });

  it('flags a missing body', () => {
    const errors = validateFbCampaigns([withAd({ body: '' })]);
    expect(errors.some((e) => /Body \(primary text\) is required/.test(e))).toBe(true);
  });

  it('flags neither image hash nor image file name set', () => {
    const errors = validateFbCampaigns([withAd({ image_hash: '', image_file_name: '' })]);
    expect(errors.some((e) => /Image Hash.*Image File Name/.test(e))).toBe(true);
  });

  it('flags BOTH image hash and image file name set — Meta rejects rows with both', () => {
    const errors = validateFbCampaigns([withAd({ image_hash: 'abc:123', image_file_name: 'photo.jpg' })]);
    expect(errors.some((e) => /only one of Image Hash or Image File Name/.test(e))).toBe(true);
  });

  it('flags a title over the 25-character limit', () => {
    const errors = validateFbCampaigns([withAd({ title: 'This headline is way too long for Meta' })]);
    expect(errors.some((e) => /Title is \d+ chars \(max 25\)/.test(e))).toBe(true);
  });

  it('flags a body over the 500-character limit', () => {
    const errors = validateFbCampaigns([withAd({ body: 'x'.repeat(501) })]);
    expect(errors.some((e) => /Body is \d+ chars \(max 500\)/.test(e))).toBe(true);
  });

  it('does not require link/image/body/title-limit for an existing-post ad, only a Story ID', () => {
    const errors = validateFbCampaigns([withAd({
      ad_type: 'existing_post', story_id: '', link: '', body: '', image_hash: '', image_file_name: '', title: '',
    })]);
    expect(errors).toEqual(['Campaign 1 (My Campaign) › Ad 1 (Ad 1): Story ID is required when promoting an existing post.']);
  });

  it('passes an existing-post ad once Story ID is set, even with no link/image/body', () => {
    const errors = validateFbCampaigns([withAd({
      ad_type: 'existing_post', story_id: 's:123456', link: '', body: '', image_hash: '', image_file_name: '', title: '',
    })]);
    expect(errors).toEqual([]);
  });
});

describe('validateFbCampaigns — includes grouping conflicts', () => {
  it('surfaces a grouping conflict (shared ad set name, disagreeing countries) alongside field errors', () => {
    const a = makeCard({ adset_name: 'Shared', countries: ['DE'] });
    const b = makeCard({ adset_name: 'Shared', countries: ['FR'], ads: [{ ...a.ads[0], id: 'ad2', ad_name: 'Ad 2' }] });
    const errors = validateFbCampaigns([a, b]);
    expect(errors.some((e) => /Countries/.test(e) && /Shared/.test(e))).toBe(true);
  });
});
