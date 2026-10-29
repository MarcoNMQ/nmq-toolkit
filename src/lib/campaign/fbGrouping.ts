// Campaign grouping for the Facebook builder. Each FbCampaign card in the
// store is really one campaign + one ad set; cards that share a campaign
// name are ad sets of the SAME Meta campaign. Meta's bulk import groups rows
// by Campaign Name, so every row of that campaign has to carry identical
// campaign-level values — otherwise the import errors out or splits the
// ad sets across campaigns. This module is the single place that decides
// which cards belong together and whether their campaign settings agree.

import type { FbCampaign } from './types';

/** Fields that live on the Meta campaign itself, shared by all its ad sets. */
export const FB_CAMPAIGN_LEVEL_FIELDS = [
  'client_profile',
  'facebook_page_ref',
  'campaign_status',
  'campaign_objective',
  'buying_type',
  'campaign_bid_strategy',
  'tags',
  'campaign_start_time',
  'campaign_stop_time',
  'budget_type',
  'budget',
] as const;

export type FbCampaignLevelField = (typeof FB_CAMPAIGN_LEVEL_FIELDS)[number];

const FIELD_LABELS: Record<FbCampaignLevelField, string> = {
  client_profile: 'Client',
  facebook_page_ref: 'Facebook Page',
  campaign_status: 'Campaign status',
  campaign_objective: 'Campaign objective',
  buying_type: 'Buying type',
  campaign_bid_strategy: 'Campaign bid strategy',
  tags: 'Tags',
  campaign_start_time: 'Start time',
  campaign_stop_time: 'Stop time',
  budget_type: 'Campaign budget type',
  budget: 'Campaign budget',
};

/**
 * Matching key for campaign/ad set names: case-insensitive, trimmed, inner
 * whitespace collapsed — "Campaign A" and "campaign  a " are the same
 * campaign to a human, so they're the same campaign here too.
 */
export function fbNameKey(name: string | undefined | null): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface FbCampaignGroup {
  key: string;
  /** Name exported for the whole campaign — taken from the first card. */
  name: string;
  /** Cards (ad sets) in store order; cards[0] is the source of truth. */
  cards: FbCampaign[];
}

/**
 * Groups cards by campaign name, in order of first appearance. Unnamed cards
 * never group with each other — each one stays its own group, since a blank
 * name is a missing value, not a shared one.
 */
export function groupFbCampaigns(campaigns: FbCampaign[]): FbCampaignGroup[] {
  const groups = new Map<string, FbCampaignGroup>();
  for (const c of campaigns) {
    const nameKey = fbNameKey(c.campaign_name);
    const key = nameKey || `__unnamed_${c.id}`;
    const existing = groups.get(key);
    if (existing) existing.cards.push(c);
    else groups.set(key, { key, name: (c.campaign_name ?? '').trim(), cards: [c] });
  }
  return [...groups.values()];
}

/** The cards sharing a campaign with the given card (itself included). */
export function fbSiblings(campaigns: FbCampaign[], cardId: string): FbCampaign[] {
  const card = campaigns.find((c) => c.id === cardId);
  if (!card) return [];
  const key = fbNameKey(card.campaign_name);
  if (!key) return [card];
  return campaigns.filter((c) => fbNameKey(c.campaign_name) === key);
}

export function pickFbCampaignLevel(c: Partial<FbCampaign>): Partial<Pick<FbCampaign, FbCampaignLevelField>> {
  const out: Record<string, unknown> = {};
  for (const f of FB_CAMPAIGN_LEVEL_FIELDS) {
    if (f in c) out[f] = c[f];
  }
  return out as Partial<Pick<FbCampaign, FbCampaignLevelField>>;
}

function normalize(field: FbCampaignLevelField, v: unknown): string {
  if (field === 'budget') return Number(v ?? 0).toFixed(2);
  return String(v ?? '').trim();
}

function display(field: FbCampaignLevelField, v: unknown): string {
  if (field === 'budget') return `€${Number(v ?? 0).toFixed(2)}`;
  const s = String(v ?? '').trim();
  return s || '(blank)';
}

export interface FbFieldConflict {
  field: FbCampaignLevelField | FbAdsetLevelField;
  label: string;
  /** Distinct values, in the order they first appear across the ad sets. */
  values: string[];
}

/** Campaign-level fields whose values differ across a group's ad sets. */
export function findFbCampaignConflicts(group: FbCampaignGroup): FbFieldConflict[] {
  if (group.cards.length < 2) return [];
  const conflicts: FbFieldConflict[] = [];
  for (const field of FB_CAMPAIGN_LEVEL_FIELDS) {
    const seen = new Map<string, string>();
    for (const c of group.cards) {
      const n = normalize(field, c[field]);
      if (!seen.has(n)) seen.set(n, display(field, c[field]));
    }
    if (seen.size > 1) conflicts.push({ field, label: FIELD_LABELS[field], values: [...seen.values()] });
  }
  return conflicts;
}

/** Fields that live on the ad set itself — shared by every ad inside it.
 *  Multiple cards sharing a campaign name AND an ad set name are the SAME
 *  Meta ad set with several ads (that's the normal, intended way to put
 *  more than one creative under one ad set in this tool) — that's only
 *  safe to export as one ad set when these fields actually agree across
 *  those cards. Meta's bulk import groups ad rows by matching Ad Set Name,
 *  so if they disagreed, whichever card's values "win" would be silently
 *  decided by Meta's importer, not by the person exporting. */
export const FB_ADSET_LEVEL_FIELDS = [
  'adset_status',
  'adset_start_time',
  'adset_stop_time',
  'adset_budget_type',
  'adset_budget',
  'countries',
  'gender',
  'age_min',
  'age_max',
  'custom_audiences',
  'excluded_custom_audiences',
  'publisher_platforms',
  'device_platforms',
  'facebook_positions',
  'instagram_positions',
  'optimization_goal',
  'billing_event',
  'bid_amount',
  'adset_bid_strategy',
  'adset_min_spend',
  'adset_max_spend',
] as const;

export type FbAdsetLevelField = (typeof FB_ADSET_LEVEL_FIELDS)[number];

const ADSET_FIELD_LABELS: Record<FbAdsetLevelField, string> = {
  adset_status: 'Ad set status',
  adset_start_time: 'Ad set start time',
  adset_stop_time: 'Ad set stop time',
  adset_budget_type: 'Ad set budget type',
  adset_budget: 'Ad set budget',
  countries: 'Countries',
  gender: 'Gender',
  age_min: 'Min age',
  age_max: 'Max age',
  custom_audiences: 'Custom audiences',
  excluded_custom_audiences: 'Excluded custom audiences',
  publisher_platforms: 'Publisher platforms',
  device_platforms: 'Device platforms',
  facebook_positions: 'Facebook positions',
  instagram_positions: 'Instagram positions',
  optimization_goal: 'Optimization goal',
  billing_event: 'Billing event',
  bid_amount: 'Bid amount',
  adset_bid_strategy: 'Ad set bid strategy',
  adset_min_spend: 'Ad set minimum spend',
  adset_max_spend: 'Ad set maximum spend',
};

const ADSET_ARRAY_FIELDS = new Set<FbAdsetLevelField>(['countries', 'publisher_platforms', 'device_platforms', 'facebook_positions', 'instagram_positions']);
const ADSET_MONEY_FIELDS = new Set<FbAdsetLevelField>(['adset_budget', 'bid_amount', 'adset_min_spend', 'adset_max_spend']);

function normalizeAdsetField(field: FbAdsetLevelField, v: unknown): string {
  if (ADSET_ARRAY_FIELDS.has(field)) return [...((v as string[]) ?? [])].map((s) => s.trim().toLowerCase()).sort().join(',');
  if (ADSET_MONEY_FIELDS.has(field)) return v === undefined || v === null || v === '' ? '' : Number(v).toFixed(2);
  if (field === 'age_min' || field === 'age_max') return v === undefined || v === null || v === '' ? '' : String(v);
  return String(v ?? '').trim();
}

function displayAdsetField(field: FbAdsetLevelField, v: unknown): string {
  if (ADSET_ARRAY_FIELDS.has(field)) {
    const arr = (v as string[] | undefined) ?? [];
    return arr.length ? arr.join(', ') : '(none)';
  }
  if (ADSET_MONEY_FIELDS.has(field)) {
    return v === undefined || v === null || v === '' ? '(blank)' : `€${Number(v).toFixed(2)}`;
  }
  const s = String(v ?? '').trim();
  return s || '(blank)';
}

export interface FbAdsetGroup {
  key: string;
  name: string;
  cards: FbCampaign[];
}

/** Groups a campaign's cards by ad set name — cards sharing both a campaign
 *  name and an ad set name are ads of the same ad set. Cards with no ad set
 *  name are left out (that's flagged separately by validateFbCampaigns). */
function groupByAdsetName(cards: FbCampaign[]): FbAdsetGroup[] {
  const groups = new Map<string, FbAdsetGroup>();
  for (const c of cards) {
    const key = fbNameKey(c.adset_name);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) existing.cards.push(c);
    else groups.set(key, { key, name: c.adset_name.trim(), cards: [c] });
  }
  return [...groups.values()];
}

/** Ad-set-level fields whose values differ across the cards sharing one ad
 *  set name. A single card (the normal case) never conflicts with itself. */
export function findFbAdsetConflicts(group: FbAdsetGroup): FbFieldConflict[] {
  if (group.cards.length < 2) return [];
  const conflicts: FbFieldConflict[] = [];
  for (const field of FB_ADSET_LEVEL_FIELDS) {
    const seen = new Map<string, string>();
    for (const c of group.cards) {
      const n = normalizeAdsetField(field, c[field]);
      if (!seen.has(n)) seen.set(n, displayAdsetField(field, c[field]));
    }
    if (seen.size > 1) conflicts.push({ field, label: ADSET_FIELD_LABELS[field], values: [...seen.values()] });
  }
  return conflicts;
}

/** Ad-set groups (sharing a name) within a campaign, together with any
 *  conflicts found among their cards. */
function adsetGroupsWithConflicts(group: FbCampaignGroup): { adsetGroup: FbAdsetGroup; conflicts: FbFieldConflict[] }[] {
  return groupByAdsetName(group.cards).map((adsetGroup) => ({ adsetGroup, conflicts: findFbAdsetConflicts(adsetGroup) }));
}

/**
 * Human-readable grouping problems, keyed by card id so the sidebar can badge
 * each affected ad set. Anything returned here blocks the Facebook export.
 */
export function fbGroupingIssuesByCard(campaigns: FbCampaign[]): Map<string, string[]> {
  const byCard = new Map<string, string[]>();
  const add = (id: string, msg: string) => {
    const list = byCard.get(id) ?? [];
    list.push(msg);
    byCard.set(id, list);
  };

  for (const group of groupFbCampaigns(campaigns)) {
    for (const conflict of findFbCampaignConflicts(group)) {
      const msg = `${conflict.label} differs across ad sets of this campaign: ${conflict.values.join(' vs ')}`;
      group.cards.forEach((c) => add(c.id, msg));
    }
    for (const { adsetGroup, conflicts } of adsetGroupsWithConflicts(group)) {
      conflicts.forEach((conflict) => {
        const msg = `Ad set "${adsetGroup.name}": ${conflict.label} differs across its ${adsetGroup.cards.length} ads — Meta needs one consistent ad set (${conflict.values.join(' vs ')})`;
        adsetGroup.cards.forEach((c) => add(c.id, msg));
      });
    }
  }
  return byCard;
}

/** Export-blocking grouping errors, one line per problem per campaign. */
export function fbGroupingErrors(campaigns: FbCampaign[]): string[] {
  const errors: string[] = [];
  for (const group of groupFbCampaigns(campaigns)) {
    const label = `Campaign "${group.name || '—'}"`;
    for (const conflict of findFbCampaignConflicts(group)) {
      errors.push(`${label}: ${conflict.label} differs across its ${group.cards.length} ad sets (${conflict.values.join(' vs ')}).`);
    }
    for (const { adsetGroup, conflicts } of adsetGroupsWithConflicts(group)) {
      conflicts.forEach((conflict) => {
        errors.push(`${label}: ad set "${adsetGroup.name}" — ${conflict.label} differs across its ${adsetGroup.cards.length} ads (${conflict.values.join(' vs ')}); Meta needs one consistent ad set.`);
      });
    }
  }
  return errors;
}
