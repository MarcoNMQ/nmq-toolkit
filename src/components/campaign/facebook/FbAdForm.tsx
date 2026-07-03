'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { FB_CREATIVE_TYPES, FB_CTAS, FB_STATUSES } from '@/lib/campaign/fbConstants';
import { CharCount, Field, Select, TextArea, TextInput } from '@/components/Field';
import type { FbAd } from '@/lib/campaign/types';

function extractFromPostUrl(url: string): { storyId: string; videoId: string; creativeType: string } | null {
  const clean = url.trim();

  // https://www.facebook.com/{page_id}/videos/{video_id}
  const videoMatch = clean.match(/facebook\.com\/(\d+)\/videos\/(\d+)/);
  if (videoMatch) {
    return { storyId: videoMatch[2], videoId: videoMatch[2], creativeType: 'Video Page Post Ad' };
  }

  // https://www.facebook.com/{page_slug}/videos/{video_id}
  const videoSlugMatch = clean.match(/facebook\.com\/[^/]+\/videos\/(\d+)/);
  if (videoSlugMatch) {
    return { storyId: videoSlugMatch[1], videoId: videoSlugMatch[1], creativeType: 'Video Page Post Ad' };
  }

  // https://www.facebook.com/{page_id}/posts/{post_id}
  const postMatch = clean.match(/facebook\.com\/\d+\/posts\/(\d+)/);
  if (postMatch) {
    return { storyId: postMatch[1], videoId: '', creativeType: 'Image Page Post Ad' };
  }

  // https://www.facebook.com/{page_slug}/posts/{post_id}
  const postSlugMatch = clean.match(/facebook\.com\/[^/]+\/posts\/(\d+)/);
  if (postSlugMatch) {
    return { storyId: postSlugMatch[1], videoId: '', creativeType: 'Image Page Post Ad' };
  }

  // https://www.facebook.com/permalink.php?story_fbid={id}&id={page_id}
  const permalinkMatch = clean.match(/story_fbid=(\d+)/);
  if (permalinkMatch) {
    return { storyId: permalinkMatch[1], videoId: '', creativeType: 'Image Page Post Ad' };
  }

  return null;
}

export function FbAdForm({ campaignId, adId }: { campaignId: string; adId: string }) {
  const campaign = useBuilderStore((s) => s.fbCampaigns.find((c) => c.id === campaignId));
  const ad = campaign?.ads.find((a) => a.id === adId);
  const updateAd = useBuilderStore((s) => s.updateFbAd);
  const removeAd = useBuilderStore((s) => s.removeFbAd);

  const [postUrl, setPostUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  if (!campaign || !ad) return null;

  function patch(p: Partial<FbAd>) {
    updateAd(campaignId, adId, p);
  }

  function handlePostUrl(url: string) {
    setPostUrl(url);
    setUrlError('');
    if (!url.trim()) return;
    const extracted = extractFromPostUrl(url);
    if (extracted) {
      patch({ story_id: extracted.storyId, video_id: extracted.videoId, creative_type: extracted.creativeType });
    } else {
      setUrlError('URL not recognised. Paste the full post URL from your Facebook Page.');
    }
  }

  const isExistingPost = ad.ad_type === 'existing_post';

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

      {/* Ad type toggle */}
      <div className="rounded-xl border border-ink-200 p-1 flex gap-1 bg-ink-50">
        <button
          type="button"
          onClick={() => patch({ ad_type: 'new_creative' })}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            !isExistingPost ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          New creative
        </button>
        <button
          type="button"
          onClick={() => patch({ ad_type: 'existing_post' })}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            isExistingPost ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          Promote existing post
        </button>
      </div>

      {isExistingPost ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-3">
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-sky-700">Existing post</p>
            <p className="text-[11px] text-sky-600">
              Paste the Facebook post URL — the Story ID and Video ID are extracted automatically. Find the URL by going to your Page, clicking the post timestamp, and copying the address bar.
            </p>
          </div>

          {/* URL input */}
          <div>
            <Field label="Facebook Post URL">
              <TextInput
                value={postUrl}
                onChange={(e) => handlePostUrl(e.target.value)}
                placeholder="https://www.facebook.com/100067846809006/videos/24278042309642276"
              />
            </Field>
            {urlError && <p className="mt-1 text-xs text-red-500">{urlError}</p>}
            {!urlError && ad.story_id && (
              <p className="mt-1 text-xs text-sky-600">
                Extracted — Story ID: <strong>{ad.story_id}</strong>
                {ad.video_id && <> · Video ID: <strong>{ad.video_id}</strong></>}
              </p>
            )}
          </div>

          {/* Manual overrides (collapsed by default once URL is filled) */}
          <details className={ad.story_id ? '' : 'open'}>
            <summary className="cursor-pointer text-xs font-semibold text-sky-700 hover:text-sky-900">
              Manual override
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="Story ID" hint="Numeric ID only — the tool adds the s: prefix automatically">
                <TextInput
                  value={ad.story_id ?? ''}
                  onChange={(e) => patch({ story_id: e.target.value })}
                  placeholder="e.g. 24278042309642276"
                />
              </Field>
              <Field label="Video ID" hint="Leave blank to copy from Story ID for video posts">
                <TextInput
                  value={ad.video_id ?? ''}
                  onChange={(e) => patch({ video_id: e.target.value })}
                  placeholder="e.g. 24278042309642276 (optional)"
                />
              </Field>
            </div>
          </details>

          <div className="flex flex-col gap-1">
            <Field label="Creative type">
              <Select value={ad.creative_type} onChange={(e) => patch({ creative_type: e.target.value })}>
                {FB_CREATIVE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="URL tags (optional)">
            <TextInput value={ad.url_tags} onChange={(e) => patch({ url_tags: e.target.value })} placeholder="utm_source=facebook" />
          </Field>
        </div>
      ) : (
        <>
          <Field label="Destination URL">
            <TextInput value={ad.link} onChange={(e) => patch({ link: e.target.value })} placeholder="https://shimanofishing.com/..." />
          </Field>

          <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 space-y-3">
            <div>
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-ink-500">Image asset</p>
              <p className="text-[11px] text-ink-400">Fill one of the two fields below. Use <strong>Image Hash</strong> when the image already exists in Business Manager — Facebook strips original file names so the hash is the only reliable reference.</p>
            </div>
            <Field label="Image Hash" hint="Find this in Business Manager → Creative Hub or Ad Library → image details">
              <TextInput value={ad.image_hash ?? ''} onChange={(e) => patch({ image_hash: e.target.value })} placeholder="e.g. 1056130167741584:504fcf9d72dd..." />
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
        </>
      )}
    </div>
  );
}
