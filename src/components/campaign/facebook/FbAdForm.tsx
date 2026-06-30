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

      <Field label="Image file name" hint="Must match a file already uploaded to Ads Manager">
        <TextInput value={ad.image_file_name} onChange={(e) => patch({ image_file_name: e.target.value })} />
      </Field>

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
