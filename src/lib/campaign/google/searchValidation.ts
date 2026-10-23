// Blocking validator for Search Bulk Upload export. Anything returned here
// must prevent the download entirely — no partial file. Quality
// recommendations (low asset diversity, few sitelinks, etc.) are out of
// scope for P0 since sitelinks aren't implemented yet; this file only
// covers the audit's structural, export-safety rules.

import type { SearchCampaignBundle, SearchRsa } from './searchTypes';
import {
  bidStrategyNeedsMaxCpc, bidStrategyNeedsTargetCpa, bidStrategyNeedsTargetImpressionShare, bidStrategyNeedsTargetRoas,
} from './searchDefaults';

/**
 * Google's double-width counting rule: full-width/CJK characters count as 2
 * toward the character limit, everything else counts as 1. Approximated by
 * the common full-width/wide Unicode ranges (CJK, full-width forms, hangul).
 */
export function googleCharWidth(text: string): number {
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

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function isValidFinalUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

function normalizeKeyword(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateSearchBundles(bundles: SearchCampaignBundle[]): string[] {
  const errors: string[] = [];
  if (!bundles || bundles.length === 0) return errors;

  const campaignNameCounts = new Map<string, number>();
  for (const b of bundles) {
    const key = b.campaign.name.trim().toLowerCase();
    campaignNameCounts.set(key, (campaignNameCounts.get(key) ?? 0) + 1);
  }

  for (const bundle of bundles) {
    const { campaign, adGroups, keywords, negativeKeywords, rsas } = bundle;
    const label = `Campaign "${campaign.name || '—'}"`;

    if (!campaign.name.trim()) errors.push(`${label}: campaign name is required.`);
    if ((campaignNameCounts.get(campaign.name.trim().toLowerCase()) ?? 0) > 1) {
      errors.push(`${label}: campaign name collides with another campaign in this export.`);
    }
    if (!(campaign.budget > 0)) errors.push(`${label}: budget must be greater than zero.`);
    if (!campaign.euPoliticalAds) errors.push(`${label}: EU political ads declaration is required.`);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (campaign.startDate) {
      const start = new Date(campaign.startDate);
      if (start.getTime() < today.getTime()) errors.push(`${label}: start date cannot be in the past.`);
    }
    if (campaign.startDate && campaign.endDate) {
      if (new Date(campaign.endDate).getTime() < new Date(campaign.startDate).getTime()) {
        errors.push(`${label}: end date must be on or after the start date.`);
      }
    }

    const includedLocations = campaign.locations.filter((l) => !l.excluded);
    if (includedLocations.length === 0) errors.push(`${label}: at least one included location is required.`);

    if (bidStrategyNeedsTargetCpa(campaign.bidStrategyType) && !(campaign.targetCpa && campaign.targetCpa > 0)) {
      errors.push(`${label}: Target CPA requires a positive target CPA value.`);
    }
    if (bidStrategyNeedsTargetRoas(campaign.bidStrategyType) && !(campaign.targetRoas && campaign.targetRoas > 0)) {
      errors.push(`${label}: Target ROAS requires a positive target ROAS value.`);
    }
    if (bidStrategyNeedsTargetImpressionShare(campaign.bidStrategyType) && !(campaign.targetImpressionShare && campaign.targetImpressionShare > 0)) {
      errors.push(`${label}: Target Impression Share requires a positive target percentage.`);
    }

    const adGroupNameCounts = new Map<string, number>();
    for (const ag of adGroups) {
      const key = ag.name.trim().toLowerCase();
      adGroupNameCounts.set(key, (adGroupNameCounts.get(key) ?? 0) + 1);
    }
    for (const ag of adGroups) {
      const agLabel = `${label} › Ad group "${ag.name || '—'}"`;
      if (!ag.name.trim()) errors.push(`${agLabel}: ad group name is required.`);
      if ((adGroupNameCounts.get(ag.name.trim().toLowerCase()) ?? 0) > 1) {
        errors.push(`${agLabel}: ad group name collides with another ad group in this campaign.`);
      }
      if (bidStrategyNeedsMaxCpc(campaign.bidStrategyType) && !(ag.defaultMaxCpc && ag.defaultMaxCpc > 0)) {
        errors.push(`${agLabel}: Manual CPC requires a default max. CPC.`);
      }
    }

    const seenKeywords = new Map<string, Set<string>>();
    for (const kw of keywords) {
      const ag = adGroups.find((a) => a.id === kw.adGroupId);
      const kwLabel = `${label} › Ad group "${ag?.name || '—'}" › Keyword "${kw.text || '—'}"`;
      const text = kw.text.trim();
      if (!text) { errors.push(`${kwLabel}: keyword text is required.`); continue; }
      if (text.length > 80) errors.push(`${kwLabel}: keyword is ${text.length} characters (max 80).`);
      if (wordCount(text) > 10) errors.push(`${kwLabel}: keyword has more than 10 words.`);
      if (!bidStrategyNeedsMaxCpc(campaign.bidStrategyType) && kw.maxCpc != null) {
        errors.push(`${kwLabel}: Max CPC is only valid when the campaign's bid strategy is Manual CPC.`);
      }
      const dupKey = `${normalizeKeyword(text)}::${kw.matchType}`;
      const set = seenKeywords.get(kw.adGroupId) ?? new Set<string>();
      if (set.has(dupKey)) errors.push(`${kwLabel}: duplicate keyword + match type in this ad group.`);
      set.add(dupKey);
      seenKeywords.set(kw.adGroupId, set);
    }

    for (const neg of negativeKeywords) {
      const negLabel = `${label} › Negative keyword "${neg.text || '—'}"`;
      if (!neg.text.trim()) errors.push(`${negLabel}: negative keyword text is required.`);
      if (neg.level === 'Ad group' && !adGroups.some((a) => a.id === neg.scopeId)) {
        errors.push(`${negLabel}: ad group scope does not match any ad group in this campaign.`);
      }
      if (neg.level === 'Campaign' && neg.scopeId !== campaign.id) {
        errors.push(`${negLabel}: campaign scope does not match this campaign.`);
      }
    }

    for (const rsa of rsas) {
      const ag = adGroups.find((a) => a.id === rsa.adGroupId);
      const rsaLabel = `${label} › Ad group "${ag?.name || '—'}" › RSA`;
      errors.push(...validateRsa(rsaLabel, rsa));
    }
  }

  return errors;
}

function validateRsa(label: string, rsa: SearchRsa): string[] {
  const errors: string[] = [];
  const headlines = rsa.headlines.filter((h) => h.text.trim());
  const uniqueHeadlines = new Set(headlines.map((h) => h.text.trim().toLowerCase()));
  if (headlines.length < 3 || headlines.length > 15) {
    errors.push(`${label}: needs 3 to 15 non-empty headlines (has ${headlines.length}).`);
  }
  if (uniqueHeadlines.size !== headlines.length) errors.push(`${label}: headlines must be unique.`);
  headlines.forEach((h, i) => {
    const w = googleCharWidth(h.text);
    if (w > 30) errors.push(`${label}: headline ${i + 1} is ${w} characters wide (max 30).`);
  });

  const descriptions = rsa.descriptions.filter((d) => d.text.trim());
  const uniqueDescriptions = new Set(descriptions.map((d) => d.text.trim().toLowerCase()));
  if (descriptions.length < 2 || descriptions.length > 4) {
    errors.push(`${label}: needs 2 to 4 non-empty descriptions (has ${descriptions.length}).`);
  }
  if (uniqueDescriptions.size !== descriptions.length) errors.push(`${label}: descriptions must be unique.`);
  descriptions.forEach((d, i) => {
    const w = googleCharWidth(d.text);
    if (w > 90) errors.push(`${label}: description ${i + 1} is ${w} characters wide (max 90).`);
  });

  const headlinePins = headlines.filter((h) => h.pin != null).length;
  if (headlinePins > 3) errors.push(`${label}: at most 3 pinned headline positions exist (1, 2, 3).`);
  const descriptionPins = descriptions.filter((d) => d.pin != null).length;
  if (descriptionPins > 2) errors.push(`${label}: at most 2 pinned description positions exist (1, 2).`);

  if (rsa.path2 && !rsa.path1) errors.push(`${label}: Path 2 requires Path 1.`);
  if (rsa.path1 && rsa.path1.length > 15) errors.push(`${label}: Path 1 is ${rsa.path1.length} characters (max 15).`);
  if (rsa.path2 && rsa.path2.length > 15) errors.push(`${label}: Path 2 is ${rsa.path2.length} characters (max 15).`);

  if (!rsa.finalUrl || !isValidFinalUrl(rsa.finalUrl)) {
    errors.push(`${label}: Final URL must be an absolute http:// or https:// URL.`);
  } else if (utf8ByteLength(rsa.finalUrl) > 2084) {
    errors.push(`${label}: Final URL exceeds the 2,084-byte limit.`);
  }

  return errors;
}
