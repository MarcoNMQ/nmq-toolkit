'use client';

import { useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { CharCount, Field, TextInput } from '@/components/Field';
import type { GoogleAd } from '@/lib/campaign/types';

export function GoogleAdForm({ campaignId, adId }: { campaignId: string; adId: string }) {
  const campaign = useBuilderStore((s) => s.googleCampaigns.find((c) => c.id === campaignId));
  const ad = campaign?.ads.find((a) => a.id === adId);
  const updateAd = useBuilderStore((s) => s.updateGoogleAd);
  const removeAd = useBuilderStore((s) => s.removeGoogleAd);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!campaign || !ad) return null;
  const safeCampaign = campaign;
  const safeAd = ad;
  const isSearch = campaign.channel === 'Search';

  function patch(p: Partial<GoogleAd>) {
    updateAd(campaignId, adId, p);
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

  async function handleGenerateCopy() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/campaign/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: safeAd.ad_name,
          productCategory: safeCampaign.product_category,
          productPromoted: safeCampaign.product_promoted,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const patchData: Partial<GoogleAd> = {};
      for (let i = 0; i < 15; i++) {
        const key = `headline_${i + 1}` as keyof GoogleAd;
        (patchData as Record<string, string>)[key] = data.headlines?.[i] ?? (safeAd[key] as string);
      }
      // Search ads have no Long Headlines and cap at 4 descriptions.
      const descCount = isSearch ? 4 : 5;
      for (let i = 0; i < descCount; i++) {
        const dKey = `description_${i + 1}` as keyof GoogleAd;
        (patchData as Record<string, string>)[dKey] = data.descriptions?.[i] ?? (safeAd[dKey] as string);
      }
      if (!isSearch) {
        for (let i = 0; i < 5; i++) {
          const lhKey = `long_headline_${i + 1}` as keyof GoogleAd;
          (patchData as Record<string, string>)[lhKey] = data.longHeadlines?.[i] ?? (safeAd[lhKey] as string);
        }
      }
      patch(patchData);
    } catch {
      setError('Copy generation failed — check the Anthropic API key is set.');
    } finally {
      setGenerating(false);
    }
  }

  const headlineValues = Array.from({ length: 15 }, (_, i) => safeAd[`headline_${i + 1}` as keyof GoogleAd] as string);
  const longHeadlineValues = Array.from({ length: 5 }, (_, i) => safeAd[`long_headline_${i + 1}` as keyof GoogleAd] as string);
  const descriptionValues = Array.from({ length: isSearch ? 4 : 5 }, (_, i) => safeAd[`description_${i + 1}` as keyof GoogleAd] as string);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Ad</h2>
        <button
          onClick={() => removeAd(campaignId, adId)}
          className="text-sm text-red-500 hover:underline"
        >
          Delete ad
        </button>
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
        <TextInput value={ad.final_url} onChange={(e) => patch({ final_url: e.target.value })} placeholder="https://example.com/..." />
      </Field>

      {isSearch && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Path 1" tooltip="Appears after your domain in the displayed URL, e.g. example.com/path1/path2. Optional, max 15 characters.">
            <TextInput value={ad.path1 ?? ''} onChange={(e) => patch({ path1: e.target.value })} maxLength={15} placeholder="e.g. predator" />
          </Field>
          <Field label="Path 2">
            <TextInput value={ad.path2 ?? ''} onChange={(e) => patch({ path2: e.target.value })} maxLength={15} placeholder="e.g. rods" />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between rounded-md bg-ink-50 px-3 py-2">
        <span className="text-sm text-ink-500">
          {isSearch ? 'Generate copy from ad name + product info' : 'Generate copy from video title + product info'}
        </span>
        <button
          onClick={handleGenerateCopy}
          disabled={generating || !ad.ad_name}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {generating ? 'Generating…' : '✨ Generate with AI'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <CopyGroup
        title="Headlines"
        max={30}
        note={isSearch ? 'Max 30 characters each. Up to 15. Search ads need at least 3.' : 'Max 30 characters each. Up to 15.'}
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
        note={isSearch ? 'Max 90 characters each. Up to 4. Search ads need at least 2.' : 'Max 90 characters each.'}
        values={descriptionValues}
        onChange={(i, v) => patch({ [`description_${i + 1}`]: v } as Partial<GoogleAd>)}
      />
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

  // Grow on every value change (typing, AI-generated copy, programmatic patch)
  // so a full sentence is always visible instead of clipped to one line.
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
  title, max, note, values, onChange,
}: { title: string; max: number; note?: string; values: string[]; onChange: (i: number, v: string) => void }) {
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
