// The default naming convention for any client without a fixed product
// taxonomy. Note this is NOT "raw text everywhere" — Channel, Main goal,
// Performance goal and Month are shared dropdowns used by both Shimano and
// generic clients (the client-profile selector only swaps the Product
// category/family/promoted fields between free text and Shimano's
// taxonomy), so this formula still maps through the same CHANNEL_CODES /
// MAIN_GOAL_CODES / PERF_GOAL_CODES / MONTH_CODES lookup tables Shimano
// uses. Product fields are used as-is because they were always free text
// here, never looked up against a taxonomy — that's what makes this
// template independent of Shimano's product catalogue specifically.
//
// Today this formula is logically identical to shimano.ts's manual
// formulas. That's intentional and required — before this refactor, both
// client modes ran through the exact same generateCampaignName/
// generateAdsetName functions. Kept as a separate file/export (rather than
// reusing shimano.ts's formulas directly) so the generic template can
// evolve independently later without any risk to Shimano's locked one.

import { CHANNEL_CODES, MAIN_GOAL_CODES, PERF_GOAL_CODES, MONTH_CODES } from '../constants';
import type { GoogleCampaign } from '../types';
import type { NamingConvention, NamingFormula } from './types';

function fmtDate(dt: string | undefined | null): string {
  if (!dt) return '';
  const s = String(dt);
  if (s.length === 10 && s[4] === '-') {
    const [y, m, d] = s.split('-');
    return `${d}.${m}.${y}`;
  }
  return s;
}

export const defaultCampaignFormula: NamingFormula<Partial<GoogleCampaign>> = {
  id: 'default-paid-media-campaign',
  label: 'Default Paid Media — Campaign Name',
  source: 'manual',
  resolve: (c) => [
    CHANNEL_CODES[c.channel ?? ''] ?? '',
    MAIN_GOAL_CODES[c.main_goal ?? ''] ?? '',
    MONTH_CODES[c.month ?? ''] ?? '',
    c.product_category ?? '',
    c.key_category === 'YES' ? 'KC' : '',
    fmtDate(c.start_date),
    fmtDate(c.end_date),
  ],
};

export const defaultAdGroupFormula: NamingFormula<Partial<GoogleCampaign>> = {
  id: 'default-paid-media-adgroup',
  label: 'Default Paid Media — Ad Group Name',
  source: 'manual',
  resolve: (c) => [
    CHANNEL_CODES[c.channel ?? ''] ?? '',
    PERF_GOAL_CODES[c.perf_goal ?? ''] ?? '',
    c.product_category ?? '',
    c.product_subcategory && c.product_subcategory !== 'NA' ? c.product_subcategory : '',
    c.product_promoted ?? '',
    c.market ?? '',
    c.key_category === 'YES' ? 'KC' : '',
    (c.country_group ?? '').replace(/ /g, '_').replace(/\+/g, '').replace(/__/g, '_').replace(/^_+|_+$/g, ''),
    fmtDate(c.start_date),
    fmtDate(c.end_date),
  ],
};

export const defaultPaidMediaConvention: NamingConvention = {
  id: 'default-paid-media',
  name: 'Default Paid Media Naming',
  clientMode: 'generic',
  locked: false,
};
