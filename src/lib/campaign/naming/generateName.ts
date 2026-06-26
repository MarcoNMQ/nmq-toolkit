import type { NamingSegment } from './types';

/**
 * The one shared join engine every naming formula goes through. A formula
 * just returns an ordered list of segments — this function drops empty
 * ones, joins the rest with `_`, and then defensively collapses any
 * duplicate underscores and trims stray leading/trailing ones.
 *
 * This must stay behaviourally identical to the old inline
 * `.filter(Boolean).join('_')` pattern used throughout builder.ts and
 * briefing.ts — the collapse/trim passes are a no-op for any input that
 * was already valid under the old logic (empty segments are filtered
 * before joining, so two consecutive segments can never produce `__` on
 * their own), and only act as a safety net for new templates or segments
 * whose own value happens to contain a duplicate underscore.
 */
export function generateName(segments: NamingSegment[]): string {
  const cleaned = segments
    .map((s) => (s ?? '').toString().trim())
    .filter((s) => s.length > 0);

  return cleaned
    .join('_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
