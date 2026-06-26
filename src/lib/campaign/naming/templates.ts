// Registry of all available naming conventions. Today there are two:
// Shimano (locked) and the generic default. Adding a future client's own
// convention means adding one entry here plus a new file alongside
// shimano.ts/generic.ts for its formulas — no changes needed to
// generateName.ts, builder.ts, or briefing.ts.
//
// There's no UI to pick between multiple conventions yet (deliberately —
// there's only one generic template right now, so a picker would just be
// unnecessary choice). The registry exists so that UI can be added later
// without another refactor of the naming logic itself.

import { shimanoConvention } from './shimano';
import { defaultPaidMediaConvention } from './generic';
import type { NamingConvention } from './types';

export const NAMING_CONVENTIONS: Record<string, NamingConvention> = {
  [shimanoConvention.id]: shimanoConvention,
  [defaultPaidMediaConvention.id]: defaultPaidMediaConvention,
};

/** Pick the right convention for a client profile. Empty/unknown client
 *  profile falls back to the generic default. */
export function getConventionForClient(clientProfile: string): NamingConvention {
  if (clientProfile === 'Shimano') return shimanoConvention;
  return defaultPaidMediaConvention;
}
