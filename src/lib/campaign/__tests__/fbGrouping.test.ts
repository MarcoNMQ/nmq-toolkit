import { describe, expect, it } from 'vitest';
import { fbGroupingErrors } from '../fbGrouping';
import type { FbCampaign } from '../types';

function makeCard(overrides: Partial<FbCampaign>): FbCampaign {
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
      id: 'ad1', client_profile: '', facebook_page_ref: '', ad_name: 'Ad 1', ad_status: 'PAUSED', ad_type: 'new_creative',
      title: '', body: 'Body', link: 'https://example.com', link_description: '', display_link: '',
      image_hash: 'abc:123', image_file_name: '', story_id: '', video_id: '', post_url: '',
      creative_type: 'Video Page Post Ad', url_tags: '', cta: 'LEARN_MORE',
    }],
    ...overrides,
  };
}

describe('fbGroupingErrors — same ad set name across cards', () => {
  it('does NOT block when two cards share campaign+adset name and agree on every ad-set-level field — they combine into one ad set with multiple ads', () => {
    const a = makeCard({ adset_name: 'Shared Ad Set' });
    const b = makeCard({ adset_name: 'Shared Ad Set', ads: [{ ...a.ads[0], id: 'ad2', ad_name: 'Ad 2' }] });
    const errors = fbGroupingErrors([a, b]);
    expect(errors).toEqual([]);
  });

  it('is case/whitespace-insensitive when matching ad set names, same as campaign names', () => {
    const a = makeCard({ adset_name: 'Shared Ad Set' });
    const b = makeCard({ adset_name: '  shared   ad set  ', ads: [{ ...a.ads[0], id: 'ad2', ad_name: 'Ad 2' }] });
    const errors = fbGroupingErrors([a, b]);
    expect(errors).toEqual([]);
  });

  it('blocks export when cards sharing an ad set name disagree on targeting (countries)', () => {
    const a = makeCard({ adset_name: 'Shared Ad Set', countries: ['DE', 'FR'] });
    const b = makeCard({ adset_name: 'Shared Ad Set', countries: ['ES', 'IT'], ads: [{ ...a.ads[0], id: 'ad2', ad_name: 'Ad 2' }] });
    const errors = fbGroupingErrors([a, b]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/Countries/);
    expect(errors[0]).toMatch(/Shared Ad Set/);
  });

  it('blocks export when cards sharing an ad set name disagree on budget', () => {
    const a = makeCard({ adset_name: 'Shared Ad Set', adset_budget: 50 });
    const b = makeCard({ adset_name: 'Shared Ad Set', adset_budget: 75, ads: [{ ...a.ads[0], id: 'ad2', ad_name: 'Ad 2' }] });
    const errors = fbGroupingErrors([a, b]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/budget/i);
  });

  it('still flags campaign-level conflicts the same as before (unaffected by this change)', () => {
    const a = makeCard({ adset_name: 'Ad Set A', campaign_objective: 'OUTCOME_TRAFFIC' });
    const b = makeCard({ adset_name: 'Ad Set B', campaign_objective: 'OUTCOME_LEADS' });
    const errors = fbGroupingErrors([a, b]);
    expect(errors.some((e) => /Campaign objective/.test(e))).toBe(true);
  });

  it('does NOT block when ads across the campaign use different clients/Pages — that is an ad-level choice in Meta\'s real model, never conflict-checked', () => {
    const a = makeCard({ adset_name: 'Ad Set A', ads: [{ id: 'a1', client_profile: 'Shimano', facebook_page_ref: 'page-fr', ad_name: 'A', ad_status: 'PAUSED', ad_type: 'new_creative', title: '', body: 'Body', link: 'https://example.com', link_description: '', display_link: '', image_hash: 'abc:123', image_file_name: '', story_id: '', video_id: '', post_url: '', creative_type: 'Video Page Post Ad', url_tags: '', cta: 'LEARN_MORE' }] });
    const b = makeCard({ adset_name: 'Ad Set B', ads: [{ id: 'b1', client_profile: 'Lineage', facebook_page_ref: 'page-de', ad_name: 'B', ad_status: 'PAUSED', ad_type: 'new_creative', title: '', body: 'Body', link: 'https://example.com', link_description: '', display_link: '', image_hash: 'abc:123', image_file_name: '', story_id: '', video_id: '', post_url: '', creative_type: 'Video Page Post Ad', url_tags: '', cta: 'LEARN_MORE' }] });
    const errors = fbGroupingErrors([a, b]);
    expect(errors).toEqual([]);
  });

  it('treats two different ad set names in the same campaign as fine when nothing else conflicts', () => {
    const a = makeCard({ adset_name: 'Ad Set A' });
    const b = makeCard({ adset_name: 'Ad Set B', ads: [{ ...a.ads[0], id: 'ad2', ad_name: 'Ad 2' }] });
    const errors = fbGroupingErrors([a, b]);
    expect(errors).toEqual([]);
  });
});
