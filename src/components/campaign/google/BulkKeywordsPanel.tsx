'use client';

import { useMemo, useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { dedupeKeywords, parseKeywordList, parseKeywordRows, splitCsvRows } from '@/lib/campaign/keywordParse';
import type { GoogleKeyword } from '@/lib/campaign/types';

export function BulkKeywordsPanel({
  campaignId, existing, onClose,
}: { campaignId: string; existing: GoogleKeyword[]; onClose: () => void }) {
  const addGoogleKeywordsBulk = useBuilderStore((s) => s.addGoogleKeywordsBulk);
  const [text, setText] = useState('');
  const [fileRows, setFileRows] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      let rows: string[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = splitCsvRows(await file.text());
      } else {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/campaign/parse-keywords-file', { method: 'POST', body: form });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json() as { rows: string[][] };
        rows = data.rows;
      }
      setFileRows(rows);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      setLoading(false);
    }
  }

  const candidates = useMemo(
    () => (fileRows ? parseKeywordRows(fileRows) : parseKeywordList(text)),
    [fileRows, text],
  );
  const existingPairs = useMemo(() => existing.map((k) => ({ text: k.text, matchType: k.matchType })), [existing]);
  const { toAdd, duplicateCount } = useMemo(() => dedupeKeywords(candidates, existingPairs), [candidates, existingPairs]);

  function confirmAdd() {
    if (toAdd.length === 0) return;
    addGoogleKeywordsBulk(campaignId, toAdd);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">Bulk add keywords</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-50" aria-label="Close">✕</button>
        </div>

        <p className="mb-2 text-xs text-ink-500">
          Paste a list below, one per line or comma-separated, or upload a CSV/Excel file.
          Write <span className="font-mono">&quot;a phrase&quot;</span> for Phrase match, <span className="font-mono">[an exact term]</span> for Exact match, or just the word for Broad match.
          In a spreadsheet you can also put the keyword in one column and the match type (Broad / Phrase / Exact) in the next — that always wins over any brackets or quotes in the keyword itself.
        </p>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setFileRows(null); }}
          rows={6}
          placeholder={'fishing rods\n"predator lures"\n[carbon fiber rod]'}
          className="mb-2 w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={loading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="mb-3 block w-full text-xs"
        />
        {loading && <p className="mb-2 text-xs text-ink-400">Reading file…</p>}
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        {candidates.length > 0 && (
          <div className="mb-3 rounded-md border border-ink-100 bg-ink-50 p-2">
            <p className="mb-1 text-xs font-semibold text-ink-700">
              {toAdd.length} keyword{toAdd.length === 1 ? '' : 's'} will be added
              {duplicateCount > 0 && (
                <span className="font-normal text-ink-400"> · {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'} skipped</span>
              )}
            </p>
            <div className="max-h-40 overflow-y-auto">
              {toAdd.map((k, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-0.5 text-xs">
                  <span className="truncate text-ink-700">{k.text}</span>
                  <span className="shrink-0 rounded-full bg-ink-200 px-2 py-0.5 text-[10px] font-bold text-ink-600">{k.matchType}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-50">Cancel</button>
          <button
            onClick={confirmAdd}
            disabled={toAdd.length === 0}
            className="rounded-md bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-40"
          >
            Add {toAdd.length || ''} keyword{toAdd.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
