import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildFbExcel, buildFbAdsOnlyExcel } from '../fbBuilder';
import { FB_HEADERS } from '../fbConstants';
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

function makeCard(adOverrides: Partial<FbAd> = {}, campaignOverrides: Partial<FbCampaign> = {}): FbCampaign {
  return {
    id: 'c1',
    campaign_name: 'My Campaign',
    campaign_status: 'PAUSED',
    campaign_objective: 'OUTCOME_TRAFFIC',
    buying_type: 'AUCTION',
    campaign_bid_strategy: '',
    tags: '',
    campaign_start_time: '2026-11-01',
    campaign_stop_time: '2026-11-30',
    budget_level: 'Campaign',
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
    ads: [makeAd(adOverrides)],
    ...campaignOverrides,
  };
}

/** Shimano with one named Page ("page1") — mirrors the real shape, where a
 *  client runs many Pages and an ad picks exactly one by its ref. */
function makeClients(): ClientEntry[] {
  return [
    { id: 'c1', name: 'Shimano', facebookPages: [{ id: 'page1', name: 'Shimano Fishing FR', pageId: '123456789012345' }] },
    { id: 'c2', name: 'Lineage', facebookPages: [{ id: 'pageL', name: 'Lineage Main', pageId: '999999999999999' }] },
  ];
}

async function readRows(buf: Buffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any);
  const ws = wb.worksheets[0];
  const header = FB_HEADERS.map((h, i) => [h, i + 1] as const);
  const rows: Record<string, string>[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, string> = {};
    for (const [h, col] of header) obj[h] = String(row.getCell(col).value ?? '');
    rows.push(obj);
  }
  return rows;
}

describe('buildFbExcel — Link Object ID (Facebook Page attribution, per ad)', () => {
  it("sets Link Object ID as o:<pageId> on a new-creative ad, resolved from that ad's own client + chosen Page", async () => {
    const buf = await buildFbExcel([makeCard()], makeClients());
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('o:123456789012345');
  });

  it('leaves Link Object ID blank when the client has no Pages at all', async () => {
    const buf = await buildFbExcel([makeCard()], [{ id: 'c1', name: 'Shimano' }]);
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('');
  });

  it("leaves Link Object ID blank when facebook_page_ref matches nothing in the ad's client's Pages", async () => {
    const buf = await buildFbExcel([makeCard({ facebook_page_ref: 'deleted-page' })], makeClients());
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('');
  });

  it("does not resolve a Page from an unrelated client's roster", async () => {
    const buf = await buildFbExcel([makeCard({ facebook_page_ref: 'pageL' })], makeClients());
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('');
  });

  it('sets Link Object ID on an existing-post ad too — promoted posts also need Page attribution', async () => {
    const card = makeCard({ ad_type: 'existing_post', story_id: 's:123' });
    const buf = await buildFbExcel([card], makeClients());
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('o:123456789012345');
  });

  it('resolves each ad independently — two ads in the same campaign can use two different Pages with no cross-effect', async () => {
    const card = makeCard();
    card.ads = [
      makeAd({ id: 'ad1', client_profile: 'Shimano', facebook_page_ref: 'page1' }),
      makeAd({ id: 'ad2', client_profile: 'Lineage', facebook_page_ref: 'pageL' }),
    ];
    const buf = await buildFbExcel([card], makeClients());
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('o:123456789012345');
    expect(rows[1]['Link Object ID']).toBe('o:999999999999999');
  });

  it('also populates Link Object ID in the ads-only export', async () => {
    const buf = await buildFbAdsOnlyExcel([makeCard()], makeClients());
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('o:123456789012345');
  });
});

describe('buildFbExcel — budget level (Campaign vs Ad Set, mutually exclusive)', () => {
  it('writes only the Campaign budget column when budget_level is Campaign, leaving Ad Set budget blank', async () => {
    const card = makeCard({}, { budget_level: 'Campaign', budget_type: 'Daily', budget: 50, adset_budget_type: 'Lifetime', adset_budget: 999 });
    const buf = await buildFbExcel([card]);
    const rows = await readRows(buf);
    expect(rows[0]['Campaign Daily Budget']).toBe('50.00');
    expect(rows[0]['Campaign Lifetime Budget']).toBe('');
    expect(rows[0]['Ad Set Daily Budget']).toBe('');
    expect(rows[0]['Ad Set Lifetime Budget']).toBe('');
  });

  it('writes only the Ad Set budget column when budget_level is Ad Set, leaving Campaign budget blank', async () => {
    const card = makeCard({}, { budget_level: 'Ad Set', budget_type: 'Daily', budget: 50, adset_budget_type: 'Lifetime', adset_budget: 999 });
    const buf = await buildFbExcel([card]);
    const rows = await readRows(buf);
    expect(rows[0]['Campaign Daily Budget']).toBe('');
    expect(rows[0]['Campaign Lifetime Budget']).toBe('');
    expect(rows[0]['Ad Set Lifetime Budget']).toBe('999.00');
    expect(rows[0]['Ad Set Daily Budget']).toBe('');
  });

  it('defaults to Campaign-level budget behavior when budget_level is missing (pre-migration safety net)', async () => {
    const card = makeCard({}, { budget: 75 });
    delete (card as Partial<FbCampaign>).budget_level;
    const buf = await buildFbExcel([card]);
    const rows = await readRows(buf);
    expect(rows[0]['Campaign Daily Budget']).toBe('75.00');
  });
});
