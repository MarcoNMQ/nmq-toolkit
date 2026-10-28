// Builds the PMAX "validated build package" — explicitly NOT a Bulk
// Upload/Editor CSV. Google's own CSV documentation doesn't define the PMAX
// campaign-type token, asset-group row identity, asset-link rows, or
// listing-group grammar, so claiming this is "Google Ads Editor ready"
// would be a guess. Instead this produces a deterministic workbook a human
// uses to manually build the campaign in the Ads UI: canonical JSON, a
// preflight report, a copy sheet, a media inventory, and a manual checklist.
// Caller (api/campaign/export, platform: "google_pmax") validates first and
// never calls this when there are blocking errors.

import ExcelJS from 'exceljs';
import type { PmaxAsset, PmaxCampaignBundle } from './pmaxTypes';
import { validatePmaxBundles } from './pmaxValidation';
import { PMAX_SCHEMA_VERSION, PMAX_EDITOR_FIXTURE_VERSION, pmaxManualManifestItems, pmaxFixtureGatedFields } from './pmaxManifest';

function assetsForGroup(bundle: PmaxCampaignBundle, assetGroupId: string): PmaxAsset[] {
  const ids = new Set(bundle.campaign.assetGroupAssetLinks.filter((l) => l.assetGroupId === assetGroupId).map((l) => l.assetId));
  return bundle.campaign.assets.filter((a) => ids.has(a.id));
}

function textOf(assets: PmaxAsset[], role: string): string[] {
  return assets.filter((a) => a.role === role).map((a) => (a.text ?? '').trim()).filter(Boolean);
}

export async function buildPmaxPackageWorkbook(bundles: PmaxCampaignBundle[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const { warnings } = validatePmaxBundles(bundles);

  // ---- Manifest ----------------------------------------------------------
  const manifestSheet = wb.addWorksheet('Manifest');
  manifestSheet.addRow(['Schema version', PMAX_SCHEMA_VERSION]);
  manifestSheet.addRow(['Editor fixture version', PMAX_EDITOR_FIXTURE_VERSION]);
  manifestSheet.addRow(['Generated', new Date().toISOString()]);
  manifestSheet.addRow(['Campaigns', bundles.length]);
  manifestSheet.addRow(['Asset groups', bundles.reduce((n, b) => n + b.campaign.assetGroups.length, 0)]);
  manifestSheet.addRow(['Assets', bundles.reduce((n, b) => n + b.campaign.assets.length, 0)]);
  manifestSheet.addRow([]);
  manifestSheet.addRow(['This is a validated build package for manual setup in the Google Ads UI —']);
  manifestSheet.addRow(['it is NOT a Bulk Upload/Editor CSV and is not labeled "Editor ready".']);
  manifestSheet.addRow([]);
  manifestSheet.addRow(['Fixture-gated fields (not emitted anywhere in this package):']);
  pmaxFixtureGatedFields().forEach((f) => manifestSheet.addRow(['', f]));
  manifestSheet.addRow([]);
  manifestSheet.addRow(['Manual/account-derived checklist:']);
  bundles.forEach((b) => {
    manifestSheet.addRow([b.campaign.name || '(unnamed)']);
    pmaxManualManifestItems(b).forEach((item) => manifestSheet.addRow(['', item.category, item.description]));
  });
  if (warnings.length > 0) {
    manifestSheet.addRow([]);
    manifestSheet.addRow(['Warnings (not blocking, worth reviewing):']);
    warnings.forEach((w) => manifestSheet.addRow(['', w]));
  }

  // ---- Campaign -----------------------------------------------------------
  const campaignHeaders = [
    'Campaign', 'Variant', 'Status', 'Daily budget', 'Bid strategy', 'Target CPA', 'Target ROAS',
    'Start date', 'End date', 'Included locations', 'Excluded locations', 'EU political ads',
    'Brand guidelines', 'Final URL expansion', 'Conversion goal mode', 'Labels',
  ];
  const campaignSheet = wb.addWorksheet('Campaign');
  campaignSheet.addRow(campaignHeaders);
  bundles.forEach(({ campaign: c }) => {
    campaignSheet.addRow([
      c.name, c.variant, c.status, c.budget.amount.toFixed(2), c.bidStrategyType,
      c.targetCpa != null ? c.targetCpa.toFixed(2) : '', c.targetRoas != null ? c.targetRoas.toFixed(2) : '',
      c.startDate, c.endDate,
      c.locations.filter((l) => !l.excluded).map((l) => l.name).join(';'),
      c.locations.filter((l) => l.excluded).map((l) => l.name).join(';'),
      c.euPoliticalAds, c.brandGuidelines.enabled ? 'On' : 'Off',
      c.assetAutomation.finalUrlExpansion ? 'On' : 'Off', c.conversionGoal.mode, c.labels,
    ]);
  });

  // ---- Asset groups ---------------------------------------------------------
  const groupHeaders = ['Campaign', 'Asset group', 'Status', 'Final URL', 'Final mobile URL', 'Path 1', 'Path 2', 'CTA'];
  const groupSheet = wb.addWorksheet('Asset groups');
  groupSheet.addRow(groupHeaders);
  bundles.forEach(({ campaign: c }) => {
    c.assetGroups.forEach((g) => {
      groupSheet.addRow([c.name, g.name, g.status, g.finalUrl, g.finalMobileUrl ?? '', g.path1, g.path2, g.cta]);
    });
  });

  // ---- Copy sheet (text assets by asset group + role) ------------------------
  const copySheet = wb.addWorksheet('Copy sheet');
  copySheet.addRow(['Campaign', 'Asset group', 'Role', 'Text']);
  bundles.forEach((bundle) => {
    bundle.campaign.assetGroups.forEach((g) => {
      const linked = assetsForGroup(bundle, g.id);
      for (const role of ['headline', 'long_headline', 'description', 'business_name'] as const) {
        textOf(linked, role).forEach((text) => copySheet.addRow([bundle.campaign.name, g.name, role, text]));
      }
    });
    const campaignAssetIds = new Set(bundle.campaign.campaignAssetLinks.map((l) => l.assetId));
    const campaignAssets = bundle.campaign.assets.filter((a) => campaignAssetIds.has(a.id));
    textOf(campaignAssets, 'business_name').forEach((text) => copySheet.addRow([bundle.campaign.name, '(campaign-level brand asset)', 'business_name', text]));
  });

  // ---- Media inventory ---------------------------------------------------
  const mediaHeaders = ['Campaign', 'Scope', 'Role', 'Source filename', 'MIME type', 'Width', 'Height', 'File size (bytes)', 'Checksum (SHA-256)'];
  const mediaSheet = wb.addWorksheet('Media inventory');
  mediaSheet.addRow(mediaHeaders);
  const isMediaRole = (role: string) => role.startsWith('marketing_image_') || role.startsWith('logo_') || role === 'youtube_video';
  bundles.forEach((bundle) => {
    const campaignAssetIds = new Set(bundle.campaign.campaignAssetLinks.map((l) => l.assetId));
    bundle.campaign.assets.filter((a) => isMediaRole(a.role)).forEach((a) => {
      const scope = campaignAssetIds.has(a.id) ? '(campaign-level)' : (bundle.campaign.assetGroupAssetLinks.find((l) => l.assetId === a.id)?.assetGroupId ?? '(unlinked)');
      const scopeName = bundle.campaign.assetGroups.find((g) => g.id === scope)?.name ?? scope;
      mediaSheet.addRow([
        bundle.campaign.name, scopeName, a.role, a.sourceFilename ?? a.youtubeUrl ?? '',
        a.mimeType ?? '', a.width ?? '', a.height ?? '', a.fileSizeBytes ?? '', a.checksum ?? '',
      ]);
    });
  });

  // ---- Audience & search theme signals -------------------------------------
  const signalSheet = wb.addWorksheet('Signals');
  signalSheet.addRow(['Campaign', 'Asset group', 'Kind', 'Value']);
  bundles.forEach((bundle) => {
    bundle.campaign.signals.forEach((s) => {
      const groupName = bundle.campaign.assetGroups.find((g) => g.id === s.assetGroupId)?.name ?? '(unknown)';
      signalSheet.addRow([bundle.campaign.name, groupName, s.kind, s.kind === 'search_theme' ? s.searchThemeText : s.audienceRef]);
    });
  });

  // ---- Raw JSON (one cell per campaign — the canonical, versioned source) ----
  const jsonSheet = wb.addWorksheet('Campaign JSON');
  jsonSheet.addRow(['Campaign', 'Schema version', 'JSON']);
  bundles.forEach((b) => jsonSheet.addRow([b.campaign.name, PMAX_SCHEMA_VERSION, JSON.stringify(b.campaign)]));

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
