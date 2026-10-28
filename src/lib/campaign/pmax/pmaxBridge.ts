// Thin normalization layer between whatever JSON the client posts to
// /api/campaign/export (platform: "google_pmax") and the canonical
// PmaxCampaignBundle the validator/package builder expect. Mirrors
// google/searchBridge.ts's role, even though PMAX's store shape already
// matches its canonical type 1:1 (unlike Search, which bridges from the
// shared GoogleCampaign shape) — this still defensively fills in arrays a
// stale client payload might be missing, rather than letting the validator
// throw on `undefined.filter`.

import type { PmaxCampaign, PmaxCampaignBundle } from './pmaxTypes';

export function buildPmaxBundles(campaigns: PmaxCampaign[]): PmaxCampaignBundle[] {
  return (campaigns ?? []).map((raw) => ({
    campaign: {
      ...raw,
      locations: raw.locations ?? [],
      assets: raw.assets ?? [],
      campaignAssetLinks: raw.campaignAssetLinks ?? [],
      assetGroups: raw.assetGroups ?? [],
      assetGroupAssetLinks: raw.assetGroupAssetLinks ?? [],
      signals: raw.signals ?? [],
    },
  }));
}
