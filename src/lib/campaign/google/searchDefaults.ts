// Search-safe defaults — every new Search entity starts Paused, and the
// campaign never inherits YouTube/Demand Gen's networks or bid strategies.
// See searchTypes.ts for where these values come from.

import type { BulkStatus, SearchBidStrategyType, SearchBudgetType } from './searchTypes';

export const SEARCH_DEFAULT_STATUS: BulkStatus = 'Paused';
export const SEARCH_DEFAULT_BUDGET_TYPE: SearchBudgetType = 'Daily';
export const SEARCH_DEFAULT_BID_STRATEGY: SearchBidStrategyType = 'Maximize clicks';

/**
 * Builds the exact "Networks" cell value for a Search campaign row.
 * Always includes "Google search" (lowercase, per the verified template).
 * "Search partners" only when explicitly opted in. "Display Network" only
 * on explicit Display Expansion opt-in. Never "Google TV" or "YouTube
 * videos" — those are video-only and must never appear on a Search row.
 */
export function buildSearchNetworks(searchPartners: boolean, displayExpansionEnabled: boolean): string {
  const parts = ['Google search'];
  if (searchPartners) parts.push('Search partners');
  if (displayExpansionEnabled) parts.push('Display Network');
  return parts.join(';');
}

/** Fields that only apply to specific bid strategies — used by both the
 *  validator (to reject fields on the wrong strategy) and the serializer
 *  (to omit them). */
export function bidStrategyNeedsTargetCpa(type: SearchBidStrategyType): boolean {
  return type === 'Target CPA';
}
export function bidStrategyNeedsTargetRoas(type: SearchBidStrategyType): boolean {
  return type === 'Target ROAS';
}
export function bidStrategyNeedsTargetImpressionShare(type: SearchBidStrategyType): boolean {
  return type === 'Target Impression Share';
}
export function bidStrategyNeedsMaxCpc(type: SearchBidStrategyType): boolean {
  return type === 'Manual CPC';
}

export const SCHEMA_VERSION = '1.0.0';
