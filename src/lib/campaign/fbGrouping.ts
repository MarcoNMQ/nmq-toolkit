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
  field: FbCampaignLevelField;
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

/** Ad set names used more than once inside the same campaign. */
export function findFbDuplicateAdsets(group: FbCampaignGroup): string[] {
  const counts = new Map<string, { name: string; n: number }>();
  for (const c of group.cards) {
    const k = fbNameKey(c.adset_name);
    if (!k) continue; // missing ad set names are flagged by validateFbCampaigns
    const entry = counts.get(k) ?? { name: c.adset_name.trim(), n: 0 };
    entry.n += 1;
    counts.set(k, entry);
  }
  return [...counts.values()].filter((e) => e.n > 1).map((e) => e.name);
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
    for (const adset of findFbDuplicateAdsets(group)) {
      const msg = `Ad set name "${adset}" is used more than once in this campaign — Meta would merge them into one ad set`;
      group.cards
        .filter((c) => fbNameKey(c.adset_name) === fbNameKey(adset))
        .forEach((c) => add(c.id, msg));
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
    for (const adset of findFbDuplicateAdsets(group)) {
      errors.push(`${label}: ad set name "${adset}" is used more than once — Meta would merge them into one ad set.`);
    }
  }
  return errors;
}
