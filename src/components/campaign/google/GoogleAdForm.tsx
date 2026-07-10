'use client';

import { useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { CharCount, Field, TextInput } from '@/components/Field';
import { COUNTRY_LANGUAGE_MAP } from '@/lib/campaign/constants';
import type { GoogleAd } from '@/lib/campaign/types';

function truncate(s: string, max = 40): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

interface CopyResult {
  headlines: string[];
  longHeadlines: string[];
  descriptions: string[];
}

export function GoogleAdForm({ campaignId, adId }: { campaignId: string; adId: string }) {
  const allCampaigns = useBuilderStore((s) => s.googleCampaigns);
  const campaign = allCampaigns.find((c) => c.id === campaignId);
  const ad = campaign?.ads.find((a) => a.id === adId);
  const updateAd = useBuilderStore((s) => s.updateGoogleAd);
  const removeAd = useBuilderStore((s) => s.removeGoogleAd);
  const moveAd = useBuilderStore((s) => s.moveGoogleAd);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [langResults, setLangResults] = useState<Record<string, CopyResult>>({});
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!showMoveMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  if (!campaign || !ad) return null;
  const safeCampaign = campaign;
  const safeAd = ad;
  const isSearch = campaign.channel === 'Search';

  // Derive unique languages from the campaign's country list
  const availableLanguages = (() => {
    const langs = new Set<string>();
    for (const code of safeCampaign.countries ?? []) {
      for (const lang of COUNTRY_LANGUAGE_MAP[code] ?? []) {
        langs.add(lang);
      }
    }
    if (langs.size === 0) langs.add('English');
    return Array.from(langs).sort();
  })();

  function patch(p: Partial<GoogleAd>) {
    updateAd(campaignId, adId, p);
  }

  function handleMove(toCampaignId: string) {
    moveAd(campaignId, adId, toCampaignId);
    setSelected({ type: 'ad', campaignId: toCampaignId, adId });
    setShowMoveMenu(false);
  }

  const otherCampaigns = allCampaigns.filter((c) => c.id !== campaignId);

  async function handleDownload() {
    setDownloading(true);
    try {
      const headlines     = Array.from({ length: 15 }, (_, i) => (safeAd[`headline_${i + 1}` as keyof GoogleAd] as string) ?? '');
      const longHeadlines = Array.from({ length: 5  }, (_, i) => (safeAd[`long_headline_${i + 1}` as keyof GoogleAd] as string) ?? '');
      const descriptions  = Array.from({ length: isSearch ? 4 : 5 }, (_, i) => (safeAd[`description_${i + 1}` as keyof GoogleAd] as string) ?? '');
      const res = await fetch('/api/campaign/export-ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adName: safeAd.ad_name, headlines, longHeadlines, descriptions, isSearch }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${(safeAd.ad_name || 'ad-copy').replace(/[^\w-]/g, '_').slice(0, 50)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // non-fatal — user will notice the download didn't happen
    } finally {
      setDownloading(false);
    }
  }

  function toggleLang(lang: string) {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  function openModal() {
    setSelectedLangs([...availableLanguages]);
    setLangResults({});
    setError(null);
    setShowModal(true);
  }

  async function handleVideoUrlBlur(url: string) {
    const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    const videoId = match ? match[1] : url.trim();
    if (!videoId) return;
    patch({ video_id: videoId });
    setFetchingTitle(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaign/youtube-title?id=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !safeAd.ad_name) patch({ ad_name: data.title });
      }
    } catch {
      // non-fatal — title fetch is a convenience, not required
    } finally {
      setFetchingTitle(false);
    }
  }

  async function handleGenerate() {
    if (!selectedLangs.length) return;
    setGenerating(true);
    setError(null);
    setLangResults({});
    try {
      const results = await Promise.all(
        selectedLangs.map(async (lang) => {
          const res = await fetch('/api/campaign/generate-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoTitle: safeAd.ad_name,
              productCategory: safeCampaign.product_category,
              productPromoted: safeCampaign.product_promoted,
              language: lang,
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          return { lang, data: (await res.json()) as CopyResult };
        }),
      );
      const map: Record<string, CopyResult> = {};
      for (const { lang, data } of results) map[lang] = data;
      setLangResults(map);
    } catch {
      setError('Copy generation failed — check the Anthropic API key is set.');
    } finally {
      setGenerating(false);
    }
  }

  function applyCopy(lang: string) {
    const data = langResults[lang];
    if (!data) return;
    const patchData: Partial<GoogleAd> = {};
    for (let i = 0; i < 15; i++) {
      (patchData as Record<string, string>)[`headline_${i + 1}`] = data.headlines?.[i] ?? '';
    }
    const descCount = isSearch ? 4 : 5;
    for (let i = 0; i < descCount; i++) {
      (patchData as Record<string, string>)[`description_${i + 1}`] = data.descriptions?.[i] ?? '';
    }
    if (!isSearch) {
      for (let i = 0; i < 5; i++) {
        (patchData as Record<string, string>)[`long_headline_${i + 1}`] = data.longHeadlines?.[i] ?? '';
      }
    }
    patch(patchData);
    setShowModal(false);
  }

  const hasResults = Object.keys(langResults).length > 0;
  const colCount = selectedLangs.length;
  const modalMaxW = colCount <= 1 ? 'max-w-lg' : colCount === 2 ? 'max-w-3xl' : 'max-w-5xl';

  const headlineValues = Array.from(
    { length: 15 },
    (_, i) => safeAd[`headline_${i + 1}` as keyof GoogleAd] as string,
  );
  const longHeadlineValues = Array.from(
    { length: 5 },
    (_, i) => safeAd[`long_headline_${i + 1}` as keyof GoogleAd] as string,
  );
  const descriptionValues = Array.from(
    { length: isSearch ? 4 : 5 },
    (_, i) => safeAd[`description_${i + 1}` as keyof GoogleAd] as string,
  );

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Ad</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-sm text-ink-500 hover:text-ink-800 disabled:opacity-40"
              title="Download ad copy as Excel"
            >
              {downloading ? 'Downloading…' : '⬇ Download'}
            </button>
            {otherCampaigns.length > 0 && (
              <div className="relative" ref={moveMenuRef}>
                <button
                  onClick={() => setShowMoveMenu((v) => !v)}
                  className="text-sm text-ink-500 hover:text-ink-800"
                >
                  Move to…
                </button>
                {showMoveMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-ink-200 bg-white shadow-lg overflow-hidden">
                    <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400 border-b border-ink-100">
                      Move ad to campaign
                    </p>
                    <ul className="max-h-60 overflow-y-auto">
                      {otherCampaigns.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => handleMove(c.id)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-ink-50"
                          >
                            <span className="text-ink-800 leading-tight">
                              {truncate(c.campaign_name || '(unnamed campaign)')}
                            </span>
                            <span className="shrink-0 text-xs text-ink-400">
                              {c.ads.length} ad{c.ads.length !== 1 ? 's' : ''}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => removeAd(campaignId, adId)}
              className="text-sm text-red-500 hover:underline"
            >
              Delete ad
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ad name">
            <TextInput value={ad.ad_name} onChange={(e) => patch({ ad_name: e.target.value })} />
          </Field>
          {!isSearch && (
            <Field
              label="YouTube URL or Video ID"
              hint={fetchingTitle ? 'Fetching title…' : undefined}
              tooltip="Paste any YouTube link — the video ID is extracted automatically and the real video title is fetched for you."
            >
              <TextInput
                defaultValue={ad.video_id}
                onBlur={(e) => handleVideoUrlBlur(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </Field>
          )}
        </div>

        <Field label="Final URL">
          <TextInput
            value={ad.final_url}
            onChange={(e) => patch({ final_url: e.target.value })}
            placeholder="https://example.com/..."
          />
        </Field>

        {isSearch && (
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Path 1"
              tooltip="Appears after your domain in the displayed URL, e.g. example.com/path1/path2. Optional, max 15 characters."
            >
              <TextInput
                value={ad.path1 ?? ''}
                onChange={(e) => patch({ path1: e.target.value })}
                maxLength={15}
                placeholder="e.g. predator"
              />
            </Field>
            <Field label="Path 2">
              <TextInput
                value={ad.path2 ?? ''}
                onChange={(e) => patch({ path2: e.target.value })}
                maxLength={15}
                placeholder="e.g. rods"
              />
            </Field>
          </div>
        )}

        <div className="flex items-center justify-between rounded-md bg-ink-50 px-3 py-2">
          <span className="text-sm text-ink-500">
            {isSearch
              ? 'Generate copy from ad name + product info'
              : 'Generate copy from video title + product info'}
          </span>
          <button
            onClick={openModal}
            disabled={!ad.ad_name}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            ✨ Generate with AI
          </button>
        </div>
        {error && !showModal && <p className="text-sm text-red-500">{error}</p>}

        <CopyGroup
          title="Headlines"
          max={30}
          note={
            isSearch
              ? 'Max 30 characters each. Up to 15. Search ads need at least 3.'
              : 'Max 30 characters each. Up to 15.'
          }
          values={headlineValues}
          onChange={(i, v) => patch({ [`headline_${i + 1}`]: v } as Partial<GoogleAd>)}
        />
        {!isSearch && (
          <CopyGroup
            title="Long headlines"
            max={90}
            note="Max 90 characters each. At least one is required to pass validation."
            values={longHeadlineValues}
            onChange={(i, v) => patch({ [`long_headline_${i + 1}`]: v } as Partial<GoogleAd>)}
          />
        )}
        <CopyGroup
          title="Descriptions"
          max={90}
          note={
            isSearch
              ? 'Max 90 characters each. Up to 4. Search ads need at least 2.'
              : 'Max 90 characters each.'
          }
          values={descriptionValues}
          onChange={(i, v) => patch({ [`description_${i + 1}`]: v } as Partial<GoogleAd>)}
        />
      </div>

      {/* Language picker + results modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className={`relative w-full ${modalMaxW} rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4 shrink-0">
              <h2 className="text-lg font-bold text-ink-900">
                {hasResults ? 'Generated copy — pick a language' : 'Generate copy in...'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-xl leading-none text-ink-400 hover:text-ink-700"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {!hasResults ? (
                // Phase 1 — language selection
                <>
                  <p className="mb-4 text-sm text-ink-500">
                    {availableLanguages.length === 1
                      ? 'One language available from the campaign countries. Click Generate to proceed.'
                      : 'Languages come from the campaign countries. Select one or more — results appear side by side so you can compare and pick.'}
                  </p>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {availableLanguages.map((lang) => {
                      const active = selectedLangs.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => toggleLang(lang)}
                          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                            active
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400'
                          }`}
                        >
                          {active ? '✓ ' : ''}{lang}
                        </button>
                      );
                    })}
                  </div>
                  {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
                  <button
                    onClick={handleGenerate}
                    disabled={generating || selectedLangs.length === 0}
                    className="rounded-md bg-brand-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {generating
                      ? `Generating in ${selectedLangs.length > 1 ? `${selectedLangs.length} languages` : selectedLangs[0]}…`
                      : `✨ Generate${selectedLangs.length > 1 ? ` in ${selectedLangs.length} languages` : ''}`}
                  </button>
                </>
              ) : (
                // Phase 2 — results side by side
                <>
                  <div
                    className={`grid gap-4 ${
                      colCount === 1 ? 'grid-cols-1' : colCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}
                  >
                    {selectedLangs
                      .filter((l) => langResults[l])
                      .map((lang) => {
                        const r = langResults[lang];
                        return (
                          <div key={lang} className="overflow-hidden rounded-xl border border-ink-200">
                            {/* Column header */}
                            <div className="flex items-center justify-between bg-ink-50 px-4 py-3">
                              <span className="text-sm font-bold text-ink-900">{lang}</span>
                              <button
                                onClick={() => applyCopy(lang)}
                                className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600"
                              >
                                Use this →
                              </button>
                            </div>
                            {/* Copy content */}
                            <div className="space-y-4 p-4">
                              <CopyPreviewSection
                                label="Headlines"
                                items={r.headlines}
                                charMax={30}
                              />
                              {!isSearch && (
                                <CopyPreviewSection
                                  label="Long headlines"
                                  items={r.longHeadlines}
                                  charMax={90}
                                />
                              )}
                              <CopyPreviewSection
                                label="Descriptions"
                                items={r.descriptions}
                                charMax={90}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-5">
                    <button
                      onClick={() => setLangResults({})}
                      className="rounded-md border border-ink-200 px-4 py-1.5 text-sm text-ink-600 hover:bg-ink-50"
                    >
                      ← Regenerate
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CopyPreviewSection({
  label,
  items,
  charMax,
}: {
  label: string;
  items: string[];
  charMax: number;
}) {
  const filled = items.filter((s) => s);
  if (!filled.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <ul className="space-y-1">
        {filled.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-2 border-b border-ink-50 pb-1 text-xs">
            <span className="text-ink-700">
              <span className="mr-1 text-ink-300">{i + 1}.</span>
              {item}
            </span>
            <span className={`shrink-0 text-[10px] ${item.length > charMax ? 'text-red-400' : 'text-ink-300'}`}>
              {item.length}/{charMax}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CopyField({ value, max, onChange }: { value: string; max: number; onChange: (v: string) => void }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    autoGrow(textareaRef.current);
  }, [value]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can be blocked in some contexts — fail silently
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          className="w-full resize-none overflow-hidden rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          style={{ overflowWrap: 'break-word' }}
        />
        <CharCount value={value} max={max} />
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!value}
        title="Copy to clipboard"
        className="mt-0.5 rounded-md border border-ink-200 px-2 py-2 text-xs font-medium text-ink-500 hover:bg-ink-50 disabled:opacity-30"
      >
        {copied ? '✓' : '📋'}
      </button>
    </div>
  );
}

function CopyGroup({
  title,
  max,
  note,
  values,
  onChange,
}: {
  title: string;
  max: number;
  note?: string;
  values: string[];
  onChange: (i: number, v: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-ink-600">{title}</h3>
      {note && <p className="mb-2 text-xs text-ink-400">{note}</p>}
      <div className="space-y-2">
        {values.map((v, i) => (
          <CopyField key={i} value={v} max={max} onChange={(val) => onChange(i, val)} />
        ))}
      </div>
    </div>
  );
}
