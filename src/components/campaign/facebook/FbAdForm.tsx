'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { useClientsStore } from '@/lib/clients/store';
import { mergeFbPages, parseFbPagesPaste } from '@/lib/clients/parseFbPages';
import { FB_CREATIVE_TYPES, FB_CTAS, FB_STATUSES } from '@/lib/campaign/fbConstants';
import { CharCount, Field, Select, TextArea, TextInput } from '@/components/Field';
import type { FbAd } from '@/lib/campaign/types';

// Short code pattern: alphanumeric + hyphens/underscores (covers both numeric FB IDs and Instagram short codes like DalyNoDEzE7)
const SHORT_CODE = '[A-Za-z0-9_-]+';

function extractFromPostUrl(url: string): { storyId: string; videoId: string; creativeType: string } | null {
  const clean = url.trim();

  // Instagram Reel: instagram.com/reel/{code}
  const igReelMatch = clean.match(new RegExp(`instagram\\.com/reel/(${SHORT_CODE})`));
  if (igReelMatch) {
    return { storyId: igReelMatch[1], videoId: igReelMatch[1], creativeType: 'Video Page Post Ad' };
  }

  // Instagram post: instagram.com/p/{code}
  const igPostMatch = clean.match(new RegExp(`instagram\\.com/p/(${SHORT_CODE})`));
  if (igPostMatch) {
    return { storyId: igPostMatch[1], videoId: igPostMatch[1], creativeType: 'Video Page Post Ad' };
  }

  // Facebook video: facebook.com/{page}/videos/{id}
  const fbVideoMatch = clean.match(new RegExp(`facebook\\.com/[^/?#]+/videos/(${SHORT_CODE})`));
  if (fbVideoMatch) {
    return { storyId: fbVideoMatch[1], videoId: fbVideoMatch[1], creativeType: 'Video Page Post Ad' };
  }

  // Facebook Reel: facebook.com/reel/{id}
  const fbReelMatch = clean.match(new RegExp(`facebook\\.com/reel/(${SHORT_CODE})`));
  if (fbReelMatch) {
    return { storyId: fbReelMatch[1], videoId: fbReelMatch[1], creativeType: 'Video Page Post Ad' };
  }

  // Facebook Watch: facebook.com/watch/?v={id}
  const fbWatchMatch = clean.match(/[?&]v=([A-Za-z0-9_-]+)/);
  if (fbWatchMatch && clean.includes('facebook.com')) {
    return { storyId: fbWatchMatch[1], videoId: fbWatchMatch[1], creativeType: 'Video Page Post Ad' };
  }

  // Facebook post: facebook.com/{page}/posts/{id}
  const fbPostMatch = clean.match(new RegExp(`facebook\\.com/[^/?#]+/posts/(${SHORT_CODE})`));
  if (fbPostMatch) {
    return { storyId: fbPostMatch[1], videoId: '', creativeType: 'Image Page Post Ad' };
  }

  // Facebook permalink: facebook.com/permalink.php?story_fbid={id}
  const permalinkMatch = clean.match(/story_fbid=([A-Za-z0-9_-]+)/);
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
  const clients = useClientsStore((s) => s.clients);
  const addClient = useClientsStore((s) => s.addClient);
  const removeClient = useClientsStore((s) => s.removeClient);
  const setClientFacebookPages = useClientsStore((s) => s.setClientFacebookPages);

  const [urlError, setUrlError] = useState('');
  const [pagesManagerOpen, setPagesManagerOpen] = useState(false);
  const [pastedPages, setPastedPages] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  if (!campaign || !ad) return null;

  const postUrl = ad.post_url ?? '';
  const selectedClient = clients.find((c) => c.name === ad.client_profile);

  function patch(p: Partial<FbAd>) {
    updateAd(campaignId, adId, p);
  }

  function importPastedPages() {
    if (!selectedClient) return;
    const { rows, invalidLines } = parseFbPagesPaste(pastedPages);
    if (rows.length > 0) {
      const merged = mergeFbPages(selectedClient.facebookPages ?? [], rows);
      setClientFacebookPages(selectedClient.id, merged);
    }
    setPastedPages('');
    setPasteFeedback(
      invalidLines.length > 0
        ? `Added/updated ${rows.length} page${rows.length === 1 ? '' : 's'}. Couldn't read ${invalidLines.length} line${invalidLines.length === 1 ? '' : 's'}: ${invalidLines.join(' | ')}`
        : `Added/updated ${rows.length} page${rows.length === 1 ? '' : 's'}.`,
    );
  }

  function handlePostUrl(url: string) {
    setUrlError('');
    if (!url.trim()) {
      patch({ post_url: '' });
      return;
    }
    const extracted = extractFromPostUrl(url);
    if (extracted) {
      patch({ post_url: url, story_id: extracted.storyId, video_id: extracted.videoId, creative_type: extracted.creativeType });
    } else {
      patch({ post_url: url });
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

      <Field
        label="Client"
        hint="Resolves this ad's Facebook Page (Meta requires knowing which Page runs it). Per-ad, not per-campaign — other ads in this same campaign can use a different client/Page with no effect on this one."
      >
        <div className="flex gap-2">
          <Select
            value={ad.client_profile}
            onChange={(e) => {
              if (e.target.value === '__add__') {
                const name = window.prompt('New client name:');
                const entry = name ? addClient(name) : null;
                if (entry) patch({ client_profile: entry.name, facebook_page_ref: '' });
                return;
              }
              patch({ client_profile: e.target.value, facebook_page_ref: '' });
            }}
          >
            <option value="">— None —</option>
            {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="__add__">+ Add new client…</option>
          </Select>
          {ad.client_profile && (
            <button
              type="button"
              title={`Remove "${ad.client_profile}" from the client list`}
              onClick={() => {
                if (selectedClient && window.confirm(`Remove "${selectedClient.name}" from the client list?`)) {
                  removeClient(selectedClient.id);
                  patch({ client_profile: '', facebook_page_ref: '' });
                }
              }}
              className="rounded-md border border-ink-200 px-2 text-xs text-ink-400 hover:border-red-300 hover:text-red-500"
            >
              🗑
            </button>
          )}
        </div>
      </Field>

      {selectedClient && (
        <Field label="Facebook Page">
          <div className="flex gap-2">
            <Select value={ad.facebook_page_ref} onChange={(e) => patch({ facebook_page_ref: e.target.value })}>
              <option value="">— None —</option>
              {(selectedClient.facebookPages ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <button
              type="button"
              onClick={() => setPagesManagerOpen((v) => !v)}
              className="whitespace-nowrap rounded-md border border-ink-200 px-2 text-xs font-semibold text-ink-500 hover:bg-ink-50"
            >
              {pagesManagerOpen ? 'Hide' : 'Manage'} {selectedClient.name}&rsquo;s Pages ({(selectedClient.facebookPages ?? []).length})
            </button>
          </div>

          {pagesManagerOpen && (
            <div className="mt-2 space-y-2 rounded-md border border-ink-200 bg-ink-50 p-3">
              <p className="text-xs text-ink-500">
                Paste a list of this client&rsquo;s Facebook Pages — one per line, as &ldquo;Page name&rdquo; then the numeric Page
                ID (tab, comma, or space separated; pasting straight from a spreadsheet works). Re-pasting only adds new
                pages or updates a name — it never removes one.
              </p>
              <textarea
                value={pastedPages}
                onChange={(e) => setPastedPages(e.target.value)}
                placeholder={'Shimano Tribal Hungary\t100224755907718\nShimano-Fishing (FR - French)\t744008922322330'}
                rows={4}
                className="w-full rounded-md border border-ink-200 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-brand-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={importPastedPages}
                  disabled={!pastedPages.trim()}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-40"
                >
                  Add / update pages
                </button>
                {pasteFeedback && <span className="text-xs text-ink-500">{pasteFeedback}</span>}
              </div>

              {(selectedClient.facebookPages ?? []).length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-ink-200 pt-2">
                  {(selectedClient.facebookPages ?? []).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-ink-700" title={p.name}>{p.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-ink-400">{p.pageId}</span>
                        <button
                          type="button"
                          title={`Remove "${p.name}"`}
                          onClick={() => {
                            const next = (selectedClient.facebookPages ?? []).filter((x) => x.id !== p.id);
                            setClientFacebookPages(selectedClient.id, next);
                            if (ad.facebook_page_ref === p.id) patch({ facebook_page_ref: '' });
                          }}
                          className="text-ink-400 hover:text-red-500"
                        >
                          🗑
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>
      )}

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
              Paste the post URL from Instagram or Facebook — the Story ID and Video ID are extracted automatically. For Instagram: open the post/reel and copy the URL from the address bar.
            </p>
          </div>

          {/* URL input */}
          <div>
            <Field label="Facebook Post URL">
              <TextInput
                value={postUrl}
                onChange={(e) => handlePostUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/DalyNoDEzE7/ or facebook.com/.../videos/..."
              />
            </Field>
            {urlError && <p className="mt-1 text-xs text-red-500">{urlError}</p>}
            {!urlError && ad.story_id && (
              <p className="mt-1 text-xs text-sky-600">
                Extracted — Story ID: <strong>{ad.story_id}</strong>
                {ad.video_id && <> · Video ID: <strong>{ad.video_id}</strong></>}
                {ad.story_id === ad.video_id && ad.video_id && <span className="text-sky-400"> (same value is correct for video posts)</span>}
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
