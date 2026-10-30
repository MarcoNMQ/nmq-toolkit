import { describe, expect, it } from 'vitest';
import { validateFbCampaigns } from '../fbBuilder';
import type { FbAd, FbCampaign } from '../types';
import type { ClientEntry } from '@/lib/clients/store';

function makeAd(overrides: Partial<FbAd> = {}): FbAd {
  return {
    id: 'ad1', client_profile: 'Shimano', facebook_page_ref: 'page1',
    ad_name: 'Ad 1', ad_status: 'PAUSED', ad_type: 'new_creative',
    title: 'Headline', body: 'Body copy', link: 'https://example.com', link_description: '', display_link: '',
    image_hash: 'abc:123', image_file_name: '', story_id: '', video_id: '', post_url: '',
    creative_type: 'Video Page Post Ad', url_tags: '', cta: 'LEARN_MORE',
    ...overrides,
  };
}

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
    ads: [makeAd()],
    ...overrides,
  };
}

/** A client roster where Shimano has one Page ("page1" → a real Page ID) —
 *  mirrors the real shape, where a client can run many Pages and an ad
 *  picks exactly one by its ref. */
function makeClients(): ClientEntry[] {
  return [
    { id: 'c1', name: 'Shimano', facebookPages: [{ id: 'page1', name: 'Shimano Fishing FR', pageId: '123456789012345' }] },
    { id: 'c2', name: 'Lineage', facebookPages: [{ id: 'pageL', name: 'Lineage Main', pageId: '999999999999999' }] },
  ];
}

describe('validateFbCampaigns — required fields', () => {
  it('passes a fully filled-in campaign with no errors, given its ad\'s Page resolves to a real Page ID', () => {
    expect(validateFbCampaigns([makeCard()], makeClients())).toEqual([]);
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
    const errors = validateFbCampaigns([makeCard({ [field]: value } as Partial<FbCampaign>)], makeClients());
    expect(errors.some((e) => pattern.test(e))).toBe(true);
  });

  it('flags no countries selected', () => {
    const errors = validateFbCampaigns([makeCard({ countries: [] })], makeClients());
    expect(errors.some((e) => /at least one country/.test(e))).toBe(true);
  });

  it('flags a campaign with zero ads', () => {
    const errors = validateFbCampaigns([makeCard({ ads: [] })], makeClients());
    expect(errors.some((e) => /Add at least one ad/.test(e))).toBe(true);
  });
});

describe('validateFbCampaigns — per-ad checks', () => {
  function withAd(overrides: Partial<FbAd>): FbCampaign {
    return makeCard({ ads: [makeAd(overrides)] });
  }

  it('flags a blank ad name', () => {
    const errors = validateFbCampaigns([withAd({ ad_name: '' })], makeClients());
    expect(errors.some((e) => /Ad Name is required/.test(e))).toBe(true);
  });

  it('flags a missing destination link', () => {
    const errors = validateFbCampaigns([withAd({ link: '' })], makeClients());
    expect(errors.some((e) => /Destination URL is required/.test(e))).toBe(true);
  });

  it('flags a missing body', () => {
    const errors = validateFbCampaigns([withAd({ body: '' })], makeClients());
    expect(errors.some((e) => /Body \(primary text\) is required/.test(e))).toBe(true);
  });

  it('flags neither image hash nor image file name set', () => {
    const errors = validateFbCampaigns([withAd({ image_hash: '', image_file_name: '' })], makeClients());
    expect(errors.some((e) => /Image Hash.*Image File Name/.test(e))).toBe(true);
  });

  it('flags BOTH image hash and image file name set — Meta rejects rows with both', () => {
    const errors = validateFbCampaigns([withAd({ image_hash: 'abc:123', image_file_name: 'photo.jpg' })], makeClients());
    expect(errors.some((e) => /only one of Image Hash or Image File Name/.test(e))).toBe(true);
  });

  it('flags a title over the 25-character limit', () => {
    const errors = validateFbCampaigns([withAd({ title: 'This headline is way too long for Meta' })], makeClients());
    expect(errors.some((e) => /Title is \d+ chars \(max 25\)/.test(e))).toBe(true);
  });

  it('flags a body over the 500-character limit', () => {
    const errors = validateFbCampaigns([withAd({ body: 'x'.repeat(501) })], makeClients());
    expect(errors.some((e) => /Body is \d+ chars \(max 500\)/.test(e))).toBe(true);
  });

  it('does not require link/image/body/title-limit for an existing-post ad, only a Story ID', () => {
    const errors = validateFbCampaigns([withAd({
      ad_type: 'existing_post', story_id: '', link: '', body: '', image_hash: '', image_file_name: '', title: '',
    })], makeClients());
    expect(errors).toEqual(['Campaign 1 (My Campaign) › Ad 1 (Ad 1): Story ID is required when promoting an existing post.']);
  });

  it('passes an existing-post ad once Story ID is set, even with no link/image/body', () => {
    const errors = validateFbCampaigns([withAd({
      ad_type: 'existing_post', story_id: 's:123456', link: '', body: '', image_hash: '', image_file_name: '', title: '',
    })], makeClients());
    expect(errors).toEqual([]);
  });
});

describe('validateFbCampaigns — per-ad client/Facebook Page resolution (Link Object ID)', () => {
  it('blocks export when no client is picked for an ad', () => {
    const errors = validateFbCampaigns([makeCard({ ads: [makeAd({ client_profile: '', facebook_page_ref: '' })] })]);
    expect(errors.some((e) => /Pick a client/.test(e))).toBe(true);
  });

  it('blocks export when an ad\'s client is picked but has no Pages added yet', () => {
    const errors = validateFbCampaigns([makeCard()], [{ id: 'c1', name: 'Shimano' }]);
    expect(errors.some((e) => /"Shimano" has no Facebook Pages added yet/.test(e))).toBe(true);
  });

  it('blocks export when the client has Pages but none is picked for this ad', () => {
    const errors = validateFbCampaigns([makeCard({ ads: [makeAd({ facebook_page_ref: '' })] })], makeClients());
    expect(errors.some((e) => /Pick which of "Shimano"'s Facebook Pages/.test(e))).toBe(true);
  });

  it('blocks export when the picked facebook_page_ref no longer matches any of the client\'s Pages', () => {
    const errors = validateFbCampaigns([makeCard({ ads: [makeAd({ facebook_page_ref: 'deleted-page' })] })], makeClients());
    expect(errors.some((e) => /Pick which of "Shimano"'s Facebook Pages/.test(e))).toBe(true);
  });

  it('does not block once a real Page is resolved', () => {
    const errors = validateFbCampaigns([makeCard()], makeClients());
    expect(errors.some((e) => /Facebook Page/.test(e))).toBe(false);
  });

  it("only resolves a Page from the ad's own matching client — another client's Page ref does not count", () => {
    const errors = validateFbCampaigns([makeCard({ ads: [makeAd({ facebook_page_ref: 'pageL' })] })], makeClients());
    expect(errors.some((e) => /Pick which of "Shimano"'s Facebook Pages/.test(e))).toBe(true);
  });

  it('requires a Page even when the ad promotes an existing post — promoted posts also need Page attribution', () => {
    const errors = validateFbCampaigns([makeCard({ ads: [makeAd({
      client_profile: '', facebook_page_ref: '', ad_type: 'existing_post', story_id: 's:123',
      link: '', body: '', image_hash: '', image_file_name: '', title: '',
    })] })]);
    expect(errors.some((e) => /Pick a client/.test(e))).toBe(true);
  });

  it('resolves each ad independently — one ad missing its Page never affects a sibling ad that has one set correctly', () => {
    const errors = validateFbCampaigns([makeCard({
      ads: [
        makeAd({ id: 'ad1', client_profile: 'Shimano', facebook_page_ref: 'page1' }),
        makeAd({ id: 'ad2', ad_name: 'Ad 2', client_profile: '', facebook_page_ref: '' }),
      ],
    })], makeClients());
    expect(errors.some((e) => /Ad 1/.test(e) && /client|Facebook Page/i.test(e))).toBe(false);
    expect(errors.some((e) => /Ad 2/.test(e) && /Pick a client/.test(e))).toBe(true);
  });
});

describe('validateFbCampaigns — includes grouping conflicts', () => {
  it('surfaces a grouping conflict (shared ad set name, disagreeing countries) alongside field errors', () => {
    const a = makeCard({ adset_name: 'Shared', countries: ['DE'] });
    const b = makeCard({ adset_name: 'Shared', countries: ['FR'], ads: [makeAd({ id: 'ad2', ad_name: 'Ad 2' })] });
    const errors = validateFbCampaigns([a, b], makeClients());
    expect(errors.some((e) => /Countries/.test(e) && /Shared/.test(e))).toBe(true);
  });

  it('does not treat ads using different clients/Pages as a grouping conflict, even when they share a campaign', () => {
    const a = makeCard({ adset_name: 'Ad Set A', ads: [makeAd({ client_profile: 'Shimano', facebook_page_ref: 'page1' })] });
    const b = makeCard({ adset_name: 'Ad Set B', ads: [makeAd({ id: 'ad2', ad_name: 'Ad 2', client_profile: 'Lineage', facebook_page_ref: 'pageL' })] });
    const errors = validateFbCampaigns([a, b], makeClients());
    expect(errors).toEqual([]);
  });
});
