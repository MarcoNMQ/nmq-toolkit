'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { useClientsStore } from '@/lib/clients/store';
import { mergeFbPages, parseFbPagesPaste } from '@/lib/clients/parseFbPages';
import {
  FB_CAMPAIGN_OBJECTIVES, FB_BUYING_TYPES, FB_CAMPAIGN_BID_STRATEGIES,
  FB_ADSET_BID_STRATEGIES, FB_OPTIMIZATION_GOALS, FB_BILLING_EVENTS,
  FB_PUBLISHER_PLATFORMS, FB_DEVICE_PLATFORMS, FB_FACEBOOK_POSITIONS,
  FB_INSTAGRAM_POSITIONS, FB_STATUSES,
} from '@/lib/campaign/fbConstants';
import { COUNTRY_OPTIONS } from '@/lib/campaign/constants';
import { Field, MultiToggle, Select, TextInput } from '@/components/Field';
import { BriefingImportPanel } from '@/components/campaign/BriefingImportPanel';
import { fbSiblings, findFbCampaignConflicts } from '@/lib/campaign/fbGrouping';
import type { FbCampaign } from '@/lib/campaign/types';

export function FbCampaignForm({ campaignId }: { campaignId: string }) {
  const campaign = useBuilderStore((s) => s.fbCampaigns.find((c) => c.id === campaignId));
  const update = useBuilderStore((s) => s.updateFbCampaign);
  const removeCampaign = useBuilderStore((s) => s.removeFbCampaign);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const allCampaigns = useBuilderStore((s) => s.fbCampaigns);
  const applySettingsFrom = useBuilderStore((s) => s.applyFbCampaignSettingsFrom);
  const clients = useClientsStore((s) => s.clients);
  const addClient = useClientsStore((s) => s.addClient);
  const removeClient = useClientsStore((s) => s.removeClient);
  const setClientFacebookPages = useClientsStore((s) => s.setClientFacebookPages);
  const [pagesManagerOpen, setPagesManagerOpen] = useState(false);
  const [pastedPages, setPastedPages] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  if (!campaign) return null;

  const selectedClient = clients.find((c) => c.name === campaign.client_profile);

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

  // Other ad sets with the same campaign name = same Meta campaign.
  const siblings = fbSiblings(allCampaigns, campaignId);
  const owner = siblings[0];
  const isOwner = owner?.id === campaignId;
  const conflicts = siblings.length > 1
    ? findFbCampaignConflicts({ key: '', name: owner.campaign_name, cards: siblings })
    : [];
  const exportName = owner?.campaign_name.trim() ?? '';
  const spelledDifferently = siblings.length > 1 && campaign.campaign_name.trim() !== exportName;

  function patch(p: Partial<FbCampaign>) {
    update(campaignId, p);
  }

  const isBlank = !campaign.campaign_name && !campaign.campaign_objective && campaign.ads.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <details className="rounded-md border border-ink-200">
        <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-ink-600">📥 Import from Briefing Sheet</summary>
        <div className="border-t border-ink-200 p-4">
          <BriefingImportPanel
            platform="facebook"
            onDone={(lastCampaignId) => {
              if (isBlank && lastCampaignId !== campaignId) removeCampaign(campaignId);
              setSelected({ type: 'campaign', campaignId: lastCampaignId });
            }}
          />
        </div>
      </details>

      <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Campaign</h2>

      {siblings.length > 1 && (
        <div className="rounded-md border border-mint-300 bg-mint-100 px-4 py-3 text-sm text-ink-700">
          <p>
            <span className="font-semibold">Shared campaign:</span> {siblings.length} ad sets use this campaign name, so they
            export as one campaign in Meta. Campaign settings (objective, budget, bid strategy, status, dates) apply to all of them.
          </p>
          {spelledDifferently && (
            <p className="mt-1 text-xs text-ink-500">Exported as &ldquo;{exportName}&rdquo; (the first ad set&rsquo;s spelling).</p>
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">These campaign settings don&rsquo;t match across the {siblings.length} ad sets, so export is blocked:</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {conflicts.map((c) => (
              <li key={c.field}>{c.label}: {c.values.join(' vs ')}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            {!isOwner && (
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                onClick={() => applySettingsFrom(owner.id)}
              >
                Use the campaign&rsquo;s settings (from &ldquo;{owner.adset_name || 'first ad set'}&rdquo;)
              </button>
            )}
            <button
              type="button"
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              onClick={() => applySettingsFrom(campaignId)}
            >
              Apply this ad set&rsquo;s settings to all {siblings.length}
            </button>
          </div>
        </div>
      )}

      <Field
        label="Client"
        hint="Resolves this campaign's Facebook Page (Meta requires knowing which Page runs each ad) — a client can run from many Pages, one per brand line and market, so you also pick which one below."
      >
        <div className="flex gap-2">
          <Select
            value={campaign.client_profile}
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
          {campaign.client_profile && (
            <button
              type="button"
              title={`Remove "${campaign.client_profile}" from the client list`}
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
            <Select value={campaign.facebook_page_ref} onChange={(e) => patch({ facebook_page_ref: e.target.value })}>
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
                            if (campaign.facebook_page_ref === p.id) patch({ facebook_page_ref: '' });
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Campaign name">
          <TextInput value={campaign.campaign_name} onChange={(e) => patch({ campaign_name: e.target.value })} />
        </Field>
        <Field label="Ad set name">
          <TextInput value={campaign.adset_name} onChange={(e) => patch({ adset_name: e.target.value })} />
        </Field>
        <Field label="Campaign objective">
          <Select value={campaign.campaign_objective} onChange={(e) => patch({ campaign_objective: e.target.value })}>
            <option value="">—</option>
            {FB_CAMPAIGN_OBJECTIVES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Buying type">
          <Select value={campaign.buying_type} onChange={(e) => patch({ buying_type: e.target.value })}>
            {FB_BUYING_TYPES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Campaign bid strategy">
          <Select value={campaign.campaign_bid_strategy} onChange={(e) => patch({ campaign_bid_strategy: e.target.value })}>
            <option value="">—</option>
            {FB_CAMPAIGN_BID_STRATEGIES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Campaign status">
          <Select value={campaign.campaign_status} onChange={(e) => patch({ campaign_status: e.target.value })}>
            {FB_STATUSES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Campaign budget type">
          <Select value={campaign.budget_type} onChange={(e) => patch({ budget_type: e.target.value as 'Daily' | 'Lifetime' })}>
            <option value="Daily">Daily</option>
            <option value="Lifetime">Lifetime</option>
          </Select>
        </Field>
        <Field label="Campaign budget (€)">
          <TextInput type="number" min={0} step="0.01" value={campaign.budget} onChange={(e) => patch({ budget: Number(e.target.value) })} />
        </Field>
        <Field label="Start time">
          <TextInput type="date" value={campaign.campaign_start_time} onChange={(e) => patch({ campaign_start_time: e.target.value })} />
        </Field>
        <Field label="Stop time">
          <TextInput type="date" value={campaign.campaign_stop_time} onChange={(e) => patch({ campaign_stop_time: e.target.value })} />
        </Field>
      </div>

      <h3 className="text-sm font-semibold text-ink-600">Ad set targeting</h3>

      <Field label="Countries">
        <MultiToggle
          options={COUNTRY_OPTIONS}
          values={campaign.countries}
          onChange={(v) => patch({ countries: v })}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Gender">
          <Select value={campaign.gender} onChange={(e) => patch({ gender: e.target.value })}>
            <option value="All">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </Field>
        <Field label="Age min">
          <TextInput type="number" min={13} max={65} value={campaign.age_min ?? ''} onChange={(e) => patch({ age_min: Number(e.target.value) })} />
        </Field>
        <Field label="Age max">
          <TextInput type="number" min={13} max={65} value={campaign.age_max ?? ''} onChange={(e) => patch({ age_max: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Publisher platforms">
        <MultiToggle options={FB_PUBLISHER_PLATFORMS} values={campaign.publisher_platforms} onChange={(v) => patch({ publisher_platforms: v })} />
      </Field>
      <Field label="Device platforms">
        <MultiToggle options={FB_DEVICE_PLATFORMS} values={campaign.device_platforms} onChange={(v) => patch({ device_platforms: v })} />
      </Field>
      <Field label="Facebook positions">
        <MultiToggle options={FB_FACEBOOK_POSITIONS} values={campaign.facebook_positions} onChange={(v) => patch({ facebook_positions: v })} />
      </Field>
      <Field label="Instagram positions">
        <MultiToggle options={FB_INSTAGRAM_POSITIONS} values={campaign.instagram_positions} onChange={(v) => patch({ instagram_positions: v })} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Optimization goal">
          <Select value={campaign.optimization_goal} onChange={(e) => patch({ optimization_goal: e.target.value })}>
            <option value="">—</option>
            {FB_OPTIMIZATION_GOALS.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Billing event">
          <Select value={campaign.billing_event} onChange={(e) => patch({ billing_event: e.target.value })}>
            <option value="">—</option>
            {FB_BILLING_EVENTS.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Ad set bid strategy">
          <Select value={campaign.adset_bid_strategy} onChange={(e) => patch({ adset_bid_strategy: e.target.value })}>
            <option value="">—</option>
            {FB_ADSET_BID_STRATEGIES.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Bid amount (€)">
          <TextInput type="number" min={0} step="0.01" value={campaign.bid_amount ?? ''} onChange={(e) => patch({ bid_amount: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="flex justify-end border-t border-ink-200 pt-4">
        <button
          type="button"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          onClick={() => setSelected({ type: 'new_ad', campaignId })}
        >
          Next: Add ad →
        </button>
      </div>
    </div>
  );
}
