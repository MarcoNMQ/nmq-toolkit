import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  AD_GROUP_HEADERS, CAMPAIGN_HEADERS, KEYWORD_HEADERS, NEGATIVE_KEYWORD_HEADERS, RSA_HEADERS,
  buildSearchBulkUploadWorkbook,
} from '../searchSerializer';
import type { SearchCampaignBundle } from '../searchTypes';

function makeBundle(): SearchCampaignBundle {
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
      searchPartners: true,
      displayExpansionEnabled: false,
      locations: [{ name: 'Portugal', excluded: false }],
      euPoliticalAds: 'No',
      labels: 'NOV;2027',
      trackingTemplate: '',
      finalUrlSuffix: '',
      customParameter: '',
    },
    adGroups: [{ id: adGroupId, campaignId, name: 'SRC_RODS_BRAND_PT', status: 'Paused' }],
    keywords: [
      { id: 'k1', adGroupId, text: 'shimano fishing rods', matchType: 'Phrase match', status: 'Paused' },
      { id: 'k2', adGroupId, text: 'fishing rods', matchType: 'Broad match', status: 'Paused' },
      { id: 'k3', adGroupId, text: 'shimano predator rod', matchType: 'Exact match', status: 'Paused' },
    ],
    negativeKeywords: [
      { id: 'n1', scopeId: adGroupId, level: 'Ad group', text: 'free', matchType: 'Broad match' },
      { id: 'n2', scopeId: campaignId, level: 'Campaign', text: 'cheap', matchType: 'Phrase match' },
    ],
    rsas: [{
      id: 'r1',
      adGroupId,
      status: 'Paused',
      headlines: [
        { text: 'Explore Shimano Rods' }, { text: 'Find Your Next Rod' }, { text: 'Built For Every Cast', pin: 1 },
      ],
      descriptions: [{ text: 'Discover rods designed for performance.' }, { text: 'Browse the range today.' }],
      path1: 'rods',
      path2: 'fishing',
      finalUrl: 'https://example.com/rods',
    }],
  };
}

async function readSheet(buffer: Buffer, sheetName: string): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`sheet ${sheetName} not found`);
  const rows: string[][] = [];
  ws.eachRow((row) => {
    const vals: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => vals.push(String(cell.value ?? '')));
    rows.push(vals);
  });
  return rows;
}

describe('buildSearchBulkUploadWorkbook', () => {
  it('writes the exact verified Campaign headers and row', async () => {
    const buffer = await buildSearchBulkUploadWorkbook([makeBundle()]);
    const rows = await readSheet(buffer, 'Campaigns');
    expect(rows[0]).toEqual([...CAMPAIGN_HEADERS]);
    const row = Object.fromEntries(CAMPAIGN_HEADERS.map((h, i) => [h, rows[1][i]]));
    expect(row['Row Type']).toBe('Campaign');
    expect(row.Action).toBe('Add');
    expect(row['Campaign status']).toBe('Paused');
    expect(row.Campaign).toBe('SRC_TRAFFIC_NOV_RODS');
    expect(row['Campaign type']).toBe('Search');
    expect(row.Networks).toBe('Google search;Search partners');
    expect(row.Budget).toBe('50.00');
    expect(row['Budget type']).toBe('Daily');
    expect(row['Bid strategy type']).toBe('Maximize clicks');
    expect(row['Campaign start date']).toBe('2027-11-01');
    expect(row['Campaign end date']).toBe('2027-11-30');
    expect(row.Location).toBe('Portugal');
    expect(row.Exclusion).toBe('');
    expect(row['EU political ads']).toBe('No');
  });

  it('never emits Languages or Call to action columns', async () => {
    const buffer = await buildSearchBulkUploadWorkbook([makeBundle()]);
    const rows = await readSheet(buffer, 'Campaigns');
    expect(rows[0]).not.toContain('Languages');
    expect(rows[0]).not.toContain('Call to action');
    const adRows = await readSheet(buffer, 'Ads');
    expect(adRows[0]).not.toContain('Call to action');
    expect(adRows[0]).not.toContain('Video ID');
    expect(adRows[0]).not.toContain('Long headline');
    expect(adRows[0]).not.toContain('Description 5');
    expect(adRows[0]).not.toContain('Business name');
  });

  it('writes Ad group rows with the resolved campaign name', async () => {
    const buffer = await buildSearchBulkUploadWorkbook([makeBundle()]);
    const rows = await readSheet(buffer, 'Ad groups');
    expect(rows[0]).toEqual([...AD_GROUP_HEADERS]);
    const row = Object.fromEntries(AD_GROUP_HEADERS.map((h, i) => [h, rows[1][i]]));
    expect(row['Row Type']).toBe('Ad group');
    expect(row.Campaign).toBe('SRC_TRAFFIC_NOV_RODS');
    expect(row['Ad group']).toBe('SRC_RODS_BRAND_PT');
    expect(row['Ad group status']).toBe('Paused');
  });

  it('writes Keyword rows with full-word match types', async () => {
    const buffer = await buildSearchBulkUploadWorkbook([makeBundle()]);
    const rows = await readSheet(buffer, 'Keywords');
    expect(rows[0]).toEqual([...KEYWORD_HEADERS]);
    const types = rows.slice(1).map((r) => r[KEYWORD_HEADERS.indexOf('Type')]);
    expect(types).toEqual(['Phrase match', 'Broad match', 'Exact match']);
  });

  it('writes Negative keyword rows with level-correct scoping', async () => {
    const buffer = await buildSearchBulkUploadWorkbook([makeBundle()]);
    const rows = await readSheet(buffer, 'Negative keywords');
    expect(rows[0]).toEqual([...NEGATIVE_KEYWORD_HEADERS]);
    const adGroupCol = NEGATIVE_KEYWORD_HEADERS.indexOf('Ad group');
    const levelCol = NEGATIVE_KEYWORD_HEADERS.indexOf('Level');
    const adGroupLevelRow = rows[1];
    const campaignLevelRow = rows[2];
    expect(adGroupLevelRow[levelCol]).toBe('Ad group');
    expect(adGroupLevelRow[adGroupCol]).toBe('SRC_RODS_BRAND_PT');
    expect(campaignLevelRow[levelCol]).toBe('Campaign');
    expect(campaignLevelRow[adGroupCol]).toBe('');
  });

  it('writes RSA rows with headlines, pins and paths', async () => {
    const buffer = await buildSearchBulkUploadWorkbook([makeBundle()]);
    const rows = await readSheet(buffer, 'Ads');
    expect(rows[0]).toEqual([...RSA_HEADERS]);
    const row = Object.fromEntries(RSA_HEADERS.map((h, i) => [h, rows[1][i]]));
    expect(row['Ad type']).toBe('Responsive search ad');
    expect(row['Ad status']).toBe('Paused');
    expect(row['Headline 1']).toBe('Explore Shimano Rods');
    expect(row['Headline 3']).toBe('Built For Every Cast');
    expect(row['Headline 3 position']).toBe('1');
    expect(row['Path 1']).toBe('rods');
    expect(row['Path 2']).toBe('fishing');
    expect(row['Final URL']).toBe('https://example.com/rods');
  });

  it('handles non-ASCII, commas and quotes in keyword/headline text', async () => {
    const bundle = makeBundle();
    bundle.keywords[0].text = 'cañas de pescar, "shimano"';
    bundle.rsas[0].headlines[0] = { text: 'Värme & Komfort — 日本語テスト' };
    const buffer = await buildSearchBulkUploadWorkbook([bundle]);
    const rows = await readSheet(buffer, 'Keywords');
    expect(rows[1][KEYWORD_HEADERS.indexOf('Keyword')]).toBe('cañas de pescar, "shimano"');
  });
});
