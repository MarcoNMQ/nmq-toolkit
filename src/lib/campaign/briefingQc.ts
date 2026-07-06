import {
  GOAL_CODE_TO_GOOGLE_MAIN, MARKET_CODE_TO_COUNTRIES,
  PERF_CODE_TO_GOOGLE_PERF, buildYtNames, type BriefingRow,
} from './briefing';

export interface QcFlag {
  field: string;
  message: string;
}

export interface RowQcResult {
  flags: QcFlag[];
}

const VIDEO_ID_RE = /(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

function hasVideoId(assetLink: string | undefined): boolean {
  return !!assetLink?.match(VIDEO_ID_RE);
}

const KNOWN_PERF_CODES = new Set(Object.keys(PERF_CODE_TO_GOOGLE_PERF));
const KNOWN_GOAL_CODES = new Set(Object.keys(GOAL_CODE_TO_GOOGLE_MAIN));
const KNOWN_MARKET_CODES = new Set(Object.keys(MARKET_CODE_TO_COUNTRIES));
const DATE_SEG_RE = /^\d{2}\.\d{2}\.\d{4}$/;

export function qcBriefingRows(rows: BriefingRow[]): RowQcResult[] {
  // Pre-compute names for duplicate and consistency checks
  const names = rows.map((r) => {
    try { return buildYtNames(r); }
    catch { return { campaignName: '', adsetName: '' }; }
  });

  // Build duplicate index: "campaignName__adsetName" → row indices
  const dupeMap = new Map<string, number[]>();
  names.forEach(({ campaignName, adsetName }, i) => {
    if (!campaignName && !adsetName) return;
    const key = `${campaignName}__${adsetName}`;
    const list = dupeMap.get(key) ?? [];
    list.push(i);
    dupeMap.set(key, list);
  });

  return rows.map((r, i) => {
    const flags: QcFlag[] = [];
    const { campaignName, adsetName } = names[i];

    // 1. Final URL
    if (!r.final_url?.trim()) {
      flags.push({ field: 'Final URL', message: 'Final URL is blank — ad will have no destination link.' });
    } else if (!/^https?:\/\//i.test(r.final_url)) {
      flags.push({
        field: 'Final URL',
        message: `No landing URL — CTA column says: "${r.final_url}". This is expected for awareness/engagement rows with no click-through.`,
      });
    }

    // 2. Asset link / Video ID
    if (!r.asset_link?.trim()) {
      flags.push({ field: 'Asset Link', message: 'Asset Link is blank — no video ID can be extracted for this ad.' });
    } else if (!hasVideoId(r.asset_link)) {
      flags.push({
        field: 'Asset Link',
        message: `No YouTube ID found in asset link: "${r.asset_link.slice(0, 80)}"`,
      });
    }

    // 3. Unmapped codes
    if (!r.perf_code?.trim()) {
      flags.push({ field: 'Goal Code', message: 'Goal Code is blank — campaign and ad group names will be incomplete.' });
    } else if (!KNOWN_PERF_CODES.has(r.perf_code)) {
      flags.push({ field: 'Goal Code', message: `Unknown goal code "${r.perf_code}" — perf_goal won't map and name will include the raw code.` });
    }

    if (r.goal_code && !KNOWN_GOAL_CODES.has(r.goal_code)) {
      flags.push({ field: 'Performance Goal', message: `Unknown performance goal "${r.goal_code}" — main_goal won't map to a Google objective.` });
    }

    if (!r.market_code?.trim()) {
      flags.push({ field: 'Market Code', message: 'Market Code is blank — no countries will be targeted.' });
    } else if (!KNOWN_MARKET_CODES.has(r.market_code)) {
      flags.push({ field: 'Market Code', message: `Unknown market code "${r.market_code}" — no countries will be targeted.` });
    }

    if (!r.category?.trim()) {
      flags.push({ field: 'Category', message: 'Category is blank — campaign name will be incomplete.' });
    }

    // 4. Duplicate name collision
    const dupeKey = `${campaignName}__${adsetName}`;
    const dupeGroup = dupeMap.get(dupeKey) ?? [];
    if (dupeGroup.length > 1 && campaignName) {
      const isFirst = dupeGroup[0] === i;
      flags.push({
        field: 'Name collision',
        message: isFirst
          ? `${dupeGroup.length} rows produce the same campaign + ad group name. They'll import as ${dupeGroup.length} separate campaigns (auto-renamed _2, _3…). If they're different ads in one ad set, import one row and add the other ads manually.`
          : `Same name as row ${(dupeGroup[0] ?? 0) + 1} — will be renamed on import.`,
      });
    }

    // 5. Name consistency — regression guard for Bug 2
    //    Every non-date segment of the ad group name should appear in the campaign name.
    if (campaignName && adsetName) {
      const campSegs = new Set(campaignName.split('_'));
      const missingSegs = adsetName
        .split('_')
        .filter((seg) => seg && !DATE_SEG_RE.test(seg) && !campSegs.has(seg));
      if (missingSegs.length > 0) {
        flags.push({
          field: 'Name mismatch',
          message: `Campaign name is missing segments from the ad group name: "${missingSegs.join('", "')}". This likely indicates a naming formula error — do not export until this is resolved. Campaign: "${campaignName}" | Ad group: "${adsetName}"`,
        });
      }
    }

    return { flags };
  });
}
