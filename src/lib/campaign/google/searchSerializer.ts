// Builds the Google Ads Bulk Upload workbook (Tools & Settings > Bulk
// Actions > Uploads) for Search campaigns. One tab per entity type,
// mirroring the shape of the six official templates verified this session —
// every header below is copied exactly from those templates. Nothing here
// is guessed: a column that wasn't in a verified template is simply not
// emitted (see searchManifest.ts for what's fixture-gated instead).

import ExcelJS from 'exceljs';
import type { SearchCampaignBundle, SearchRsa } from './searchTypes';
import { buildSearchNetworks } from './searchDefaults';

function fmtMoney(n: number | undefined): string {
  return n != null ? Number(n).toFixed(2) : '';
}

function locationCell(bundle: SearchCampaignBundle, excluded: boolean): string {
  return bundle.campaign.locations
    .filter((l) => l.excluded === excluded)
    .map((l) => l.name)
    .join(';');
}

function rsaHeadlineCell(rsa: SearchRsa, index: number): string {
  return rsa.headlines[index]?.text ?? '';
}
function rsaHeadlinePinCell(rsa: SearchRsa, index: number): string {
  const pin = rsa.headlines[index]?.pin;
  return pin != null ? String(pin) : '';
}
function rsaDescriptionCell(rsa: SearchRsa, index: number): string {
  return rsa.descriptions[index]?.text ?? '';
}
function rsaDescriptionPinCell(rsa: SearchRsa, index: number): string {
  const pin = rsa.descriptions[index]?.pin;
  return pin != null ? String(pin) : '';
}

// Verified header sets, copied exactly from the downloaded Bulk Upload
// templates (only the columns this builder actually populates).
export const CAMPAIGN_HEADERS = [
  'Row Type', 'Action', 'Campaign status', 'Campaign', 'Campaign type', 'Networks',
  'Budget', 'Budget type', 'Bid strategy type', 'Target CPA', 'Target ROAS',
  'Target Impression Share', 'Campaign start date', 'Campaign end date',
  'Location', 'Exclusion', 'Label', 'Tracking template', 'Final URL suffix',
  'Custom parameter', 'EU political ads',
] as const;

export const AD_GROUP_HEADERS = [
  'Row Type', 'Action', 'Ad group status', 'Campaign', 'Ad group', 'Default max. CPC',
] as const;

export const KEYWORD_HEADERS = [
  'Row Type', 'Action', 'Keyword status', 'Campaign', 'Ad group', 'Keyword', 'Type',
  'Default max. CPC', 'Final URL', 'Mobile final URL',
] as const;

export const NEGATIVE_KEYWORD_HEADERS = [
  'Row Type', 'Action', 'Level', 'Campaign', 'Ad group', 'Negative keyword', 'Type',
] as const;

export const RSA_HEADERS = [
  'Row Type', 'Action', 'Ad status', 'Campaign', 'Ad group', 'Ad type',
  'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5',
  'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10',
  'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15',
  'Description 1', 'Description 2', 'Description 3', 'Description 4',
  'Headline 1 position', 'Headline 2 position', 'Headline 3 position',
  'Headline 4 position', 'Headline 5 position', 'Headline 6 position',
  'Headline 7 position', 'Headline 8 position', 'Headline 9 position',
  'Headline 10 position', 'Headline 11 position', 'Headline 12 position',
  'Headline 13 position', 'Headline 14 position', 'Headline 15 position',
  'Description 1 position', 'Description 2 position', 'Description 3 position', 'Description 4 position',
  'Path 1', 'Path 2', 'Final URL', 'Mobile final URL',
  'Tracking template', 'Final URL suffix', 'Custom parameter',
] as const;

type Row = Record<string, string>;

function campaignRow(bundle: SearchCampaignBundle): Row {
  const c = bundle.campaign;
  return {
    'Row Type': 'Campaign',
    Action: 'Add',
    'Campaign status': c.status,
    Campaign: c.name,
    'Campaign type': 'Search',
    Networks: buildSearchNetworks(c.searchPartners, c.displayExpansionEnabled),
    Budget: fmtMoney(c.budget),
    'Budget type': c.budgetType,
    'Bid strategy type': c.bidStrategyType,
    'Target CPA': c.targetCpa != null ? fmtMoney(c.targetCpa) : '',
    'Target ROAS': c.targetRoas != null ? String(c.targetRoas) : '',
    'Target Impression Share': c.targetImpressionShare != null ? String(c.targetImpressionShare) : '',
    'Campaign start date': c.startDate ?? '',
    'Campaign end date': c.endDate ?? '',
    Location: locationCell(bundle, false),
    Exclusion: locationCell(bundle, true),
    Label: c.labels ?? '',
    'Tracking template': c.trackingTemplate ?? '',
    'Final URL suffix': c.finalUrlSuffix ?? '',
    'Custom parameter': c.customParameter ?? '',
    'EU political ads': c.euPoliticalAds,
  };
}

function adGroupRows(bundle: SearchCampaignBundle): Row[] {
  return bundle.adGroups.map((ag) => ({
    'Row Type': 'Ad group',
    Action: 'Add',
    'Ad group status': ag.status,
    Campaign: bundle.campaign.name,
    'Ad group': ag.name,
    'Default max. CPC': ag.defaultMaxCpc != null ? fmtMoney(ag.defaultMaxCpc) : '',
  }));
}

function keywordRows(bundle: SearchCampaignBundle): Row[] {
  const adGroupName = new Map(bundle.adGroups.map((a) => [a.id, a.name]));
  return bundle.keywords
    .filter((kw) => kw.text.trim())
    .map((kw) => ({
      'Row Type': 'Keyword',
      Action: 'Add',
      'Keyword status': kw.status,
      Campaign: bundle.campaign.name,
      'Ad group': adGroupName.get(kw.adGroupId) ?? '',
      Keyword: kw.text.trim(),
      Type: kw.matchType,
      'Default max. CPC': kw.maxCpc != null ? fmtMoney(kw.maxCpc) : '',
      'Final URL': kw.finalUrl ?? '',
      'Mobile final URL': kw.finalMobileUrl ?? '',
    }));
}

function negativeKeywordRows(bundle: SearchCampaignBundle): Row[] {
  const adGroupName = new Map(bundle.adGroups.map((a) => [a.id, a.name]));
  return bundle.negativeKeywords
    .filter((n) => n.text.trim())
    .map((n) => ({
      'Row Type': 'Negative keyword',
      Action: 'Add',
      Level: n.level,
      Campaign: bundle.campaign.name,
      'Ad group': n.level === 'Ad group' ? (adGroupName.get(n.scopeId) ?? '') : '',
      'Negative keyword': n.text.trim(),
      Type: n.matchType,
    }));
}

function rsaRows(bundle: SearchCampaignBundle): Row[] {
  const adGroupName = new Map(bundle.adGroups.map((a) => [a.id, a.name]));
  return bundle.rsas.map((rsa) => {
    const row: Row = {
      'Row Type': 'Ad',
      Action: 'Add',
      'Ad status': rsa.status,
      Campaign: bundle.campaign.name,
      'Ad group': adGroupName.get(rsa.adGroupId) ?? '',
      'Ad type': 'Responsive search ad',
      'Path 1': rsa.path1 ?? '',
      'Path 2': rsa.path2 ?? '',
      'Final URL': rsa.finalUrl ?? '',
      'Mobile final URL': rsa.finalMobileUrl ?? '',
      'Tracking template': rsa.trackingTemplate ?? '',
      'Final URL suffix': rsa.finalUrlSuffix ?? '',
      'Custom parameter': rsa.customParameter ?? '',
    };
    for (let i = 0; i < 15; i++) {
      row[`Headline ${i + 1}`] = rsaHeadlineCell(rsa, i);
      row[`Headline ${i + 1} position`] = rsaHeadlinePinCell(rsa, i);
    }
    for (let i = 0; i < 4; i++) {
      row[`Description ${i + 1}`] = rsaDescriptionCell(rsa, i);
      row[`Description ${i + 1} position`] = rsaDescriptionPinCell(rsa, i);
    }
    return row;
  });
}

/** Builds the full Bulk Upload workbook — one tab per entity type. */
export async function buildSearchBulkUploadWorkbook(bundles: SearchCampaignBundle[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const campaignSheet = wb.addWorksheet('Campaigns');
  campaignSheet.addRow([...CAMPAIGN_HEADERS]);
  bundles.forEach((b) => campaignSheet.addRow(CAMPAIGN_HEADERS.map((h) => campaignRow(b)[h] ?? '')));

  const adGroupSheet = wb.addWorksheet('Ad groups');
  adGroupSheet.addRow([...AD_GROUP_HEADERS]);
  bundles.flatMap(adGroupRows).forEach((r) => adGroupSheet.addRow(AD_GROUP_HEADERS.map((h) => r[h] ?? '')));

  const keywordSheet = wb.addWorksheet('Keywords');
  keywordSheet.addRow([...KEYWORD_HEADERS]);
  bundles.flatMap(keywordRows).forEach((r) => keywordSheet.addRow(KEYWORD_HEADERS.map((h) => r[h] ?? '')));

  const negativeSheet = wb.addWorksheet('Negative keywords');
  negativeSheet.addRow([...NEGATIVE_KEYWORD_HEADERS]);
  bundles.flatMap(negativeKeywordRows).forEach((r) => negativeSheet.addRow(NEGATIVE_KEYWORD_HEADERS.map((h) => r[h] ?? '')));

  const rsaSheet = wb.addWorksheet('Ads');
  rsaSheet.addRow([...RSA_HEADERS]);
  bundles.flatMap(rsaRows).forEach((r) => rsaSheet.addRow(RSA_HEADERS.map((h) => r[h] ?? '')));

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
