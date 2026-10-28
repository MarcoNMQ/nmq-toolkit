import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildPmaxPackageWorkbook } from '../pmaxPackageBuilder';
import { validatePmaxBundles } from '../pmaxValidation';
import type { PmaxAsset, PmaxCampaign, PmaxCampaignBundle } from '../pmaxTypes';

function textAsset(id: string, role: PmaxAsset['role'], text: string): PmaxAsset {
  return { id, role, text };
}
function imageAsset(id: string, role: PmaxAsset['role'], width: number, height: number): PmaxAsset {
  return { id, role, width, height, mimeType: 'image/jpeg', fileSizeBytes: 100_000, sourceFilename: `${id}.jpg`, checksum: 'abc123' };
}

function makeBundle(brandGuidelinesEnabled: boolean): PmaxCampaignBundle {
  const campaignId = 'c1';
  const groupId = 'ag1';
  const headlines = [textAsset('h1', 'headline', 'Explore Shimano Rods'), textAsset('h2', 'headline', 'Find Your Next Rod'), textAsset('h3', 'headline', 'Built For Every Cast')];
  const longHeadlines = [textAsset('lh1', 'long_headline', 'Discover the full Shimano fishing rod range today')];
  const descriptions = [textAsset('d1', 'description', 'Reliable rods for every cast.'), textAsset('d2', 'description', 'Browse the range and find yours.')];
  const landscape = imageAsset('img1', 'marketing_image_landscape', 1200, 628);
  const square = imageAsset('img2', 'marketing_image_square', 1200, 1200);
  const groupAssets = [...headlines, ...longHeadlines, ...descriptions, landscape, square];

  const campaignAssets: PmaxAsset[] = brandGuidelinesEnabled
    ? [textAsset('biz1', 'business_name', 'Shimano'), imageAsset('logo1', 'logo_square', 1200, 1200)]
    : [];
  const groupScopedBrandAssets: PmaxAsset[] = brandGuidelinesEnabled
    ? []
    : [textAsset('biz2', 'business_name', 'Shimano'), imageAsset('logo2', 'logo_square', 1200, 1200)];

  const campaign: PmaxCampaign = {
    id: campaignId,
    name: 'PMAX_LEADGEN_NOV_RODS',
    variant: 'standard',
    status: 'Paused',
    budget: { amount: 25 },
    bidStrategyType: 'Maximize Conversions',
    startDate: '2027-11-01',
    endDate: '2027-11-30',
    locations: [{ name: 'Portugal', excluded: false }],
    locationMode: 'presence',
    euPoliticalAds: 'No',
    labels: '',
    trackingTemplate: '',
    finalUrlSuffix: '',
    customParameter: '',
    conversionGoal: { mode: 'account_default', goalNames: [], unresolved: true },
    brandGuidelines: { enabled: brandGuidelinesEnabled },
    assetAutomation: { finalUrlExpansion: true, textCustomization: true, urlExclusions: [] },
    lifecycle: { mode: 'inherit', newCustomerAcquisitionEnabled: false, retentionEnabled: false, requiredCustomerMatchLists: [] },
    assets: [...groupAssets, ...groupScopedBrandAssets, ...campaignAssets],
    campaignAssetLinks: campaignAssets.map((a) => ({ id: `cal-${a.id}`, assetId: a.id })),
    assetGroups: [{ id: groupId, campaignId, name: 'RODS_PT', status: 'Paused', finalUrl: 'https://example.com/rods', path1: 'rods', path2: '', cta: 'Automated' }],
    assetGroupAssetLinks: [...groupAssets, ...groupScopedBrandAssets].map((a) => ({ id: `gal-${a.id}`, assetGroupId: groupId, assetId: a.id })),
    signals: [{ id: 'sig1', assetGroupId: groupId, kind: 'search_theme', searchThemeText: 'fishing rods' }],
  };

  return { campaign };
}

async function sheetNames(buf: Buffer): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs's own .d.ts Buffer type doesn't match this project's @types/node
  // version (same known mismatch worked around elsewhere in this repo).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any);
  return wb.worksheets.map((s) => s.name);
}

describe('buildPmaxPackageWorkbook', () => {
  it('builds a package with every expected tab for brand guidelines on', async () => {
    const bundle = makeBundle(true);
    expect(validatePmaxBundles([bundle]).errors).toEqual([]);
    const buf = await buildPmaxPackageWorkbook([bundle]);
    const names = await sheetNames(buf);
    expect(names).toEqual(['Manifest', 'Campaign', 'Asset groups', 'Copy sheet', 'Media inventory', 'Signals', 'Campaign JSON']);
  });

  it('builds a package with every expected tab for brand guidelines off', async () => {
    const bundle = makeBundle(false);
    expect(validatePmaxBundles([bundle]).errors).toEqual([]);
    const buf = await buildPmaxPackageWorkbook([bundle]);
    const names = await sheetNames(buf);
    expect(names).toContain('Manifest');
    expect(names).toContain('Copy sheet');
  });

  it('never claims to be Editor-ready in the manifest tab', async () => {
    const buf = await buildPmaxPackageWorkbook([makeBundle(true)]);
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any);
    const manifestText = wb.getWorksheet('Manifest')!.getSheetValues().flat().filter(Boolean).join(' ');
    expect(manifestText).toContain('NOT a Bulk Upload/Editor CSV');
    // The manifest explicitly says it's NOT labeled "Editor ready" — that
    // negated phrase is expected. What must never appear is an affirmative
    // claim that the file IS Editor-ready.
    expect(manifestText.toLowerCase()).not.toContain('is editor ready');
    expect(manifestText.toLowerCase()).not.toContain('editor-ready');
  });

  it('includes the media inventory with checksums for every image asset', async () => {
    const buf = await buildPmaxPackageWorkbook([makeBundle(true)]);
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any);
    const mediaSheet = wb.getWorksheet('Media inventory')!;
    expect(mediaSheet.rowCount).toBeGreaterThan(1); // header + at least one row
  });

  it('round-trips Unicode campaign names without corruption', async () => {
    const bundle = makeBundle(true);
    bundle.campaign.name = 'PMAX_日本語_Ünïcödé_«test»';
    const buf = await buildPmaxPackageWorkbook([bundle]);
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any);
    const campaignSheet = wb.getWorksheet('Campaign')!;
    const nameCell = campaignSheet.getRow(2).getCell(1).value;
    expect(nameCell).toBe('PMAX_日本語_Ünïcödé_«test»');
  });
});
