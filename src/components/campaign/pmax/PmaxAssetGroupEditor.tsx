'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { Field, Select, TextInput } from '@/components/Field';
import type { PmaxAsset, PmaxAssetGroup, PmaxAssetRole, PmaxCampaign } from '@/lib/campaign/pmax/pmaxTypes';

function TextAssetList({
  campaignId, assetGroupId, role, label, assets, placeholder,
}: {
  campaignId: string; assetGroupId: string; role: PmaxAssetRole; label: string;
  assets: PmaxAsset[]; placeholder: string;
}) {
  const addPmaxAsset = useBuilderStore((s) => s.addPmaxAsset);
  const updatePmaxAsset = useBuilderStore((s) => s.updatePmaxAsset);
  const removePmaxAsset = useBuilderStore((s) => s.removePmaxAsset);
  const items = assets.filter((a) => a.role === role);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-600">{label} ({items.length})</span>
        <button
          type="button"
          className="text-xs font-semibold text-brand-600 hover:underline"
          onClick={() => addPmaxAsset(campaignId, { role, text: '' }, { assetGroupId })}
        >
          + Add
        </button>
      </div>
      <div className="space-y-1">
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <TextInput
              value={a.text ?? ''}
              onChange={(e) => updatePmaxAsset(campaignId, a.id, { text: e.target.value })}
              placeholder={placeholder}
              className="flex-1"
            />
            <button type="button" onClick={() => removePmaxAsset(campaignId, a.id)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageAssetList({
  campaignId, assetGroupId, role, label, assets,
}: {
  campaignId: string; assetGroupId: string; role: PmaxAssetRole; label: string; assets: PmaxAsset[];
}) {
  const addPmaxAsset = useBuilderStore((s) => s.addPmaxAsset);
  const removePmaxAsset = useBuilderStore((s) => s.removePmaxAsset);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = assets.filter((a) => a.role === role);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/campaign/pmax/inspect-asset', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not read this file.');
      addPmaxAsset(campaignId, {
        role,
        sourceFilename: data.sourceFilename,
        mimeType: data.mimeType,
        width: data.width,
        height: data.height,
        fileSizeBytes: data.fileSizeBytes,
        checksum: data.checksum,
      }, { assetGroupId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-600">{label} ({items.length})</span>
        <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:underline">
          {uploading ? 'Reading…' : '+ Upload'}
          <input type="file" accept=".jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      </div>
      {error && <p className="mb-1 text-xs text-red-500">{error}</p>}
      <div className="space-y-1">
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-ink-100 px-2 py-1 text-xs">
            <span className="truncate text-ink-700" title={a.sourceFilename}>{a.sourceFilename} — {a.width}×{a.height}</span>
            <button type="button" onClick={() => removePmaxAsset(campaignId, a.id)} className="shrink-0 text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoAssetList({ campaignId, assetGroupId, assets }: { campaignId: string; assetGroupId: string; assets: PmaxAsset[] }) {
  const addPmaxAsset = useBuilderStore((s) => s.addPmaxAsset);
  const updatePmaxAsset = useBuilderStore((s) => s.updatePmaxAsset);
  const removePmaxAsset = useBuilderStore((s) => s.removePmaxAsset);
  const items = assets.filter((a) => a.role === 'youtube_video');

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-600">YouTube videos ({items.length})</span>
        <button
          type="button"
          className="text-xs font-semibold text-brand-600 hover:underline"
          onClick={() => addPmaxAsset(campaignId, { role: 'youtube_video', youtubeVideoId: '', youtubeUrl: '' }, { assetGroupId })}
        >
          + Add
        </button>
      </div>
      <div className="space-y-1">
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <TextInput
              value={a.youtubeVideoId ?? ''}
              onChange={(e) => updatePmaxAsset(campaignId, a.id, { youtubeVideoId: e.target.value })}
              placeholder="11-character video ID, e.g. dQw4w9WgXcQ"
              className="flex-1"
            />
            <button type="button" onClick={() => removePmaxAsset(campaignId, a.id)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalsEditor({ campaignId, assetGroupId, campaign }: { campaignId: string; assetGroupId: string; campaign: PmaxCampaign }) {
  const addPmaxSignal = useBuilderStore((s) => s.addPmaxSignal);
  const updatePmaxSignal = useBuilderStore((s) => s.updatePmaxSignal);
  const removePmaxSignal = useBuilderStore((s) => s.removePmaxSignal);
  const signals = campaign.signals.filter((s) => s.assetGroupId === assetGroupId);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-600">Audience &amp; search theme signals (optional hints, not targeting)</span>
        <div className="flex gap-2">
          <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => addPmaxSignal(campaignId, assetGroupId, { kind: 'search_theme', searchThemeText: '' })}>+ Search theme</button>
          <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => addPmaxSignal(campaignId, assetGroupId, { kind: 'audience', audienceRef: '' })}>+ Audience</button>
        </div>
      </div>
      <div className="space-y-1">
        {signals.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase bg-ink-100 text-ink-500">{s.kind === 'search_theme' ? 'Theme' : 'Audience'}</span>
            <TextInput
              value={s.kind === 'search_theme' ? (s.searchThemeText ?? '') : (s.audienceRef ?? '')}
              onChange={(e) => updatePmaxSignal(campaignId, s.id, s.kind === 'search_theme' ? { searchThemeText: e.target.value } : { audienceRef: e.target.value })}
              placeholder={s.kind === 'search_theme' ? 'e.g. predator fishing rods' : 'Resolved audience name'}
              className="flex-1"
            />
            <button type="button" onClick={() => removePmaxSignal(campaignId, s.id)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PmaxAssetGroupEditor({ campaign, group }: { campaign: PmaxCampaign; group: PmaxAssetGroup }) {
  const updatePmaxAssetGroup = useBuilderStore((s) => s.updatePmaxAssetGroup);
  const removePmaxAssetGroup = useBuilderStore((s) => s.removePmaxAssetGroup);
  const linkedIds = new Set(campaign.assetGroupAssetLinks.filter((l) => l.assetGroupId === group.id).map((l) => l.assetId));
  const linkedAssets = campaign.assets.filter((a) => linkedIds.has(a.id));

  function patch(p: Partial<PmaxAssetGroup>) {
    updatePmaxAssetGroup(campaign.id, group.id, p);
  }

  return (
    <div className="space-y-4 rounded-lg border border-ink-200 p-4">
      <div className="flex items-center justify-between">
        <TextInput
          value={group.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Asset group name (1–128 characters, unique in this campaign)"
          className="flex-1 font-semibold"
        />
        <button type="button" onClick={() => removePmaxAssetGroup(campaign.id, group.id)} className="ml-2 shrink-0 text-xs text-red-500 hover:underline">Delete asset group</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Final URL">
          <TextInput value={group.finalUrl} onChange={(e) => patch({ finalUrl: e.target.value })} placeholder="https://example.com/..." />
        </Field>
        <Field label="Final mobile URL (optional)">
          <TextInput value={group.finalMobileUrl ?? ''} onChange={(e) => patch({ finalMobileUrl: e.target.value })} />
        </Field>
        <Field label="Path 1">
          <TextInput value={group.path1} onChange={(e) => patch({ path1: e.target.value })} maxLength={15} />
        </Field>
        <Field label="Path 2">
          <TextInput value={group.path2} onChange={(e) => patch({ path2: e.target.value })} maxLength={15} disabled={!group.path1} />
        </Field>
        <Field label="Tracking template (optional)">
          <TextInput value={group.trackingTemplate ?? ''} onChange={(e) => patch({ trackingTemplate: e.target.value })} />
        </Field>
        <Field label="Final URL suffix (optional)">
          <TextInput value={group.finalUrlSuffix ?? ''} onChange={(e) => patch({ finalUrlSuffix: e.target.value })} />
        </Field>
        <Field label="Custom parameter (optional)">
          <TextInput value={group.customParameter ?? ''} onChange={(e) => patch({ customParameter: e.target.value })} placeholder="{_key}=value" />
        </Field>
        <Field label="Call to action" tooltip="Exact Editor CTA tokens aren't verified yet — kept as 'Automated' until they are.">
          <Select value={group.cta} onChange={(e) => patch({ cta: e.target.value })}>
            <option value="Automated">Automated (recommended)</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-ink-100 pt-3 sm:grid-cols-2">
        <TextAssetList campaignId={campaign.id} assetGroupId={group.id} role="headline" label="Headlines (3–15, max 30 chars)" assets={linkedAssets} placeholder="e.g. Explore Shimano Rods" />
        <TextAssetList campaignId={campaign.id} assetGroupId={group.id} role="long_headline" label="Long headlines (1–5, max 90 chars)" assets={linkedAssets} placeholder="e.g. Find Your Next Fishing Rod Today" />
        <TextAssetList campaignId={campaign.id} assetGroupId={group.id} role="description" label="Descriptions (2–5, max 90 chars, one ≤60)" assets={linkedAssets} placeholder="e.g. Discover rods designed for reliable performance." />
        {!campaign.brandGuidelines.enabled && (
          <TextAssetList campaignId={campaign.id} assetGroupId={group.id} role="business_name" label="Business name (max 25 chars — brand guidelines off)" assets={linkedAssets} placeholder="e.g. Shimano" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-ink-100 pt-3 sm:grid-cols-2">
        <ImageAssetList campaignId={campaign.id} assetGroupId={group.id} role="marketing_image_landscape" label="Landscape images (1–20, 1.91:1)" assets={linkedAssets} />
        <ImageAssetList campaignId={campaign.id} assetGroupId={group.id} role="marketing_image_square" label="Square images (1–20, 1:1)" assets={linkedAssets} />
        <ImageAssetList campaignId={campaign.id} assetGroupId={group.id} role="marketing_image_portrait" label="Portrait images (optional, up to 20, 4:5)" assets={linkedAssets} />
        {!campaign.brandGuidelines.enabled && (
          <>
            <ImageAssetList campaignId={campaign.id} assetGroupId={group.id} role="logo_square" label="Square logo (1:1 — brand guidelines off)" assets={linkedAssets} />
            <ImageAssetList campaignId={campaign.id} assetGroupId={group.id} role="logo_landscape" label="Landscape logo (optional, 4:1 — brand guidelines off)" assets={linkedAssets} />
          </>
        )}
      </div>

      <div className="border-t border-ink-100 pt-3">
        <VideoAssetList campaignId={campaign.id} assetGroupId={group.id} assets={linkedAssets} />
      </div>

      <div className="border-t border-ink-100 pt-3">
        <SignalsEditor campaignId={campaign.id} assetGroupId={group.id} campaign={campaign} />
      </div>
    </div>
  );
}
