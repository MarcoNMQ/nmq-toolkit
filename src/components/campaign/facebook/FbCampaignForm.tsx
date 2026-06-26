'use client';

import { useBuilderStore } from '@/lib/campaign/store';
import {
  FB_CAMPAIGN_OBJECTIVES, FB_BUYING_TYPES, FB_CAMPAIGN_BID_STRATEGIES,
  FB_ADSET_BID_STRATEGIES, FB_OPTIMIZATION_GOALS, FB_BILLING_EVENTS,
  FB_PUBLISHER_PLATFORMS, FB_DEVICE_PLATFORMS, FB_FACEBOOK_POSITIONS,
  FB_INSTAGRAM_POSITIONS, FB_STATUSES,
} from '@/lib/campaign/fbConstants';
import { COUNTRY_OPTIONS } from '@/lib/campaign/constants';
import { Field, MultiToggle, Select, TextInput } from '@/components/Field';
import { BriefingImportPanel } from '@/components/campaign/BriefingImportPanel';
import type { FbCampaign } from '@/lib/campaign/types';

export function FbCampaignForm({ campaignId }: { campaignId: string }) {
  const campaign = useBuilderStore((s) => s.fbCampaigns.find((c) => c.id === campaignId));
  const update = useBuilderStore((s) => s.updateFbCampaign);
  const removeCampaign = useBuilderStore((s) => s.removeFbCampaign);
  const setSelected = useBuilderStore((s) => s.setSelected);

  if (!campaign) return null;

  function patch(p: Partial<FbCampaign>) {
    update(campaignId, p);
  }

  const isBlank = !campaign.campaign_name && !campaign.campaign_objective && campaign.ads.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
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
