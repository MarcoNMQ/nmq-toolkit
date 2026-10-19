// Plan vs Actuals — importing real campaign results from a CSV or Excel
// file. Mirrors the field-mapping pattern already proven in
// src/lib/campaign/briefing.ts (declared target fields with name guesses,
// auto-detect, manual override), reimplemented locally rather than
// imported across the campaign/media-plan namespace boundary (see
// project notes on nmq-toolkit's deliberate per-app namespacing).
import type { ActualsMetricKey, ActualsRow, AmazonFormat, Channel, Goal, LinkedInFormat } from './types';
import { MARKET_LABELS } from './constants';

export type TargetFieldKey =
  | 'startDate' | 'endDate' | 'market' | 'channel' | 'goal' | 'format' | 'campaignName'
  | 'spend' | 'impressions' | 'reach' | 'clicks' | 'views' | 'conversions' | 'sessions'
  | 'sends' | 'opens' | 'cta_clicks' | 'form_completions';

export interface ActualsFieldDef {
  key: TargetFieldKey;
  label: string;
  required: boolean;
  guesses: string[];
}

// Order here is also the order the mapping UI shows fields in.
export const ACTUALS_FIELDS: ActualsFieldDef[] = [
  { key: 'startDate', label: 'Date (or start date)', required: true, guesses: ['date', 'start date', 'startdate', 'week', 'week start', 'day'] },
  { key: 'endDate', label: 'End date (optional)', required: false, guesses: ['end date', 'enddate', 'week end'] },
  { key: 'market', label: 'Market / Country', required: true, guesses: ['market', 'country', 'geo', 'region'] },
  { key: 'channel', label: 'Channel', required: true, guesses: ['channel', 'platform', 'media channel', 'network'] },
  { key: 'goal', label: 'Objective / Goal (optional)', required: false, guesses: ['objective', 'goal', 'campaign objective', 'funnel stage'] },
  { key: 'format', label: 'Ad format (optional)', required: false, guesses: ['format', 'ad format', 'creative type', 'placement'] },
  { key: 'campaignName', label: 'Campaign name (optional)', required: false, guesses: ['campaign', 'campaign name'] },
  { key: 'spend', label: 'Spend / Cost', required: true, guesses: ['spend', 'cost', 'amount spent', 'budget spent', 'media cost'] },
  { key: 'impressions', label: 'Impressions (optional)', required: false, guesses: ['impressions', 'impr', 'imps'] },
  { key: 'reach', label: 'Reach (optional)', required: false, guesses: ['reach', 'unique reach'] },
  { key: 'clicks', label: 'Clicks (optional)', required: false, guesses: ['clicks', 'link clicks'] },
  { key: 'views', label: 'Views (optional)', required: false, guesses: ['views', 'video views', 'thruplays'] },
  { key: 'conversions', label: 'Conversions / Leads (optional)', required: false, guesses: ['conversions', 'leads', 'results'] },
  { key: 'sessions', label: 'Sessions (optional)', required: false, guesses: ['sessions', 'landing page views'] },
  { key: 'sends', label: 'Sends (optional — Sponsored Message/Conversation Ad)', required: false, guesses: ['sends', 'messages sent'] },
  { key: 'opens', label: 'Opens (optional — Sponsored Message/Conversation Ad)', required: false, guesses: ['opens', 'messages opened'] },
  { key: 'cta_clicks', label: 'CTA clicks (optional — Sponsored Message/Conversation Ad)', required: false, guesses: ['cta clicks', 'ctaclicks'] },
  { key: 'form_completions', label: 'Form completions (optional — Document Ad/Lead Gen Form)', required: false, guesses: ['form completions', 'leads submitted', 'form submits'] },
];

export type ColumnMap = Partial<Record<TargetFieldKey, string>>;

const METRIC_KEYS: ActualsMetricKey[] = [
  'impressions', 'reach', 'clicks', 'views', 'conversions', 'sessions',
  'sends', 'opens', 'cta_clicks', 'form_completions',
];

// Normalise to lowercase with all separators removed, same trick as
// briefing.ts's autodetect — "Ad Format" and "ad_format" both normalise
// to "adformat".
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function findCol(headers: string[], name: string): string | null {
  const normName = norm(name);
  const exact = headers.find((h) => norm(h) === normName);
  if (exact) return exact;
  return headers.find((h) => norm(h).includes(normName)) ?? null;
}

/** Best-effort guess at which header matches each target field, for
 *  pre-filling the mapping UI. Never required to get it right — the user
 *  can always override before importing. */
export function autoDetectColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const field of ACTUALS_FIELDS) {
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

/** Which required fields are still unmapped — block the import on this,
 *  before even trying to build rows, so the error is about the file's
 *  shape, not a buried per-row failure. */
export function missingRequiredFields(map: ColumnMap): ActualsFieldDef[] {
  return ACTUALS_FIELDS.filter((f) => f.required && !map[f.key]);
}

/** Minimal RFC4180 CSV parser — handles quoted fields, escaped quotes, CRLF/LF. */
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
        if (clean[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Turn raw rows (first row = headers) into header-keyed dicts. */
export function rowsToDicts(rawRows: string[][]): { headers: string[]; dicts: Record<string, string>[] } {
  const headers = (rawRows[0] ?? []).map((h) => h ?? '');
  const dicts: Record<string, string>[] = [];
  for (const row of rawRows.slice(1)) {
    if (!row.some((c) => (c ?? '').trim())) continue;
    const dict: Record<string, string> = {};
    headers.forEach((h, i) => { dict[h] = row[i] ?? ''; });
    dicts.push(dict);
  }
  return { headers, dicts };
}

const CHANNEL_SYNONYMS: Record<string, Channel> = {
  search: 'Search', googlesearch: 'Search', sem: 'Search', ppc: 'Search', adwords: 'Search', googleads: 'Search',
  youtube: 'YouTube', yt: 'YouTube',
  linkedin: 'LinkedIn', li: 'LinkedIn', linkedinads: 'LinkedIn',
  display: 'Display', gdn: 'Display', googledisplay: 'Display', programmatic: 'Display', dv360: 'Display',
  amazon: 'Amazon Ads', amazonads: 'Amazon Ads', amazondsp: 'Amazon Ads',
};

const GOAL_SYNONYMS: Record<string, Goal> = {
  awareness: 'Awareness', brandawareness: 'Awareness', reach: 'Awareness', videoviews: 'Awareness',
  traffic: 'Traffic', clicks: 'Traffic', engagement: 'Traffic',
  conversion: 'Conversion', conversions: 'Conversion', leads: 'Conversion', leadgeneration: 'Conversion', demandgen: 'Conversion',
};

const LI_FORMAT_SYNONYMS: Record<string, LinkedInFormat> = {
  static: 'Static', image: 'Static', singleimage: 'Static',
  video: 'Video',
  carousel: 'Carousel',
  sponsoredmessage: 'Sponsored Message / Conversational Ad', messagead: 'Sponsored Message / Conversational Ad', inmail: 'Sponsored Message / Conversational Ad',
  conversationad: 'Conversation Ad',
  documentad: 'Document Ad', document: 'Document Ad',
  leadgenform: 'Lead Gen Form', leadform: 'Lead Gen Form',
};

const AMAZON_FORMAT_SYNONYMS: Record<string, AmazonFormat> = {
  sponsoredproducts: 'Sponsored Products', sp: 'Sponsored Products',
  sponsoredbrands: 'Sponsored Brands', sb: 'Sponsored Brands',
  sponsoreddisplay: 'Sponsored Display', sd: 'Sponsored Display',
};

function normalizeChannel(raw: string): Channel | undefined {
  return CHANNEL_SYNONYMS[norm(raw)];
}

function normalizeGoal(raw: string): Goal | undefined {
  return GOAL_SYNONYMS[norm(raw)];
}

function normalizeFormat(raw: string, channel: Channel): { liFormat?: LinkedInFormat; amazonFormat?: AmazonFormat } {
  if (channel === 'LinkedIn') return { liFormat: LI_FORMAT_SYNONYMS[norm(raw)] };
  if (channel === 'Amazon Ads') return { amazonFormat: AMAZON_FORMAT_SYNONYMS[norm(raw)] };
  return {};
}

function normalizeMarket(raw: string): string | undefined {
  const n = norm(raw);
  for (const [code, label] of Object.entries(MARKET_LABELS)) {
    if (norm(code) === n || norm(label) === n) return code;
  }
  return undefined;
}

// Accepts dd/mm/yyyy, yyyy-mm-dd, mm-dd-yyyy-style separators with any of
// '/', '-' — normalises to ISO 'YYYY-MM-DD'. Mirrors
// src/lib/campaign/briefing.ts's parseBriefingDate convention (EU-style
// dd/mm/yyyy for slash-separated dates, since this tool is EU-market
// first), reimplemented locally rather than imported across namespaces.
export function parseActualsDate(raw: string): string | null {
  const str = raw.trim();
  if (!str) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(str);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[€$£,\s]/g, '');
  if (!cleaned) return undefined;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export interface RowIssue {
  rowIndex: number; // 1-based, counting the header row as row 1 (so it lines up with what a user sees in Excel/Sheets)
  reason: string;
}

export interface ActualsImportResult {
  rows: ActualsRow[];
  skipped: RowIssue[];
  // Dataset-level notices — not blocking, but worth surfacing (e.g. "8
  // rows had a market we couldn't recognise — kept as free text, won't
  // match by market for suggestions").
  notices: string[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Builds ActualsRow[] from mapped dicts, given an already-validated
 *  column map (call missingRequiredFields() first). Never silently turns
 *  a missing optional metric into 0 — it's just absent from `metrics`.
 *  Rows that fail a REQUIRED field (date, market, channel, spend) are
 *  excluded and reported in `skipped`, never dropped silently. */
export function buildActualsRows(dicts: Record<string, string>[], map: ColumnMap): ActualsImportResult {
  const rows: ActualsRow[] = [];
  const skipped: RowIssue[] = [];
  let unrecognizedMarketCount = 0;
  let unrecognizedFormatCount = 0;
  let unrecognizedGoalCount = 0;

  dicts.forEach((d, i) => {
    const rowIndex = i + 2; // +1 for 1-based, +1 for the header row itself
    const get = (key: TargetFieldKey) => { const col = map[key]; return col ? (d[col] ?? '').trim() : ''; };

    const startDateRaw = get('startDate');
    const startDate = parseActualsDate(startDateRaw);
    if (!startDate) { skipped.push({ rowIndex, reason: `Unparseable date: "${startDateRaw}"` }); return; }
    const endDateRaw = get('endDate');
    const endDate = endDateRaw ? (parseActualsDate(endDateRaw) ?? startDate) : startDate;

    const channelRaw = get('channel');
    const channel = normalizeChannel(channelRaw);
    if (!channel) { skipped.push({ rowIndex, reason: `Unrecognized channel: "${channelRaw}"` }); return; }

    const marketRaw = get('market');
    if (!marketRaw) { skipped.push({ rowIndex, reason: 'Missing market' }); return; }
    const market = normalizeMarket(marketRaw);
    if (!market) unrecognizedMarketCount += 1;

    const spendRaw = get('spend');
    const spend = parseNumber(spendRaw);
    if (spend === undefined) { skipped.push({ rowIndex, reason: `Unparseable spend: "${spendRaw}"` }); return; }

    const goalRaw = get('goal');
    const goal = goalRaw ? normalizeGoal(goalRaw) : undefined;
    if (goalRaw && !goal) unrecognizedGoalCount += 1;

    const formatRaw = get('format');
    const { liFormat, amazonFormat } = formatRaw ? normalizeFormat(formatRaw, channel) : {};
    if (formatRaw && !liFormat && !amazonFormat && (channel === 'LinkedIn' || channel === 'Amazon Ads')) unrecognizedFormatCount += 1;

    const metrics: Partial<Record<ActualsMetricKey, number>> = {};
    METRIC_KEYS.forEach((k) => {
      const raw = get(k);
      if (!raw) return; // not reported — leave absent, never 0
      const n = parseNumber(raw);
      if (n !== undefined) metrics[k] = n;
    });

    rows.push({
      id: uid(),
      marketRaw,
      market,
      channel,
      liFormat,
      amazonFormat,
      goal,
      campaignName: get('campaignName') || undefined,
      startDate,
      endDate,
      spend,
      metrics,
    });
  });

  const notices: string[] = [];
  if (unrecognizedMarketCount > 0) notices.push(`${unrecognizedMarketCount} row(s) had a market we couldn't match to a known code — kept as free text, won't match by market for suggestions.`);
  if (unrecognizedGoalCount > 0) notices.push(`${unrecognizedGoalCount} row(s) had an objective we couldn't recognize — left unset, won't match by objective for suggestions.`);
  if (unrecognizedFormatCount > 0) notices.push(`${unrecognizedFormatCount} row(s) had an ad format we couldn't recognize for that channel — left unset, won't match by format for suggestions.`);

  return { rows, skipped, notices };
}
