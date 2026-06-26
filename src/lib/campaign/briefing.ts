// Ported 1:1 from shimano_campaign_builder/app.py — briefing import helpers
// (Google Sheets / Excel / CSV briefing parsing, shared by Google and Facebook import flows)

import { COUNTRY_GROUP_PRESETS, COUNTRY_OPTIONS, MARKET_TO_GROUP } from './constants';
import { generateName } from './naming/generateName';
import { shimanoBriefingCampaignFormula, shimanoBriefingAdGroupFormula } from './naming/shimano';

export interface BriefingRow {
  campaign_name: string;
  adset_name: string;
  creative_name: string;
  goal_code: string;
  perf_code: string;
  category: string;
  subcategory: string;
  product: string;
  key_product: string;
  market_code: string;
  country_code: string;
  creative_code: string;
  month: string;
  budget: string;
  final_url: string;
  asset_link: string;
  start_date: string;
  end_date: string;
  shimano_comments: string;
  channel_code: string;
}

// The set of fields the importer can fill in, and the column-name guesses it
// tries for each one. Used both for auto-detection and to drive the manual
// column-mapping UI when a briefing sheet doesn't follow Shimano's exact
// column naming.
export const BRIEFING_FIELDS: { key: keyof BriefingRow; label: string; guesses: string[] }[] = [
  { key: 'channel_code', label: 'Channel', guesses: ['Channel_Code', 'Channel'] },
  { key: 'campaign_name', label: 'Campaign name', guesses: ['CAMPAIGN NAME', 'Campaign Name'] },
  { key: 'adset_name', label: 'Ad set name', guesses: ['AD SET NAME', 'Ad Set Name'] },
  { key: 'creative_name', label: 'Creative name', guesses: ['CREATIVE NAME', 'Creative Name'] },
  { key: 'goal_code', label: 'Performance goal', guesses: ['Performance_Goal'] },
  { key: 'perf_code', label: 'Goal code', guesses: ['Goal_Code'] },
  { key: 'category', label: 'Category', guesses: ['Category_Code'] },
  { key: 'subcategory', label: 'Subcategory', guesses: ['SUbCategory_code', 'SubCategory_code'] },
  { key: 'product', label: 'Product', guesses: ['Product_code'] },
  { key: 'key_product', label: 'Key product code', guesses: ['Key_Product_code'] },
  { key: 'market_code', label: 'Market code', guesses: ['Market_Code'] },
  { key: 'country_code', label: 'Country code', guesses: ['Country_Code'] },
  { key: 'creative_code', label: 'Creative code', guesses: ['Creative_Code'] },
  { key: 'month', label: 'Month', guesses: ['Month'] },
  { key: 'budget', label: 'Budget', guesses: ['Budget'] },
  { key: 'final_url', label: 'CTA / Final URL', guesses: ['CTA'] },
  { key: 'asset_link', label: 'Asset link (video URL)', guesses: ['Asset Link', 'Asset_Link'] },
  { key: 'start_date', label: 'Start date', guesses: ['START DATE'] },
  { key: 'end_date', label: 'End date', guesses: ['END DATE'] },
  { key: 'shimano_comments', label: 'Comments (used for free-text country extraction)', guesses: ['SHIMANO COMMENTS', 'COMMENTS'] },
];

export type ColumnMap = Partial<Record<keyof BriefingRow, string>>;

export const DEFAULT_CHANNEL_CODES: Record<'google' | 'facebook', string[]> = {
  google: ['YT'],
  facebook: ['FBIG', 'FB', 'IG'],
};

/** Minimal RFC4180 CSV parser — handles quoted fields, escaped quotes, and CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const clean = text.replace(/^﻿/, '');
  while (i < clean.length) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseGSheetUrl(url: string): { sheetId: string | null; gid: string } {
  const m = url.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return { sheetId: null, gid: '0' };
  const gidM = url.match(/gid=(\d+)/);
  return { sheetId: m[1], gid: gidM ? gidM[1] : '0' };
}

/** Fetch list of (gid, title) tab pairs from a Google Sheet's edit-page HTML. Server-side only. */
export async function fetchSheetTabs(sheetId: string): Promise<[string, string][]> {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, { redirect: 'follow' });
    const text = await res.text();
    const titles = Array.from(text.matchAll(/"title"\s*:\s*"([^"]+)"/g)).map((m) => m[1]);
    const gids = Array.from(text.matchAll(/"gid"\s*:\s*"?(\d+)"?/g)).map((m) => m[1]);
    if (titles.length && gids.length) {
      const seen = new Set<string>();
      const pairs: [string, string][] = [];
      for (let i = 0; i < Math.min(titles.length, gids.length); i++) {
        const key = `${gids[i]}|${titles[i]}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([gids[i], titles[i]]);
        }
      }
      return pairs.slice(0, 20);
    }
  } catch {
    // non-fatal — caller falls back to the gid from the URL
  }
  return [];
}

function findCol(headers: string[], name: string): string | null {
  const exact = headers.find((k) => k.trim().toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  return headers.find((k) => k.trim().toLowerCase().includes(name.toLowerCase())) ?? null;
}

/** Find which row in the sheet looks like the header row (first 10 rows scanned). */
export function detectHeaderRow(rawRows: string[][]): number {
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    if (rawRows[i].some((c) => /channel|campaign/i.test(c ?? ''))) return i;
  }
  return 0;
}

/** Best-effort guess at which header matches each briefing field, for pre-filling the mapping UI. */
export function autoDetectColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const field of BRIEFING_FIELDS) {
    for (const guess of field.guesses) {
      const found = findCol(headers, guess);
      if (found) {
        map[field.key] = found;
        break;
      }
    }
  }
  return map;
}

/** Turn raw sheet rows into header-keyed dicts, given the header row index. */
export function rowsToDicts(rawRows: string[][], headerIdx: number): { headers: string[]; dicts: Record<string, string>[] } {
  const headers = (rawRows[headerIdx] ?? []).map((h) => h ?? '');
  const dataRows = rawRows.slice(headerIdx + 1);
  const dicts: Record<string, string>[] = [];
  for (const row of dataRows) {
    if (!row.some((c) => (c ?? '').trim())) continue;
    const dict: Record<string, string> = {};
    headers.forEach((h, i) => {
      dict[h] = row[i] ?? '';
    });
    dicts.push(dict);
  }
  return { headers, dicts };
}

/**
 * Build BriefingRow[] from header-keyed dicts using an explicit column map.
 * If channelCodes is null, every row is included (no channel filtering) —
 * used when the sheet has no channel column, e.g. a non-Shimano briefing.
 */
export function buildRowsFromMap(
  dicts: Record<string, string>[],
  map: ColumnMap,
  channelCodes: Set<string> | null,
): { rows: BriefingRow[]; debug: string } {
  const v = (d: Record<string, string>, field: keyof BriefingRow) => {
    const col = map[field];
    return col ? (d[col] ?? '').trim() : '';
  };

  const chVals = map.channel_code
    ? Array.from(new Set(dicts.map((d) => v(d, 'channel_code')).filter(Boolean))).sort()
    : [];
  const debug = `Rows: ${dicts.length} | Channel col: "${map.channel_code ?? '(none)'}" | Channel values: ${chVals}`;

  let lastCamp = '';
  let lastAg = '';
  const rows: BriefingRow[] = [];
  for (const d of dicts) {
    const chCode = v(d, 'channel_code').toUpperCase();
    if (channelCodes && !channelCodes.has(chCode)) continue;
    const campName = v(d, 'campaign_name') || lastCamp;
    const agName = v(d, 'adset_name') || lastAg;
    if (v(d, 'campaign_name')) lastCamp = v(d, 'campaign_name');
    if (v(d, 'adset_name')) lastAg = v(d, 'adset_name');
    rows.push({
      campaign_name: campName,
      adset_name: agName,
      creative_name: v(d, 'creative_name'),
      goal_code: v(d, 'goal_code'),
      perf_code: v(d, 'perf_code'),
      category: v(d, 'category'),
      subcategory: v(d, 'subcategory'),
      product: v(d, 'product'),
      key_product: v(d, 'key_product'),
      market_code: v(d, 'market_code'),
      country_code: v(d, 'country_code'),
      creative_code: v(d, 'creative_code'),
      month: v(d, 'month'),
      budget: v(d, 'budget'),
      final_url: v(d, 'final_url'),
      asset_link: v(d, 'asset_link'),
      start_date: v(d, 'start_date'),
      end_date: v(d, 'end_date'),
      shimano_comments: v(d, 'shimano_comments'),
      channel_code: chCode,
    });
  }
  return { rows, debug };
}

/** Auto-detect convenience wrapper: header row + column guesses + channel filter, all in one call. */
export function parseBriefingRawToRows(
  rawRows: string[][],
  channelCodes: Set<string>,
): { rows: BriefingRow[]; debug: string; headers: string[]; dicts: Record<string, string>[]; columnMap: ColumnMap } {
  if (!rawRows.length) return { rows: [], debug: 'Sheet appears to be empty.', headers: [], dicts: [], columnMap: {} };
  const headerIdx = detectHeaderRow(rawRows);
  const { headers, dicts } = rowsToDicts(rawRows, headerIdx);
  const columnMap = autoDetectColumnMap(headers);
  const { rows, debug } = buildRowsFromMap(dicts, columnMap, channelCodes);
  return { rows, debug, headers, dicts, columnMap };
}

// ── Code → field lookup tables ────────────────────────────────────────────────

export const GOAL_CODE_TO_FB_OBJ: Record<string, string> = {
  CON: 'Traffic',
  AWA: 'Brand Awareness',
  CONV: 'Lead Generation',
  VV: 'Video Views',
  RCH: 'Reach',
  IMP: 'Traffic',
  DG: 'Outcome Awareness',
};

export const PERF_CODE_TO_OPT: Record<string, [string, string]> = {
  IMP: ['IMPRESSIONS', 'IMPRESSIONS'],
  VV: ['VIDEO_VIEWS', 'VIDEO_VIEWS'],
  RCH: ['REACH', 'IMPRESSIONS'],
  TRF: ['LINK_CLICKS', 'LINK_CLICKS'],
  CONV: ['OFFSITE_CONVERSIONS', 'IMPRESSIONS'],
  SUBS: ['VIDEO_VIEWS', 'VIDEO_VIEWS'],
  DG: ['IMPRESSIONS', 'IMPRESSIONS'],
};

export const CREATIVE_CODE_TO_TYPE: Record<string, string> = {
  IMG: 'Standard',
  VID: 'Page post ad',
  CAR: 'Page post ad',
};

export const MARKET_CODE_TO_COUNTRIES: Record<string, string[]> = {
  SEU: COUNTRY_GROUP_PRESETS['Europe'] ?? [],
  SGF: ['DE'], SIF: ['IT'], SFFT: ['FR'],
  SBXF: ['BE'], SEFH: ['HU'], SFTK: ['CZ'],
  SNF: ['NL'], SUK: ['UK'], SPOF: ['PL'],
  SSPF: ['ES', 'PT'],
};

export const GOAL_CODE_TO_GOOGLE_MAIN: Record<string, string> = {
  CON: 'Traffic',
  AWA: 'Awareness',
  CONV: 'Conversions',
  VV: 'Engagement',
  RCH: 'Awareness',
  IMP: 'Awareness',
  DG: 'Awareness',
};

export const PERF_CODE_TO_GOOGLE_PERF: Record<string, string> = {
  IMP: 'Impressions',
  VV: 'Video Views',
  RCH: 'Reach',
  TRF: 'Traffic',
  CONV: 'Conversions',
  SUBS: 'Subscribers',
  DG: 'Demand Gen',
};

const W_CODE_MAP: Record<string, string> = {
  GER: 'DE', ROM: 'RO', POR: 'PT',
  NL: 'NL', BE: 'BE', DE: 'DE', FR: 'FR', SE: 'SE',
  PL: 'PL', IT: 'IT', ES: 'ES', PT: 'PT', HU: 'HU',
  CZ: 'CZ', RO: 'RO', LIT: 'LIT', SLOW: 'SLOW',
  SLOV: 'SLOV', AUS: 'AUS', CRO: 'CRO', NO: 'NO',
  FI: 'FI', DK: 'DK', UK: 'UK',
};

export const MONTH_CODE_TO_MONTH: Record<string, string> = {
  JAN: 'January', FEB: 'February', MAR: 'March',
  APR: 'April', MAY: 'May', JUN: 'June',
  JUL: 'July', AUG: 'August', SEPT: 'September',
  OCT: 'October', NOV: 'November', DEC: 'December',
};

/** Extract country codes from the free-text "SHIMANO COMMENTS" column. */
export function parseCountriesFromW(text: string): string[] {
  if (!text) return [];
  const normalised = text.replace(/[\r\n]+/g, ' | ');
  let countryStr = '';
  const targetMatch = normalised.match(/[Tt]arget\s*(?:anglers\s+in|:)\s*([\w,/\s]+?)(?:\s*\||$)/);
  if (targetMatch) {
    countryStr = targetMatch[1];
  } else {
    const parts = normalised.split('|');
    for (const part of parts) {
      const trimmed = part.trim();
      if (/\b[A-Z]{2,4}\b/.test(trimmed)) {
        countryStr = trimmed;
        break;
      }
    }
  }
  const raw = countryStr.trim().split(/[,/]\s*/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of raw) {
    const code = token.trim().toUpperCase();
    const mapped = W_CODE_MAP[code];
    if (mapped && !seen.has(mapped) && COUNTRY_OPTIONS.includes(mapped)) {
      result.push(mapped);
      seen.add(mapped);
    }
  }
  return result;
}

export function parseBriefingDate(s: string | undefined): string {
  const str = (s ?? '').trim();
  if (!str) return '';
  // Try dd/mm/yyyy, yyyy-mm-dd, mm/dd/yyyy, dd-mm-yyyy — normalise to yyyy-mm-dd (HTML date input format)
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

export function parseBriefingBudget(s: string | undefined): number {
  const cleaned = (s ?? '').replace(/[€,\s£$]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** An Asset Link cell can hold one URL or several, one per line — multiple
 *  links in the same row means multiple separate ads under the same ad set
 *  ("ad diversification" in Shimano's briefing convention), not one ad per
 *  row. Splits on newlines/commas and keeps only tokens that look like a
 *  URL — the row may also have stray whitespace or blank lines from how
 *  Sheets/Excel stores wrapped multi-line cells. */
export function splitAssetLinks(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

/** Build campaign and ad set names from briefing code columns (exact naming convention).
 *  Delegates to the naming engine in src/lib/naming/ — see shimano.ts for the
 *  actual formulas and why the KC segment sits where it does. */
export function buildYtNames(r: BriefingRow): { campaignName: string; adsetName: string } {
  return {
    campaignName: generateName(shimanoBriefingCampaignFormula.resolve(r)),
    adsetName: generateName(shimanoBriefingAdGroupFormula.resolve(r)),
  };
}
