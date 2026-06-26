/** A single resolved piece of a generated name, before joining. An empty
 *  string means "omit this segment" — the engine drops it. */
export type NamingSegment = string;

/** Where a naming formula's input data comes from — the manual form, or a
 *  parsed briefing-sheet row. Manual and briefing-import naming intentionally
 *  stay as separate formulas even for the same client, since they read from
 *  different data shapes (GoogleCampaign vs BriefingRow) and can have
 *  different segment ordering (see Shimano's KC position in shimano.ts). */
export type NamingSource = 'manual' | 'briefing-import';

/** A pure function that reads campaign/ad-group/briefing-row data and
 *  returns an ordered list of segments to join. A formula only describes
 *  order and per-segment formatting — the actual joining/cleanup is the
 *  shared generateName() engine's job, not the formula's. */
export interface NamingFormula<TInput> {
  id: string;
  label: string;
  source: NamingSource;
  resolve: (input: TInput) => NamingSegment[];
}

/** Describes one client's naming convention. `locked` means the UI should
 *  present it as fixed (Shimano's case) rather than offer alternatives. */
export interface NamingConvention {
  id: string;
  name: string;
  clientMode: 'shimano' | 'generic';
  locked: boolean;
}
