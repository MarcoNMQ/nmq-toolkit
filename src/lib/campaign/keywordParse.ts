// Bulk keyword parsing for Google Search — paste a list (comma- or
// newline-separated, so both "a, b, c" and one-per-Excel-row paste work)
// and read the match type off the keyword's own syntax, exactly how
// Google Ads/Editor itself writes it: [exact], "phrase", or plain broad.
import type { GoogleKeyword } from './types';

export type ParsedKeyword = Pick<GoogleKeyword, 'text' | 'matchType'>;

/** One raw token (already split and trimmed) → its text + match type.
 *  Only strips the markers when BOTH ends are present — a stray/unclosed
 *  bracket or quote is almost certainly a typo, not an unfinished match
 *  type, so it's kept as literal broad-match text rather than guessed at. */
function parseToken(raw: string): ParsedKeyword | null {
  const token = raw.trim();
  if (!token) return null;

  if (token.length >= 2 && token[0] === '[' && token[token.length - 1] === ']') {
    const inner = token.slice(1, -1).trim();
    return inner ? { text: inner, matchType: 'Exact' } : null;
  }
  if (token.length >= 2 && token[0] === '"' && token[token.length - 1] === '"') {
    const inner = token.slice(1, -1).trim();
    return inner ? { text: inner, matchType: 'Phrase' } : null;
  }
  return { text: token, matchType: 'Broad' };
}

/** Splits on commas and newlines (both at once, so either paste style — a
 *  comma-separated line, or one keyword per Excel row/line — works without
 *  the user picking a format), then parses each token's match type. */
export function parseKeywordList(raw: string): ParsedKeyword[] {
  return raw
    .split(/[\n,]+/)
    .map(parseToken)
    .filter((k): k is ParsedKeyword => k !== null);
}

const MATCH_TYPE_SYNONYMS: Record<string, GoogleKeyword['matchType']> = {
  broad: 'Broad', b: 'Broad',
  phrase: 'Phrase', p: 'Phrase',
  exact: 'Exact', e: 'Exact',
};

function normalizeMatchTypeCell(raw: string): GoogleKeyword['matchType'] | null {
  return MATCH_TYPE_SYNONYMS[raw.trim().toLowerCase()] ?? null;
}

function looksLikeHeaderCell(s: string): boolean {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, '') === 'keyword' || s.trim().toLowerCase().replace(/[\s_-]+/g, '') === 'keywords';
}

/** Minimal CSV→rows split for the bulk keyword file upload — a keyword
 *  never contains a literal comma, so a plain split (no quoted-field
 *  handling) is enough here, unlike a general-purpose CSV parser. */
export function splitCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(','));
}

/** Parses a spreadsheet's raw rows (one row = one array of cell strings),
 *  supporting TWO formats at once, row by row:
 *  - Two columns: the keyword as plain text in column A, an explicit match
 *    type ("Phrase"/"Exact"/"Broad", or P/E/B) in column B — this wins
 *    whenever column B holds a recognizable value, regardless of whether
 *    column A also happens to have brackets/quotes in it.
 *  - One column: the keyword's own [brackets]/"quotes" syntax, same
 *    detection as the paste box.
 *  A first row that looks like a "Keyword" header is skipped automatically. */
export function parseKeywordRows(rows: (string | undefined)[][]): ParsedKeyword[] {
  const result: ParsedKeyword[] = [];
  rows.forEach((row, i) => {
    const cells = row.map((c) => (c ?? '').trim()).filter((c) => c.length > 0);
    if (cells.length === 0) return;
    if (i === 0 && looksLikeHeaderCell(cells[0])) return;

    if (cells.length >= 2) {
      const explicit = normalizeMatchTypeCell(cells[1]);
      if (explicit) {
        if (cells[0]) result.push({ text: cells[0], matchType: explicit });
        return;
      }
    }
    // No recognizable match-type column — fall back to the keyword's own
    // embedded syntax, same as a single pasted/one-column line.
    const parsed = parseToken(cells[0]);
    if (parsed) result.push(parsed);
  });
  return result;
}

/** De-duplicates by (text, matchType) — case-insensitive on the text, since
 *  "Fishing Rods" and "fishing rods" are the same keyword to Google Ads.
 *  Returns the keywords to actually add plus how many were dropped as
 *  duplicates (either within the pasted batch, or against what's already
 *  on the campaign), so the UI can tell the user both numbers honestly. */
export function dedupeKeywords(
  candidates: ParsedKeyword[], existing: ParsedKeyword[],
): { toAdd: ParsedKeyword[]; duplicateCount: number } {
  const seen = new Set(existing.map((k) => `${k.text.trim().toLowerCase()}|${k.matchType}`));
  const toAdd: ParsedKeyword[] = [];
  let duplicateCount = 0;
  for (const k of candidates) {
    const key = `${k.text.trim().toLowerCase()}|${k.matchType}`;
    if (seen.has(key)) { duplicateCount += 1; continue; }
    seen.add(key);
    toAdd.push(k);
  }
  return { toAdd, duplicateCount };
}
