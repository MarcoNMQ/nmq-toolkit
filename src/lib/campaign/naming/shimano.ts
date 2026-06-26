// Shimano's naming convention — LOCKED. Must keep producing byte-for-byte
// the same output as the original builder.py / app.py logic that came
// before this naming/ refactor. There are two independent sources: the
// manual form, and the briefing-sheet import. They stay as separate
// formulas because they read from different shapes (GoogleCampaign vs
// BriefingRow) AND because the KC segment sits in a different position
// in the ad-group name between the two — see the comment below.

import { CHANNEL_CODES, MAIN_GOAL_CODES, PERF_GOAL_CODES, MONTH_CODES } from '../constants';
import type { GoogleCampaign } from '../types';
import type { BriefingRow } from '../briefing';
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

// Duplicated intentionally from briefing.ts's parseBriefingDate/fmtNameDate.
// briefing.ts's buildYtNames wraps the formulas below, so this module can't
// import the *value* parseBriefingDate back from briefing.ts without a real
// circular dependency (the BriefingRow *type* import below is fine — type
// imports are erased at compile time). It's ~10 lines; not worth that risk.
function parseBriefingDateLocal(s: string | undefined): string {
  const str = (s ?? '').trim();
  if (!str) return '';
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

function fmtNameDate(dateStr: string): string {
  const parsed = parseBriefingDateLocal(dateStr);
  if (!parsed) return '';
  const [y, m, d] = parsed.split('-');
  return `${d}.${m}.${y}`;
}

export const shimanoCampaignFormula: NamingFormula<Partial<GoogleCampaign>> = {
  id: 'shimano-manual-campaign',
  label: 'Shimano — Campaign Name',
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

export const shimanoAdGroupFormula: NamingFormula<Partial<GoogleCampaign>> = {
  id: 'shimano-manual-adgroup',
  label: 'Shimano — Ad Group Name',
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

// Briefing-import formulas read raw briefing codes directly. The KC segment
// sits at a DIFFERENT position than the manual ad-group formula above:
// between market_code and country_code, always contributing either '' or
// 'KC' rather than being appended afterward — and in the campaign name it's
// appended at the very end, after the dates, not before them like the
// manual campaign formula. Both positions are intentional: they mirror the
// original Excel briefing sheet's TEXTJOIN formula exactly. Do not "fix"
// this inconsistency — it IS the existing output.
export const shimanoBriefingCampaignFormula: NamingFormula<BriefingRow> = {
  id: 'shimano-briefing-campaign',
  label: 'Shimano — Campaign Name (briefing import)',
  source: 'briefing-import',
  resolve: (r) => {
    const ah = r.key_product === '_' ? '' : r.key_product;
    return [
      r.channel_code,
      r.perf_code,
      r.category,
      r.subcategory,
      r.product,
      r.market_code,
      r.country_code,
      fmtNameDate(r.start_date),
      fmtNameDate(r.end_date),
      ah === 'KC' ? 'KC' : '',
    ];
  },
};

export const shimanoBriefingAdGroupFormula: NamingFormula<BriefingRow> = {
  id: 'shimano-briefing-adgroup',
  label: 'Shimano — Ad Group Name (briefing import)',
  source: 'briefing-import',
  resolve: (r) => {
    const ah = r.key_product === '_' ? '' : r.key_product;
    return [
      r.channel_code,
      r.perf_code,
      r.category,
      r.subcategory,
      r.product,
      r.market_code,
      ah, // '' or 'KC' — sits here, not appended at the end
      r.country_code,
      fmtNameDate(r.start_date),
      fmtNameDate(r.end_date),
    ];
  },
};

export const shimanoConvention: NamingConvention = {
  id: 'shimano',
  name: 'Shimano Naming Convention',
  clientMode: 'shimano',
  locked: true,
};
