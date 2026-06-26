// Fixture-based self-check confirming the new naming engine reproduces the
// exact output of the original (pre-refactor) generateCampaignName /
// generateAdsetName / buildYtNames functions. Not wired into the running
// app or build — this is a one-off correctness check kept in the repo as
// living documentation that "the refactor didn't change Shimano's output."
// Run it ad hoc (e.g. via `npx tsx` against a small script that imports
// and calls runShimanoFixtureChecks()) after touching anything in lib/naming.

import { generateName } from './generateName';
import {
  shimanoCampaignFormula, shimanoAdGroupFormula,
  shimanoBriefingCampaignFormula, shimanoBriefingAdGroupFormula,
} from './shimano';
import type { GoogleCampaign } from '../types';
import type { BriefingRow } from '../briefing';

interface FixtureCase {
  label: string;
  expected: string;
  actual: string;
}

export function runShimanoFixtureChecks(): { ok: boolean; cases: FixtureCase[] } {
  const manualInput: Partial<GoogleCampaign> = {
    channel: 'YouTube',
    main_goal: 'Awareness',
    perf_goal: 'Demand Gen',
    month: 'June',
    product_category: 'Predator',
    product_subcategory: 'Lures',
    product_promoted: 'Lure Yasei Chaos Crank',
    market: 'SUK',
    key_category: 'YES',
    country_group: 'United Kingdom',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
  };

  const briefingInput = {
    channel_code: 'YT', perf_code: 'DG', category: 'Predator', subcategory: 'Lures',
    product: 'LureX', key_product: 'KC', market_code: 'SUK', country_code: 'UK',
    creative_name: '', goal_code: '', creative_code: '', month: '', budget: '',
    final_url: '', asset_link: '', shimano_comments: '',
    start_date: '01/06/2026', end_date: '30/06/2026',
    campaign_name: '', adset_name: '',
  } as BriefingRow;

  const cases: FixtureCase[] = [
    {
      label: 'Shimano manual campaign name',
      expected: 'YT_AWA_JUN_Predator_KC_01.06.2026_30.06.2026',
      actual: generateName(shimanoCampaignFormula.resolve(manualInput)),
    },
    {
      label: 'Shimano manual ad group name',
      expected: 'YT_DG_Predator_Lures_Lure Yasei Chaos Crank_SUK_KC_United_Kingdom_01.06.2026_30.06.2026',
      actual: generateName(shimanoAdGroupFormula.resolve(manualInput)),
    },
    {
      label: 'Shimano briefing-import campaign name (KC appended at the end)',
      expected: 'YT_DG_Predator_Lures_LureX_SUK_UK_01.06.2026_30.06.2026_KC',
      actual: generateName(shimanoBriefingCampaignFormula.resolve(briefingInput)),
    },
    {
      label: 'Shimano briefing-import ad group name (KC between market and country)',
      expected: 'YT_DG_Predator_Lures_LureX_SUK_KC_UK_01.06.2026_30.06.2026',
      actual: generateName(shimanoBriefingAdGroupFormula.resolve(briefingInput)),
    },
    {
      label: 'Empty fields are omitted, no leading/trailing/duplicate underscores',
      expected: 'YT_JUN',
      actual: generateName(['YT', '', '', 'JUN', '', '']),
    },
    {
      label: 'KC is absent entirely when key_category is NO',
      expected: 'YT_AWA_JUN_Predator_01.06.2026_30.06.2026',
      actual: generateName(shimanoCampaignFormula.resolve({ ...manualInput, key_category: 'NO' })),
    },
    {
      label: 'Briefing KC absent when key_product is "_" placeholder',
      expected: 'YT_DG_Predator_Lures_LureX_SUK_UK_01.06.2026_30.06.2026',
      actual: generateName(shimanoBriefingCampaignFormula.resolve({ ...briefingInput, key_product: '_' })),
    },
  ];

  return { ok: cases.every((c) => c.actual === c.expected), cases };
}
