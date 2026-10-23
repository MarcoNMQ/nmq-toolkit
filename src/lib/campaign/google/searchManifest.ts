// Preflight manifest for a Search Bulk Upload export — states what the file
// actually contains versus what still needs manual/account-side work, so
// "the export downloaded" never gets mistaken for "the setup is complete."

import type { SearchCampaignBundle } from './searchTypes';
import { SCHEMA_VERSION } from './searchDefaults';

export interface SearchPreflightManifest {
  schemaVersion: string;
  entityCounts: {
    campaigns: number;
    adGroups: number;
    keywords: number;
    negativeKeywords: number;
    ads: number;
  };
  allEntitiesPaused: boolean;
  fixtureGated: string[];
  manualFollowUps: string[];
}

const FIXTURE_GATED = [
  'Sitelinks — no Bulk Upload sitelink template has been verified yet.',
  'AI Max and its dependent controls (search term matching, URL expansion/inclusions/exclusions, brand lists, locations of interest).',
  'Portfolio bid strategy references (an existing, case-sensitive strategy name).',
  'Pharma-only fields (Display URL option, Website description).',
  'Campaign-total/Monthly budget period nuances beyond the verified Budget type value itself.',
];

const MANUAL_FOLLOW_UPS = [
  'Conversion goal configuration (account-default vs campaign-specific) — not creatable via this file.',
  'Billing and account linkages.',
  'Asset eligibility and policy/ad review status.',
  'Confirm every entity landed Paused before enabling anything.',
];

export function buildSearchPreflightManifest(bundles: SearchCampaignBundle[]): SearchPreflightManifest {
  const allEntitiesPaused = bundles.every((b) =>
    b.campaign.status === 'Paused' &&
    b.adGroups.every((a) => a.status === 'Paused') &&
    b.keywords.every((k) => k.status === 'Paused') &&
    b.rsas.every((r) => r.status === 'Paused'),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    entityCounts: {
      campaigns: bundles.length,
      adGroups: bundles.reduce((n, b) => n + b.adGroups.length, 0),
      keywords: bundles.reduce((n, b) => n + b.keywords.length, 0),
      negativeKeywords: bundles.reduce((n, b) => n + b.negativeKeywords.length, 0),
      ads: bundles.reduce((n, b) => n + b.rsas.length, 0),
    },
    allEntitiesPaused,
    fixtureGated: FIXTURE_GATED,
    manualFollowUps: MANUAL_FOLLOW_UPS,
  };
}
