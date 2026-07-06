'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { mapBriefingRowToFbCampaign, mapBriefingRowToGoogleCampaign } from '@/lib/campaign/briefingMap';
import {
  BRIEFING_FIELDS, DEFAULT_CHANNEL_CODES, buildRowsFromMap, splitAssetLinks, type BriefingRow, type ColumnMap,
} from '@/lib/campaign/briefing';
import { qcBriefingRows, type RowQcResult } from '@/lib/campaign/briefingQc';
import { FB_CTAS } from '@/lib/campaign/fbConstants';
import type { Platform } from '@/lib/campaign/types';
import { TextInput } from '@/components/Field';

// Best-effort mapping of non-URL CTA text (e.g. "Watch & Subscribe") to a real
// Google Ads CTA option — used when the sheet's CTA column holds label text
// rather than a URL. No mapping → '' (caller decides whether to apply).
function guessCta(text: string): string {
  const lower = (text ?? '').toLowerCase();
  if (lower.includes('subscribe')) return 'Subscribe';
  if (lower.includes('watch')) return 'Watch now';
  if (lower.includes('learn')) return 'Learn more';
  if (lower.includes('shop')) return 'Shop now';
  if (lower.includes('sign up')) return 'Sign up';
  return '';
}

export function BriefingImportPanel({ platform, onDone }: { platform: Platform; onDone: (lastCampaignId: string) => void }) {
  const updateGoogleCampaign = useBuilderStore((s) => s.updateGoogleCampaign);
  const addGoogleCampaign = useBuilderStore((s) => s.addGoogleCampaign);
  const addGoogleAd = useBuilderStore((s) => s.addGoogleAd);
  const updateGoogleAd = useBuilderStore((s) => s.updateGoogleAd);
  const updateFbCampaign = useBuilderStore((s) => s.updateFbCampaign);
  const addFbCampaign = useBuilderStore((s) => s.addFbCampaign);
  const addFbAd = useBuilderStore((s) => s.addFbAd);
  const updateFbAd = useBuilderStore((s) => s.updateFbAd);

  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [tabs, setTabs] = useState<[string, string][]>([]);
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [rows, setRows] = useState<BriefingRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);

  // QC state — computed once after rows are fetched, cleared on each new fetch
  const [qcResults, setQcResults] = useState<RowQcResult[]>([]);
  const [qcExpanded, setQcExpanded] = useState<Set<number>>(new Set());

  // Raw column data kept around so the user can manually remap columns if
  // auto-detection doesn't match the sheet (e.g. a non-Shimano briefing).
  const [headers, setHeaders] = useState<string[]>([]);
  const [dicts, setDicts] = useState<Record<string, string>[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualMap, setManualMap] = useState<ColumnMap>({});
  const [skipChannelFilter, setSkipChannelFilter] = useState(false);

  // Set rows + run QC in one step, resetting related UI state
  function applyRows(newRows: BriefingRow[]) {
    setRows(newRows);
    setSelectedIdxs(new Set());
    setQcResults(qcBriefingRows(newRows));
    setQcExpanded(new Set());
  }

  function toggleQcRow(i: number) {
    setQcExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function handleUrlBlur() {
    if (!url) return;
    try {
      const res = await fetch(`/api/campaign/briefing/tabs?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setTabs(data.tabs ?? []);
    } catch {
      setTabs([]);
    }
  }

  async function fetchTab() {
    setLoading('fetch');
    setError(null);
    try {
      const res = await fetch('/api/campaign/briefing/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, gid: selectedGid, channel: platform }),
      });
      const data = await res.json();
      setHeaders(data.headers ?? []);
      setDicts(data.dicts ?? []);
      setManualMap(data.columnMap ?? {});
      setManualMode(false);
      if (data.error) setError(data.error);
      else if (!data.rows?.length) {
        setError('No matching rows found on this tab.');
        setDebug(data.debug);
      } else {
        applyRows(data.rows);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function searchAllTabs() {
    setLoading('all');
    setError(null);
    try {
      const res = await fetch('/api/campaign/briefing/fetch-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, channel: platform }),
      });
      const data = await res.json();
      setHeaders(data.headers ?? []);
      setDicts(data.dicts ?? []);
      setManualMap(data.columnMap ?? {});
      setManualMode(false);
      if (data.error) setError(data.error);
      else if (!data.rows?.length) {
        setError('No matching rows found across all tabs.');
        setDebug(data.debug);
      } else {
        applyRows(data.rows);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleFile(file: File) {
    setLoading('file');
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('channel', platform);
      const res = await fetch('/api/campaign/briefing/parse-file', { method: 'POST', body: form });
      const data = await res.json();
      setHeaders(data.headers ?? []);
      setDicts(data.dicts ?? []);
      setManualMap(data.columnMap ?? {});
      setManualMode(false);
      if (data.error) setError(data.error);
      else if (!data.rows?.length) {
        setError('No matching rows found in this file.');
        setDebug(data.debug);
      } else {
        applyRows(data.rows);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  function applyManualMapping() {
    const channelCodes = skipChannelFilter ? null : new Set(DEFAULT_CHANNEL_CODES[platform] ?? DEFAULT_CHANNEL_CODES.facebook);
    const { rows: newRows, debug: newDebug } = buildRowsFromMap(dicts, manualMap, channelCodes);
    applyRows(newRows);
    setDebug(newDebug);
    setError(newRows.length === 0 ? 'No rows matched this mapping — check the channel filter or column choices.' : null);
  }

  function toggleRow(i: number) {
    setSelectedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const filteredIdxs = rows
    .map((_, i) => i)
    .filter((i) => {
      if (!search.trim()) return true;
      const r = rows[i];
      const haystack = [
        r.adset_name, r.campaign_name, r.creative_name, r.month, r.budget,
        r.market_code, r.country_code, r.category, r.subcategory, r.product,
      ].join(' ').toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

  async function handleImport() {
    setImporting(true);
    setUrlWarning(null);
    let lastId = '';
    let invalidUrlCount = 0;
    try {
      for (const idx of selectedIdxs) {
        const r = rows[idx];
        if (platform === 'google') {
          const id = addGoogleCampaign();
          updateGoogleCampaign(id, mapBriefingRowToGoogleCampaign(r));
          lastId = id;

          if (r.asset_link) {
            // Multiple YouTube links in one cell = multiple ad variants under
            // the same campaign — same pattern as Facebook ad diversification.
            // splitAssetLinks splits on newlines/commas, keeps only https:// URLs.
            const assetLinks = splitAssetLinks(r.asset_link);
            const linksToProcess = assetLinks.length > 0 ? assetLinks : [r.asset_link.trim()].filter(Boolean);
            const isValidUrl = /^https?:\/\//i.test(r.final_url ?? '');
            if (!isValidUrl && linksToProcess.length > 0) invalidUrlCount++;
            const guessedCta = !isValidUrl ? guessCta(r.final_url) : '';

            for (const link of linksToProcess) {
              const match = link.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
              const videoId = match ? match[1] : '';
              if (!videoId) continue;

              const adId = addGoogleAd(id);
              let title = '';
              try {
                const tRes = await fetch(`/api/campaign/youtube-title?id=${encodeURIComponent(videoId)}`);
                if (tRes.ok) title = (await tRes.json()).title ?? '';
              } catch {
                // title fetch is best-effort
              }
              updateGoogleAd(id, adId, {
                ad_name: title || r.creative_name || videoId,
                video_id: videoId,
                final_url: isValidUrl ? r.final_url : '',
                ...(guessedCta ? { cta: guessedCta } : {}),
              });
              if (title) {
                try {
                  const cRes = await fetch('/api/campaign/generate-copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      videoTitle: title,
                      productCategory: r.category,
                      productPromoted: r.product,
                    }),
                  });
                  if (cRes.ok) {
                    const copy = await cRes.json();
                    updateGoogleAd(id, adId, {
                      headline_1: copy.headlines?.[0] ?? '', headline_2: copy.headlines?.[1] ?? '',
                      headline_3: copy.headlines?.[2] ?? '', headline_4: copy.headlines?.[3] ?? '',
                      headline_5: copy.headlines?.[4] ?? '', headline_6: copy.headlines?.[5] ?? '',
                      headline_7: copy.headlines?.[6] ?? '', headline_8: copy.headlines?.[7] ?? '',
                      headline_9: copy.headlines?.[8] ?? '', headline_10: copy.headlines?.[9] ?? '',
                      headline_11: copy.headlines?.[10] ?? '', headline_12: copy.headlines?.[11] ?? '',
                      headline_13: copy.headlines?.[12] ?? '', headline_14: copy.headlines?.[13] ?? '',
                      headline_15: copy.headlines?.[14] ?? '',
                      long_headline_1: copy.longHeadlines?.[0] ?? '', long_headline_2: copy.longHeadlines?.[1] ?? '',
                      long_headline_3: copy.longHeadlines?.[2] ?? '', long_headline_4: copy.longHeadlines?.[3] ?? '',
                      long_headline_5: copy.longHeadlines?.[4] ?? '',
                      description_1: copy.descriptions?.[0] ?? '', description_2: copy.descriptions?.[1] ?? '',
                      description_3: copy.descriptions?.[2] ?? '', description_4: copy.descriptions?.[3] ?? '',
                      description_5: copy.descriptions?.[4] ?? '',
                    });
                  }
                } catch {
                  // AI copy generation is best-effort during bulk import
                }
              }
            }
          }
        } else {
          const id = addFbCampaign();
          updateFbCampaign(id, mapBriefingRowToFbCampaign(r));
          lastId = id;

          // Multiple Asset Links in one row = multiple separate ads under
          // the same ad set ("ad diversification" in Shimano's briefing
          // convention) — one ad per link, not one ad per row.
          const links = splitAssetLinks(r.asset_link);
          links.forEach((link, i) => {
            const adId = addFbAd(id);
            updateFbAd(id, adId, {
              ad_name: r.creative_name || `Ad ${i + 1}`,
              link: r.final_url,
              url_tags: link,
              cta: FB_CTAS[0],
            });
          });
        }
      }
    } finally {
      setImporting(false);
      setSelectedIdxs(new Set());
      setQcExpanded(new Set());
    }
    if (invalidUrlCount > 0) {
      setUrlWarning(`${invalidUrlCount} ad(s) imported with a missing or invalid Final URL — check the CTA column in the briefing sheet.`);
    }
    if (lastId) onDone(lastId);
  }

  const qcWarningRowCount = qcResults.filter((r) => r.flags.length > 0).length;

  return (
    <div className="rounded-md border border-ink-200 bg-ink-50 p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900">📥 Import from Briefing Sheet</h3>

      <div className="mb-3 flex rounded-md bg-ink-100 p-1 text-sm font-medium w-fit">
        <button className={`rounded-md px-3 py-1 ${mode === 'url' ? 'bg-white text-ink-900 shadow' : 'text-ink-500'}`} onClick={() => setMode('url')}>
          🔗 Google Sheet URL
        </button>
        <button className={`rounded-md px-3 py-1 ${mode === 'file' ? 'bg-white text-ink-900 shadow' : 'text-ink-500'}`} onClick={() => setMode('file')}>
          📁 Upload Excel / CSV
        </button>
      </div>

      {mode === 'url' ? (
        <div className="space-y-2">
          <TextInput
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            className="w-full"
          />
          {tabs.length > 0 && (
            <select
              className="w-full rounded-md border border-ink-300 px-2.5 py-1.5 text-sm"
              value={selectedGid ?? ''}
              onChange={(e) => setSelectedGid(e.target.value)}
            >
              {tabs.map(([gid, title]) => (
                <option key={gid} value={gid}>{title} (gid={gid})</option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={fetchTab}
              disabled={!url || loading !== null}
              className="flex-1 rounded-md bg-brand-500 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading === 'fetch' ? 'Fetching…' : 'Fetch this tab'}
            </button>
            <button
              onClick={searchAllTabs}
              disabled={!url || loading !== null}
              className="flex-1 rounded-md bg-ink-700 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading === 'all' ? 'Scanning…' : '🔍 Search all tabs'}
            </button>
          </div>
        </div>
      ) : (
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm"
        />
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {debug && <p className="mt-1 text-xs text-ink-400">{debug}</p>}

      {headers.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setManualMode((v) => !v)}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            {manualMode ? 'Hide column mapping' : "Columns don't look right? Map them manually"}
          </button>

          {manualMode && (
            <div className="mt-2 space-y-2 rounded-md border border-ink-200 bg-white p-3">
              <p className="text-xs text-ink-500">
                Match each field below to a column from your sheet. Leave as &ldquo;(none)&rdquo; to skip a field.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BRIEFING_FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-0.5 text-xs">
                    <span className="font-semibold text-ink-700">{f.label}</span>
                    <select
                      className="rounded-md border border-ink-200 px-2 py-1 text-xs"
                      value={manualMap[f.key] ?? ''}
                      onChange={(e) => setManualMap((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                    >
                      <option value="">(none)</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input type="checkbox" checked={skipChannelFilter} onChange={(e) => setSkipChannelFilter(e.target.checked)} />
                This sheet has no channel column — import all rows for this platform
              </label>
              <button
                type="button"
                onClick={applyManualMapping}
                className="w-full rounded-md bg-ink-900 py-1.5 text-xs font-bold text-white"
              >
                Apply mapping
              </button>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-brand-600">{rows.length} row(s) found — select the ones to import.</p>

          {/* QC summary line */}
          {qcWarningRowCount > 0 && (
            <p className="mb-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
              ⚠ {qcWarningRowCount} of {rows.length} row{rows.length !== 1 ? 's' : ''} have data issues — click the badge on each row to see details. You can still import; use your judgement on which flags matter.
            </p>
          )}

          <TextInput
            placeholder="Search rows (e.g. JUN, market code, product...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 w-full"
          />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ink-500">{selectedIdxs.size} selected</span>
            <button
              type="button"
              onClick={() => {
                const allFilteredSelected = filteredIdxs.length > 0 && filteredIdxs.every((i) => selectedIdxs.has(i));
                setSelectedIdxs((prev) => {
                  const next = new Set(prev);
                  if (allFilteredSelected) {
                    filteredIdxs.forEach((i) => next.delete(i));
                  } else {
                    filteredIdxs.forEach((i) => next.add(i));
                  }
                  return next;
                });
              }}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              {filteredIdxs.length > 0 && filteredIdxs.every((i) => selectedIdxs.has(i)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-ink-200 bg-white">
            {filteredIdxs.length === 0 && (
              <p className="px-3 py-2 text-sm text-ink-400">No rows match &ldquo;{search}&rdquo;.</p>
            )}
            {filteredIdxs.map((i) => {
              const r = rows[i];
              const flags = qcResults[i]?.flags ?? [];
              const isQcOpen = qcExpanded.has(i);
              return (
                <div key={i} className="border-b border-ink-100 last:border-0">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={selectedIdxs.has(i)} onChange={() => toggleRow(i)} />
                      <span className="min-w-0 flex-1 truncate">
                        {r.adset_name || r.campaign_name || `Row ${i + 1}`} · {r.month} · {r.budget}
                      </span>
                    </label>
                    {flags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleQcRow(i)}
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold transition ${isQcOpen ? 'bg-amber-200 text-amber-900' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        title="Click to see data issues for this row"
                      >
                        ⚠ {flags.length}
                      </button>
                    )}
                  </div>
                  {isQcOpen && flags.length > 0 && (
                    <div className="mx-3 mb-2 space-y-1 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                      {flags.map((f, fi) => (
                        <p key={fi}>
                          <span className="font-semibold">{f.field}:</span> {f.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleImport}
            disabled={selectedIdxs.size === 0 || importing}
            className="mt-3 w-full rounded-md bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {importing ? 'Importing…' : `＋ Import ${selectedIdxs.size} campaign(s)`}
          </button>
          {urlWarning && <p className="mt-2 text-xs text-amber-600">{urlWarning}</p>}
        </div>
      )}
    </div>
  );
}
