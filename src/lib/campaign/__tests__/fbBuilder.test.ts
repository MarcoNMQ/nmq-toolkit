import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildFbExcel, buildFbAdsOnlyExcel } from '../fbBuilder';
import { FB_HEADERS } from '../fbConstants';
import type { FbCampaign } from '../types';

function makeCard(overrides: Partial<FbCampaign> = {}): FbCampaign {
  return {
    id: 'c1',
    client_profile: 'Shimano',
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

describe('buildFbExcel — Link Object ID (Facebook Page attribution)', () => {
  it("sets Link Object ID as o:<pageId> on a new-creative ad, resolved from the campaign's client", async () => {
    const buf = await buildFbExcel([makeCard()], { Shimano: '123456789012345' });
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('o:123456789012345');
  });

  it('leaves Link Object ID blank when the client has no Page ID set', async () => {
    const buf = await buildFbExcel([makeCard()], {});
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('');
  });

  it("does not resolve a Page ID from an unrelated client's entry", async () => {
    const buf = await buildFbExcel([makeCard()], { Lineage: '999999999999999' });
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('');
  });

  it('does not set Link Object ID on an existing-post ad, even when its client has a Page ID set', async () => {
    const base = makeCard();
    const card = {
      ...base,
      ads: [{
        ...base.ads[0], ad_type: 'existing_post' as const, story_id: 's:123',
      }],
    };
    const buf = await buildFbExcel([card], { Shimano: '123456789012345' });
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('');
  });

  it('also populates Link Object ID in the ads-only export', async () => {
    const buf = await buildFbAdsOnlyExcel([makeCard()], { Shimano: '123456789012345' });
    const rows = await readRows(buf);
    expect(rows[0]['Link Object ID']).toBe('o:123456789012345');
  });
});
