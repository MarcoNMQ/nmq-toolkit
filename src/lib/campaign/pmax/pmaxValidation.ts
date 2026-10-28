// Blocking validator + warnings for Standard PMAX. Deliberately independent
// of searchValidation.ts (separate canonical schemas per channel), even
// where the logic looks similar (double-width counting, URL checks) — PMAX
// must never import from the Search module or vice versa.

import type { PmaxAsset, PmaxAssetGroup, PmaxCampaign, PmaxCampaignBundle } from './pmaxTypes';
import {
  PMAX_BID_STRATEGIES, bidStrategyNeedsTargetCpa, bidStrategyNeedsTargetRoas,
  PMAX_MAX_ASSET_GROUPS, PMAX_ASSET_GROUP_NAME_MAX_LENGTH,
  PMAX_HEADLINE_MIN, PMAX_HEADLINE_MAX, PMAX_HEADLINE_MAX_CHARS, PMAX_HEADLINE_RECOMMEND_MIN,
  PMAX_LONG_HEADLINE_MIN, PMAX_LONG_HEADLINE_MAX, PMAX_LONG_HEADLINE_MAX_CHARS, PMAX_LONG_HEADLINE_RECOMMEND_MIN,
  PMAX_DESCRIPTION_MIN, PMAX_DESCRIPTION_MAX, PMAX_DESCRIPTION_MAX_CHARS, PMAX_DESCRIPTION_SHORT_MAX_CHARS, PMAX_DESCRIPTION_RECOMMEND_MIN,
  PMAX_BUSINESS_NAME_MAX_CHARS, PMAX_MAX_SEARCH_THEMES, PMAX_FINAL_URL_MAX_CHARS, PMAX_PATH_MAX_CHARS,
  PMAX_MAX_VIDEOS,
} from './pmaxDefaults';
import { isPmaxImageRole, validateImageAssetMetadata, validateVideoAsset } from './pmaxAssetValidation';

/** Google's double-width counting rule, reimplemented locally — PMAX and
 *  Search are separate modules on purpose, even for small shared-looking
 *  utilities, so neither can accidentally start depending on the other. */
function googleCharWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isWide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x3fffd);
    width += isWide ? 2 : 1;
  }
  return width;
}

function isValidFinalUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Cheap near-duplicate check: same normalized word set regardless of order
 *  (e.g. "fishing rods" vs "rods fishing"). Exact duplicates are caught
 *  separately and are blocking; this is warning-only. */
function isNearDuplicate(a: string, b: string): boolean {
  const wordsA = new Set(normalizeText(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared += 1;
  const union = new Set([...wordsA, ...wordsB]).size;
  return shared / union >= 0.8;
}

function assetsForGroup(campaign: PmaxCampaign, assetGroupId: string): PmaxAsset[] {
  const assetIds = new Set(
    campaign.assetGroupAssetLinks.filter((l) => l.assetGroupId === assetGroupId).map((l) => l.assetId),
  );
  return campaign.assets.filter((a) => assetIds.has(a.id));
}

function campaignLevelAssets(campaign: PmaxCampaign): PmaxAsset[] {
  const assetIds = new Set(campaign.campaignAssetLinks.map((l) => l.assetId));
  return campaign.assets.filter((a) => assetIds.has(a.id));
}

function validateTextAssets(label: string, assets: PmaxAsset[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const headlines = assets.filter((a) => a.role === 'headline' && (a.text ?? '').trim());
  const uniqueHeadlines = new Set(headlines.map((a) => normalizeText(a.text ?? '')));
  if (headlines.length < PMAX_HEADLINE_MIN || headlines.length > PMAX_HEADLINE_MAX) {
    errors.push(`${label}: needs ${PMAX_HEADLINE_MIN} to ${PMAX_HEADLINE_MAX} non-empty headlines (has ${headlines.length}).`);
  }
  if (uniqueHeadlines.size !== headlines.length) errors.push(`${label}: headlines must be unique.`);
  headlines.forEach((h, i) => {
    const w = googleCharWidth(h.text ?? '');
    if (w > PMAX_HEADLINE_MAX_CHARS) errors.push(`${label}: headline ${i + 1} is ${w} characters wide (max ${PMAX_HEADLINE_MAX_CHARS}).`);
  });
  if (headlines.length < PMAX_HEADLINE_RECOMMEND_MIN) warnings.push(`${label}: fewer than ${PMAX_HEADLINE_RECOMMEND_MIN} headlines — Google recommends more for ad strength.`);
  if (headlines.length > 0 && !headlines.some((h) => googleCharWidth(h.text ?? '') <= 15)) {
    warnings.push(`${label}: no headline is 15 characters or fewer — recommended for narrower placements.`);
  }

  const longHeadlines = assets.filter((a) => a.role === 'long_headline' && (a.text ?? '').trim());
  const uniqueLong = new Set(longHeadlines.map((a) => normalizeText(a.text ?? '')));
  if (longHeadlines.length < PMAX_LONG_HEADLINE_MIN || longHeadlines.length > PMAX_LONG_HEADLINE_MAX) {
    errors.push(`${label}: needs ${PMAX_LONG_HEADLINE_MIN} to ${PMAX_LONG_HEADLINE_MAX} non-empty long headlines (has ${longHeadlines.length}).`);
  }
  if (uniqueLong.size !== longHeadlines.length) errors.push(`${label}: long headlines must be unique.`);
  longHeadlines.forEach((h, i) => {
    const w = googleCharWidth(h.text ?? '');
    if (w > PMAX_LONG_HEADLINE_MAX_CHARS) errors.push(`${label}: long headline ${i + 1} is ${w} characters wide (max ${PMAX_LONG_HEADLINE_MAX_CHARS}).`);
  });
  if (longHeadlines.length < PMAX_LONG_HEADLINE_RECOMMEND_MIN) warnings.push(`${label}: fewer than ${PMAX_LONG_HEADLINE_RECOMMEND_MIN} long headlines — Google recommends more for ad strength.`);

  const descriptions = assets.filter((a) => a.role === 'description' && (a.text ?? '').trim());
  const uniqueDesc = new Set(descriptions.map((a) => normalizeText(a.text ?? '')));
  if (descriptions.length < PMAX_DESCRIPTION_MIN || descriptions.length > PMAX_DESCRIPTION_MAX) {
    errors.push(`${label}: needs ${PMAX_DESCRIPTION_MIN} to ${PMAX_DESCRIPTION_MAX} non-empty descriptions (has ${descriptions.length}).`);
  }
  if (uniqueDesc.size !== descriptions.length) errors.push(`${label}: descriptions must be unique.`);
  let anyShort = false;
  descriptions.forEach((d, i) => {
    const w = googleCharWidth(d.text ?? '');
    if (w > PMAX_DESCRIPTION_MAX_CHARS) errors.push(`${label}: description ${i + 1} is ${w} characters wide (max ${PMAX_DESCRIPTION_MAX_CHARS}).`);
    if (w <= PMAX_DESCRIPTION_SHORT_MAX_CHARS) anyShort = true;
  });
  if (descriptions.length > 0 && !anyShort) {
    errors.push(`${label}: at least one description must be ${PMAX_DESCRIPTION_SHORT_MAX_CHARS} characters or fewer.`);
  }
  if (descriptions.length < PMAX_DESCRIPTION_RECOMMEND_MIN) warnings.push(`${label}: fewer than ${PMAX_DESCRIPTION_RECOMMEND_MIN} descriptions — Google recommends more for ad strength.`);

  // Warn on cross-role near-duplicate headline text (a common copy/paste mistake).
  for (let i = 0; i < headlines.length; i++) {
    for (let j = i + 1; j < headlines.length; j++) {
      if (isNearDuplicate(headlines[i].text ?? '', headlines[j].text ?? '')) {
        warnings.push(`${label}: headlines ${i + 1} and ${j + 1} look like near-duplicates.`);
      }
    }
  }

  const businessNames = assets.filter((a) => a.role === 'business_name' && (a.text ?? '').trim());
  businessNames.forEach((b) => {
    const w = googleCharWidth(b.text ?? '');
    if (w > PMAX_BUSINESS_NAME_MAX_CHARS) errors.push(`${label}: business name is ${w} characters wide (max ${PMAX_BUSINESS_NAME_MAX_CHARS}).`);
  });

  return { errors, warnings };
}

function validateImageAndVideoAssets(label: string, assets: PmaxAsset[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const byRole = (role: string) => assets.filter((a) => a.role === role);

  for (const role of ['marketing_image_landscape', 'marketing_image_square', 'marketing_image_portrait', 'logo_square', 'logo_landscape'] as const) {
    if (!isPmaxImageRole(role)) continue;
    const roleAssets = byRole(role);
    roleAssets.forEach((a, i) => {
      errors.push(...validateImageAssetMetadata(role, a, `${label}: ${role.replace(/_/g, ' ')} ${i + 1}`));
    });
  }

  const landscape = byRole('marketing_image_landscape');
  const square = byRole('marketing_image_square');
  const portrait = byRole('marketing_image_portrait');
  if (landscape.length === 0) errors.push(`${label}: at least one landscape marketing image is required.`);
  if (square.length === 0) errors.push(`${label}: at least one square marketing image is required.`);
  if (landscape.length > 0 && landscape.length < 4) warnings.push(`${label}: fewer than 4 landscape images — Google recommends more.`);
  if (square.length > 0 && square.length < 4) warnings.push(`${label}: fewer than 4 square images — Google recommends more.`);
  if (portrait.length === 1) warnings.push(`${label}: only one portrait image — Google recommends at least 2 if you're providing any.`);

  const videos = byRole('youtube_video');
  if (videos.length > PMAX_MAX_VIDEOS) errors.push(`${label}: ${videos.length} videos exceeds the maximum of ${PMAX_MAX_VIDEOS}.`);
  videos.forEach((v, i) => {
    const { errors: vErrors, warnings: vWarnings } = validateVideoAsset(v.youtubeVideoId ?? '', `${label}: video ${i + 1}`);
    errors.push(...vErrors);
    warnings.push(...vWarnings);
  });
  if (videos.length === 0) warnings.push(`${label}: no video supplied — Google may auto-generate one if none is provided.`);

  return { errors, warnings };
}

function validateAssetGroup(campaign: PmaxCampaign, group: PmaxAssetGroup): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = `Asset group "${group.name || '—'}"`;

  if (!group.name.trim()) errors.push(`${label}: name is required.`);
  if (group.name.length > PMAX_ASSET_GROUP_NAME_MAX_LENGTH) errors.push(`${label}: name is ${group.name.length} characters (max ${PMAX_ASSET_GROUP_NAME_MAX_LENGTH}).`);

  if (!group.finalUrl || !isValidFinalUrl(group.finalUrl)) {
    errors.push(`${label}: Final URL must be an absolute http:// or https:// URL.`);
  } else if (group.finalUrl.length > PMAX_FINAL_URL_MAX_CHARS) {
    errors.push(`${label}: Final URL exceeds ${PMAX_FINAL_URL_MAX_CHARS} characters.`);
  }
  if (group.path2 && !group.path1) errors.push(`${label}: Path 2 requires Path 1.`);
  if (group.path1 && group.path1.length > PMAX_PATH_MAX_CHARS) errors.push(`${label}: Path 1 is ${group.path1.length} characters (max ${PMAX_PATH_MAX_CHARS}).`);
  if (group.path2 && group.path2.length > PMAX_PATH_MAX_CHARS) errors.push(`${label}: Path 2 is ${group.path2.length} characters (max ${PMAX_PATH_MAX_CHARS}).`);

  const linked = assetsForGroup(campaign, group.id);
  // When brand guidelines are off, business name/logo must live at
  // asset-group scope instead of campaign scope — validated here as part of
  // this group's own text/image assets, which already include those roles
  // when the UI links them this way.
  const textResult = validateTextAssets(label, linked);
  errors.push(...textResult.errors);
  warnings.push(...textResult.warnings);
  const mediaResult = validateImageAndVideoAssets(label, linked);
  errors.push(...mediaResult.errors);
  warnings.push(...mediaResult.warnings);

  if (!campaign.brandGuidelines.enabled) {
    const businessNames = linked.filter((a) => a.role === 'business_name' && (a.text ?? '').trim());
    if (businessNames.length !== 1) errors.push(`${label}: brand guidelines are off, so this asset group needs exactly one business name (has ${businessNames.length}).`);
    const squareLogos = linked.filter((a) => a.role === 'logo_square');
    const landscapeLogos = linked.filter((a) => a.role === 'logo_landscape');
    const totalLogos = squareLogos.length + landscapeLogos.length;
    if (totalLogos < 1 || totalLogos > 5) errors.push(`${label}: needs 1 to 5 logos (has ${totalLogos}).`);
    if (squareLogos.length === 0) errors.push(`${label}: at least one square logo is required.`);
  }

  const themes = campaign.signals.filter((s) => s.assetGroupId === group.id && s.kind === 'search_theme');
  const nonBlank = themes.filter((t) => (t.searchThemeText ?? '').trim());
  if (nonBlank.length !== themes.length) errors.push(`${label}: blank search themes aren't allowed.`);
  const seenThemes = new Map<string, number>();
  nonBlank.forEach((t) => {
    const key = normalizeText(t.searchThemeText ?? '');
    seenThemes.set(key, (seenThemes.get(key) ?? 0) + 1);
  });
  for (const [key, count] of seenThemes) {
    if (count > 1) errors.push(`${label}: duplicate search theme "${key}".`);
  }
  if (nonBlank.length > PMAX_MAX_SEARCH_THEMES) errors.push(`${label}: ${nonBlank.length} search themes exceeds the maximum of ${PMAX_MAX_SEARCH_THEMES}.`);
  for (let i = 0; i < nonBlank.length; i++) {
    for (let j = i + 1; j < nonBlank.length; j++) {
      if (isNearDuplicate(nonBlank[i].searchThemeText ?? '', nonBlank[j].searchThemeText ?? '')) {
        warnings.push(`${label}: search themes "${nonBlank[i].searchThemeText}" and "${nonBlank[j].searchThemeText}" look like near-duplicates.`);
      }
    }
  }
  if (nonBlank.length === 0) {
    const anyAudience = campaign.signals.some((s) => s.assetGroupId === group.id && s.kind === 'audience' && s.audienceRef?.trim());
    if (!anyAudience) warnings.push(`${label}: no audience signals or search themes — these are optional hints, but help Google find the right people faster.`);
  }

  return { errors, warnings };
}

export function validatePmaxBundles(bundles: PmaxCampaignBundle[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!bundles || bundles.length === 0) return { errors, warnings };

  const nameCounts = new Map<string, number>();
  for (const b of bundles) {
    const key = b.campaign.name.trim().toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  for (const { campaign } of bundles) {
    const label = `Campaign "${campaign.name || '—'}"`;

    if (campaign.variant !== 'standard') {
      errors.push(`${label}: Retail PMAX isn't implemented yet — only Standard PMAX can be exported.`);
      continue;
    }

    if (!campaign.name.trim()) errors.push(`${label}: campaign name is required.`);
    if ((nameCounts.get(campaign.name.trim().toLowerCase()) ?? 0) > 1) {
      errors.push(`${label}: campaign name collides with another campaign in this export.`);
    }

    if (!(campaign.budget.amount > 0)) errors.push(`${label}: budget must be greater than zero.`);
    if (!campaign.euPoliticalAds) errors.push(`${label}: EU political ads declaration is required.`);

    if (!PMAX_BID_STRATEGIES.includes(campaign.bidStrategyType)) {
      errors.push(`${label}: "${campaign.bidStrategyType}" isn't a supported PMAX bid strategy — only Maximize Conversions and Maximize Conversion Value are.`);
    }
    if (campaign.targetCpa != null) {
      if (!bidStrategyNeedsTargetCpa(campaign.bidStrategyType)) errors.push(`${label}: Target CPA is only valid with Maximize Conversions.`);
      else if (!(campaign.targetCpa > 0)) errors.push(`${label}: Target CPA must be greater than zero.`);
    }
    if (campaign.targetRoas != null) {
      if (!bidStrategyNeedsTargetRoas(campaign.bidStrategyType)) errors.push(`${label}: Target ROAS is only valid with Maximize Conversion Value.`);
      else if (!(campaign.targetRoas > 0)) errors.push(`${label}: Target ROAS must be greater than zero.`);
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (campaign.startDate && new Date(campaign.startDate).getTime() < today.getTime()) {
      errors.push(`${label}: start date cannot be in the past.`);
    }
    if (campaign.startDate && campaign.endDate && new Date(campaign.endDate).getTime() < new Date(campaign.startDate).getTime()) {
      errors.push(`${label}: end date must be on or after the start date.`);
    }

    const includedLocations = campaign.locations.filter((l) => !l.excluded);
    if (includedLocations.length === 0) errors.push(`${label}: at least one included location is required.`);

    if (campaign.conversionGoal.mode === 'campaign_specific' && campaign.conversionGoal.goalNames.length === 0) {
      errors.push(`${label}: campaign-specific conversion goals selected but none named.`);
    }

    if (campaign.assetGroups.length === 0 || campaign.assetGroups.length > PMAX_MAX_ASSET_GROUPS) {
      errors.push(`${label}: needs 1 to ${PMAX_MAX_ASSET_GROUPS} asset groups (has ${campaign.assetGroups.length}).`);
    }
    const groupNameCounts = new Map<string, number>();
    for (const g of campaign.assetGroups) {
      const key = g.name.trim().toLowerCase();
      groupNameCounts.set(key, (groupNameCounts.get(key) ?? 0) + 1);
    }
    for (const g of campaign.assetGroups) {
      if ((groupNameCounts.get(g.name.trim().toLowerCase()) ?? 0) > 1) {
        errors.push(`Asset group "${g.name || '—'}": name collides with another asset group in this campaign.`);
      }
    }

    if (campaign.brandGuidelines.enabled) {
      const campaignAssets = campaignLevelAssets(campaign);
      const businessNames = campaignAssets.filter((a) => a.role === 'business_name' && (a.text ?? '').trim());
      if (businessNames.length !== 1) errors.push(`${label}: brand guidelines are on, so the campaign needs exactly one business name asset (has ${businessNames.length}).`);
      businessNames.forEach((b) => {
        const w = googleCharWidth(b.text ?? '');
        if (w > PMAX_BUSINESS_NAME_MAX_CHARS) errors.push(`${label}: business name is ${w} characters wide (max ${PMAX_BUSINESS_NAME_MAX_CHARS}).`);
      });
      const squareLogos = campaignAssets.filter((a) => a.role === 'logo_square');
      const landscapeLogos = campaignAssets.filter((a) => a.role === 'logo_landscape');
      [...squareLogos].forEach((a, i) => errors.push(...validateImageAssetMetadata('logo_square', a, `${label}: square logo ${i + 1}`)));
      [...landscapeLogos].forEach((a, i) => errors.push(...validateImageAssetMetadata('logo_landscape', a, `${label}: landscape logo ${i + 1}`)));
      const totalLogos = squareLogos.length + landscapeLogos.length;
      if (totalLogos < 1 || totalLogos > 5) errors.push(`${label}: needs 1 to 5 logos (has ${totalLogos}).`);
      if (squareLogos.length === 0) errors.push(`${label}: at least one square logo is required.`);
    }

    if (campaign.lifecycle.newCustomerAcquisitionEnabled && !bidStrategyNeedsTargetRoas(campaign.bidStrategyType) && campaign.lifecycle.newCustomerValueAdjustmentPct == null) {
      warnings.push(`${label}: new-customer bidding usually needs value-based bidding (Maximize Conversion Value) to take effect.`);
    }
    if (campaign.lifecycle.retentionEnabled && campaign.lifecycle.requiredCustomerMatchLists.length === 0) {
      errors.push(`${label}: retention/re-engagement is enabled but no Customer Match list is named.`);
    }

    for (const group of campaign.assetGroups) {
      const result = validateAssetGroup(campaign, group);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
  }

  return { errors, warnings };
}
