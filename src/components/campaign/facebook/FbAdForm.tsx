'use client';

import { useBuilderStore } from '@/lib/campaign/store';
import { FB_CREATIVE_TYPES, FB_CTAS, FB_STATUSES } from '@/lib/campaign/fbConstants';
import { CharCount, Field, Select, TextArea, TextInput } from '@/components/Field';
import type { FbAd } from '@/lib/campaign/types';

export function FbAdForm({ campaignId, adId }: { campaignId: string; adId: string }) {
  const campaign = useBuilderStore((s) => s.fbCampaigns.find((c) => c.id === campaignId));
  const ad = campaign?.ads.find((a) => a.id === adId);
  const updateAd = useBuilderStore((s) => s.updateFbAd);
  const removeAd = useBuilderStore((s) => s.removeFbAd);

  if (!campaign || !ad) return null;

  function patch(p: Partial<FbAd>) {
    updateAd(campaignId, adId, p);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Ad</h2>
        <button onClick={() => removeAd(campaignId, adId)} className="text-sm text-red-500 hover:underline">
          Delete ad
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Ad name">
          <TextInput value={ad.ad_name} onChange={(e) => patch({ ad_name: e.target.value })} />
        </Field>
        <Field label="Ad status">
          <Select value={ad.ad_status} onChange={(e) => patch({ ad_status: e.target.value })}>
            {FB_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Destination URL">
        <TextInput value={ad.link} onChange={(e) => patch({ link: e.target.value })} placeholder="https://shimanofishing.com/..." />
      </Field>

      <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 space-y-3">
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-ink-500">Image asset</p>
          <p className="text-[11px] text-ink-400">Fill one of the two fields below. Use <strong>Image Hash</strong> when the image already exists in Business Manager — Facebook strips original file names so the hash is the only reliable reference.</p>
        </div>
        <Field label="Image Hash" hint="Find this in Business Manager → Creative Hub or Ad Library → image details">
          <TextInput value={ad.image_hash ?? ''} onChange={(e) => patch({ image_hash: e.target.value })} placeholder="e.g. a1b2c3d4e5f6..." />
        </Field>
        <Field label="Image File Name" hint="Only works when uploading a brand-new image alongside this template">
          <TextInput value={ad.image_file_name} onChange={(e) => patch({ image_file_name: e.target.value })} placeholder="e.g. product_banner.jpg" />
        </Field>
      </div>

      <div className="flex flex-col gap-1">
        <Field label="Title">
          <TextInput value={ad.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <CharCount value={ad.title} max={25} />
      </div>

      <div className="flex flex-col gap-1">
        <Field label="Body (primary text)">
          <TextArea rows={4} value={ad.body} onChange={(e) => patch({ body: e.target.value })} />
        </Field>
        <CharCount value={ad.body} max={500} />
      </div>

      <Field label="Link description">
        <TextInput value={ad.link_description} onChange={(e) => patch({ link_description: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Display link">
          <TextInput value={ad.display_link} onChange={(e) => patch({ display_link: e.target.value })} />
        </Field>
        <Field label="Creative type">
          <Select value={ad.creative_type} onChange={(e) => patch({ creative_type: e.target.value })}>
            {FB_CREATIVE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Call to action">
          <Select value={ad.cta} onChange={(e) => patch({ cta: e.target.value })}>
            <option value="">—</option>
            {FB_CTAS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="URL tags">
          <TextInput value={ad.url_tags} onChange={(e) => patch({ url_tags: e.target.value })} placeholder="utm_source=facebook" />
        </Field>
      </div>
    </div>
  );
}
