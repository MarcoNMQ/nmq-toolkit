import type { FbPageEntry } from './store';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export interface ParsedFbPageRow {
  name: string;
  pageId: string;
}

export interface ParseFbPagesResult {
  rows: ParsedFbPageRow[];
  /** Lines that didn't look like "name, long numeric id" — surfaced to the
   *  person pasting so a typo or a stray header row doesn't silently vanish. */
  invalidLines: string[];
}

/** Parses pasted "Page name <tab/comma/multi-space> Page ID" rows — the
 *  exact shape Meta Business Settings' own page list copies as (and what a
 *  spreadsheet export of it looks like pasted as plain text). One row per
 *  line; a Page ID is a run of 10+ digits, since Facebook Page IDs are
 *  always long numeric strings — this is what tells a name apart from its
 *  ID when a name itself contains no separator. */
export function parseFbPagesPaste(text: string): ParseFbPagesResult {
  const rows: ParsedFbPageRow[] = [];
  const invalidLines: string[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip an obvious header row ("Page name\tPage ID").
    if (/^page\s*name/i.test(line)) continue;

    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    let name: string;
    let pageId: string;
    if (parts.length >= 2) {
      pageId = parts[parts.length - 1].trim();
      name = parts.slice(0, -1).join(parts.includes('\t') ? '\t' : ',').trim();
    } else {
      // No tab/comma — fall back to splitting off the trailing digit run.
      const match = line.match(/^(.*\S)\s+(\d{10,})$/);
      if (!match) {
        invalidLines.push(rawLine);
        continue;
      }
      [, name, pageId] = match;
    }

    if (!name || !/^\d{10,}$/.test(pageId)) {
      invalidLines.push(rawLine);
      continue;
    }
    rows.push({ name, pageId });
  }

  return { rows, invalidLines };
}

/** Merges freshly parsed rows into an existing list: a pageId already
 *  present gets its name updated (and keeps its stable `id`, so anything
 *  already referencing that entry stays valid); a new pageId is appended.
 *  Existing entries absent from the parsed rows are left untouched — a
 *  partial re-paste only adds/updates, it never deletes. */
export function mergeFbPages(existing: FbPageEntry[], parsed: ParsedFbPageRow[]): FbPageEntry[] {
  const byPageId = new Map(existing.map((p) => [p.pageId, p]));
  for (const row of parsed) {
    const current = byPageId.get(row.pageId);
    if (current) byPageId.set(row.pageId, { ...current, name: row.name });
    else byPageId.set(row.pageId, { id: uid(), name: row.name, pageId: row.pageId });
  }
  return [...byPageId.values()];
}
