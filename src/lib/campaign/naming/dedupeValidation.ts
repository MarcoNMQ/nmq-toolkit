// Fixture-based self-check for resolveDuplicateNames(). Not wired into the
// app — run ad hoc (same pattern as validation.ts) after touching dedupe.ts.

import { resolveDuplicateNames, type NamedEntity } from './dedupe';

interface CaseResult {
  label: string;
  ok: boolean;
  details: string;
}

function check(
  label: string,
  input: NamedEntity[],
  expected: Record<string, { campaignName: string; adsetName: string }>,
): CaseResult {
  const resolved = resolveDuplicateNames(input);
  let ok = true;
  const details: string[] = [];
  for (const r of resolved) {
    const exp = expected[r.id];
    const match = exp.campaignName === r.campaignName && exp.adsetName === r.adsetName;
    if (!match) ok = false;
    details.push(
      `${r.id}: expected (${exp.campaignName}, ${exp.adsetName}) got (${r.campaignName}, ${r.adsetName}) ${match ? 'OK' : 'MISMATCH'}`,
    );
  }
  return { label, ok, details: details.join(' | ') };
}

export function runDedupeFixtureChecks(): { ok: boolean; cases: CaseResult[] } {
  const cases: CaseResult[] = [
    // 1. Same campaign with multiple ads → not modeled at this layer at
    //    all: ads are nested inside one entity, never passed to
    //    resolveDuplicateNames as separate items. A single entity always
    //    passes through completely unchanged, regardless of ad count —
    //    this fixture documents that there's nothing to dedupe here.
    check(
      'Single campaign entity (any number of ads) keeps its base names',
      [{ id: 'c1', campaignName: 'CampaignName', adsetName: 'AdGroupName' }],
      { c1: { campaignName: 'CampaignName', adsetName: 'AdGroupName' } },
    ),

    // 2. Two separate campaigns, same base name → second gets _02.
    check(
      'Two separate campaigns with same base name',
      [
        { id: 'c1', campaignName: 'CampaignName', adsetName: 'AdGroupA' },
        { id: 'c2', campaignName: 'CampaignName', adsetName: 'AdGroupB' },
      ],
      {
        c1: { campaignName: 'CampaignName', adsetName: 'AdGroupA' },
        c2: { campaignName: 'CampaignName_02', adsetName: 'AdGroupB' },
      },
    ),

    // 3. Three separate campaigns, same base name → _02, _03.
    check(
      'Three separate campaigns with same base name',
      [
        { id: 'c1', campaignName: 'CampaignName', adsetName: 'AdGroupA' },
        { id: 'c2', campaignName: 'CampaignName', adsetName: 'AdGroupB' },
        { id: 'c3', campaignName: 'CampaignName', adsetName: 'AdGroupC' },
      ],
      {
        c1: { campaignName: 'CampaignName', adsetName: 'AdGroupA' },
        c2: { campaignName: 'CampaignName_02', adsetName: 'AdGroupB' },
        c3: { campaignName: 'CampaignName_03', adsetName: 'AdGroupC' },
      },
    ),

    // 4. Same ad group name in different campaigns → allowed, no suffix.
    check(
      'Same ad group name across different campaigns is allowed',
      [
        { id: 'c1', campaignName: 'CampaignA', adsetName: 'AdGroupName' },
        { id: 'c2', campaignName: 'CampaignB', adsetName: 'AdGroupName' },
      ],
      {
        c1: { campaignName: 'CampaignA', adsetName: 'AdGroupName' },
        c2: { campaignName: 'CampaignB', adsetName: 'AdGroupName' },
      },
    ),

    // 5. Same ad group name twice inside the same (base) campaign → second
    //    gets _02. Note this fires independently of the campaign-name
    //    suffix these two entities also receive from rule 2/3 above — see
    //    the design-decision comment in dedupe.ts.
    check(
      'Same ad group name twice within the same base campaign name',
      [
        { id: 'c1', campaignName: 'CampaignName', adsetName: 'AdGroupName' },
        { id: 'c2', campaignName: 'CampaignName', adsetName: 'AdGroupName' },
      ],
      {
        c1: { campaignName: 'CampaignName', adsetName: 'AdGroupName' },
        c2: { campaignName: 'CampaignName_02', adsetName: 'AdGroupName_02' },
      },
    ),
  ];

  return { ok: cases.every((c) => c.ok), cases };
}
