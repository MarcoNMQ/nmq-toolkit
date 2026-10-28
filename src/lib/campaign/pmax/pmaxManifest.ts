// The preflight/export manifest for a PMAX build package — describes what
// was resolved, what's fixture-gated, and what the user still has to check
// manually in the Google Ads UI before enabling anything. See
// pmaxPackageBuilder.ts for how this becomes a workbook tab.

import type { PmaxCampaignBundle, PmaxManualManifestItem } from './pmaxTypes';

export const PMAX_SCHEMA_VERSION = '1.0.0';
/** No Editor fixture has been captured yet — direct Editor/Bulk Upload CSV
 *  export stays disabled until one exists (see pmaxPackageBuilder.ts). */
export const PMAX_EDITOR_FIXTURE_VERSION = 'none — direct Editor/Bulk Upload export not yet implemented';

export function pmaxManualManifestItems(bundle: PmaxCampaignBundle): PmaxManualManifestItem[] {
  const { campaign } = bundle;
  const items: PmaxManualManifestItem[] = [
    { category: 'Conversion goals', description: `Mode: ${campaign.conversionGoal.mode}. Goal names entered: ${campaign.conversionGoal.goalNames.join(', ') || '(none)'}. Not verified against any Google Ads account — confirm these conversion actions actually exist before enabling.` },
    { category: 'AI Max', description: 'AI Max (search term matching, URL expansion/inclusions/exclusions, brand lists, locations of interest) has no verified Bulk Upload/Editor column set yet. Review and configure AI Max directly in the Google Ads UI after import.' },
    { category: 'Billing & account linkages', description: 'Confirm billing, account access and conversion tracking are live on the destination account before enabling this campaign.' },
    { category: 'Asset policy & eligibility', description: 'Confirm all images, logos and videos pass Google policy review and asset eligibility checks in the Ads UI.' },
  ];
  if (campaign.euPoliticalAds) {
    items.push({ category: 'EU political advertising', description: `Declared as "${campaign.euPoliticalAds}" in this tool — re-confirm the exact declaration in the Google Ads UI, since the Bulk Upload/Editor CSV contract for this field isn't fixture-verified yet.` });
  }
  if (campaign.lifecycle.retentionEnabled || campaign.lifecycle.newCustomerAcquisitionEnabled) {
    items.push({ category: 'Customer lifecycle goals', description: `Requires resolved Customer Match lists (${campaign.lifecycle.requiredCustomerMatchLists.join(', ') || 'none named'}) and compatible bidding — confirm these resources exist in the destination account.` });
  }
  return items;
}

export function pmaxFixtureGatedFields(): string[] {
  return [
    'Direct Editor/Bulk Upload CSV or ZIP export for PMAX (no verified campaign-type token, asset-group row identity, or asset-link row structure exists yet)',
    'Asset-group status/identity row tokens',
    'Brand-guideline campaign-asset row structure',
    'CTA enum tokens',
    'Numbered image/logo/video role→column mapping',
    'Audience-signal and search-theme row structure',
    'Conversion-goal and lifecycle rows',
    'Retail/Merchant Center fields and listing-group tree grammar',
    'Final URL expansion/automation settings rows',
    'Update identity and #Original behavior for PMAX children',
  ];
}
