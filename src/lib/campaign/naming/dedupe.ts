// Collision-resolution layer for the Google Ads export. Naming formulas
// (shimano.ts / generic.ts) generate a *base* name per entity; this module
// detects when two distinct top-level entities land on the same base name
// and appends a numeric suffix so the exported CSV doesn't silently merge
// genuinely separate campaigns/ad groups into one.
//
// Export-time only — this never touches the live form's displayed
// campaign_name/adset_name. The base naming convention, segment order, and
// Shimano's exact output are untouched; this only runs AFTER a base name
// has already been generated, right before writing the CSV.

export interface NamedEntity {
  id: string;
  campaignName: string;
  adsetName: string;
}

export interface ResolvedEntity {
  id: string;
  campaignName: string;
  adsetName: string;
}

// "_02", "_03", ... — never "#", since these names get parsed by
// dashboards and scripts downstream. occurrenceIndex is 0-based; the first
// occurrence keeps the base name unchanged.
function suffix(base: string, occurrenceIndex: number): string {
  if (occurrenceIndex === 0) return base;
  return `${base}_${String(occurrenceIndex + 1).padStart(2, '0')}`;
}

/**
 * Resolves campaign-name collisions across all entities first (in array
 * order — first occurrence keeps the base name, later ones get _02/_03/...).
 * Then, independently, within each group of entities that originally shared
 * the same BASE campaign name, resolves ad-group-name collisions among just
 * that group.
 *
 * Two entities with different base campaign names never affect each
 * other's ad-group naming — a repeated ad group name across different
 * campaigns is fine (rule: "same ad group name in different campaigns is
 * allowed"). Ad-group dedup is scoped to the original collision group on
 * purpose, independent of whatever suffix the campaign name itself ends up
 * with — this is the one deliberate design call in this module: if two
 * entities are true duplicates (same base campaign name AND same base ad
 * group name), both layers fire on them independently, and the result
 * (CampaignName / CampaignName_02, AdGroupName / AdGroupName_02) keeps
 * every row uniquely identifiable without ever touching the base naming
 * logic itself.
 */
export function resolveDuplicateNames(entities: NamedEntity[]): ResolvedEntity[] {
  // Group entity indices by base campaign name, preserving array order.
  const campaignGroups = new Map<string, number[]>();
  entities.forEach((e, i) => {
    const group = campaignGroups.get(e.campaignName) ?? [];
    group.push(i);
    campaignGroups.set(e.campaignName, group);
  });

  const resolvedCampaignName = new Array<string>(entities.length);
  const resolvedAdsetName = new Array<string>(entities.length);

  for (const indices of campaignGroups.values()) {
    indices.forEach((idx, occurrence) => {
      resolvedCampaignName[idx] = suffix(entities[idx].campaignName, occurrence);
    });

    // Ad-group dedup scoped to this same group (entities that share the
    // original base campaign name), not the resolved/suffixed one.
    const adsetGroups = new Map<string, number[]>();
    indices.forEach((idx) => {
      const group = adsetGroups.get(entities[idx].adsetName) ?? [];
      group.push(idx);
      adsetGroups.set(entities[idx].adsetName, group);
    });
    for (const adsetIndices of adsetGroups.values()) {
      adsetIndices.forEach((idx, occurrence) => {
        resolvedAdsetName[idx] = suffix(entities[idx].adsetName, occurrence);
      });
    }
  }

  return entities.map((e, i) => ({
    id: e.id,
    campaignName: resolvedCampaignName[i],
    adsetName: resolvedAdsetName[i],
  }));
}
