'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { Field, Select, TextInput } from '@/components/Field';
import { COUNTRY_MAP, COUNTRY_OPTIONS } from '@/lib/campaign/constants';
import { PMAX_BID_STRATEGIES, bidStrategyNeedsTargetCpa, bidStrategyNeedsTargetRoas } from '@/lib/campaign/pmax/pmaxDefaults';
import { PmaxAssetGroupEditor } from './PmaxAssetGroupEditor';
import type { PmaxCampaign } from '@/lib/campaign/pmax/pmaxTypes';

function BrandAssetList({ campaign, role, label }: { campaign: PmaxCampaign; role: 'business_name' | 'logo_square' | 'logo_landscape'; label: string }) {
  const addPmaxAsset = useBuilderStore((s) => s.addPmaxAsset);
  const updatePmaxAsset = useBuilderStore((s) => s.updatePmaxAsset);
  const removePmaxAsset = useBuilderStore((s) => s.removePmaxAsset);
  const linkedIds = new Set(campaign.campaignAssetLinks.map((l) => l.assetId));
  const items = campaign.assets.filter((a) => linkedIds.has(a.id) && a.role === role);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/campaign/pmax/inspect-asset', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not read this file.');
      addPmaxAsset(campaign.id, {
        role, sourceFilename: data.sourceFilename, mimeType: data.mimeType,
        width: data.width, height: data.height, fileSizeBytes: data.fileSizeBytes, checksum: data.checksum,
      }, { campaignLevel: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  if (role === 'business_name') {
    return (
      <Field label={label}>
        <div className="space-y-1">
          {items.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <TextInput value={a.text ?? ''} onChange={(e) => updatePmaxAsset(campaign.id, a.id, { text: e.target.value })} maxLength={25} className="flex-1" />
              <button type="button" onClick={() => removePmaxAsset(campaign.id, a.id)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          ))}
          {items.length === 0 && (
            <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => addPmaxAsset(campaign.id, { role: 'business_name', text: '' }, { campaignLevel: true })}>
              + Add business name
            </button>
          )}
        </div>
      </Field>
    );
  }

  return (
    <Field label={label}>
      <label className="mb-1 inline-block cursor-pointer text-xs font-semibold text-brand-600 hover:underline">
        {uploading ? 'Reading…' : '+ Upload'}
        <input type="file" accept=".jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="space-y-1">
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-ink-100 px-2 py-1 text-xs">
            <span className="truncate text-ink-700">{a.sourceFilename} — {a.width}×{a.height}</span>
            <button type="button" onClick={() => removePmaxAsset(campaign.id, a.id)} className="shrink-0 text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </Field>
  );
}

export function PmaxCampaignForm({ campaignId }: { campaignId: string }) {
  const campaign = useBuilderStore((s) => s.pmaxCampaigns.find((c) => c.id === campaignId));
  const update = useBuilderStore((s) => s.updatePmaxCampaign);
  const removeCampaign = useBuilderStore((s) => s.removePmaxCampaign);
  const addPmaxAssetGroup = useBuilderStore((s) => s.addPmaxAssetGroup);
  const setSelected = useBuilderStore((s) => s.setSelected);

  if (!campaign) return null;
  function patch(p: Partial<PmaxCampaign>) {
    update(campaignId, p);
  }

  const needsTargetCpa = bidStrategyNeedsTargetCpa(campaign.bidStrategyType);
  const needsTargetRoas = bidStrategyNeedsTargetRoas(campaign.bidStrategyType);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-xs text-brand-700">
        Performance Max — Standard. This produces a validated build package (JSON + preflight report + copy sheet + media inventory), not a Bulk Upload/Editor CSV — Google hasn&apos;t published a verified PMAX CSV contract yet. Retail/Merchant Center PMAX isn&apos;t implemented yet.
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Performance Max campaign</h2>
        <button type="button" onClick={() => { removeCampaign(campaignId); setSelected({ type: 'welcome' }); }} className="text-xs text-red-500 hover:underline">Delete campaign</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Campaign name">
          <TextInput value={campaign.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. PMAX_LEADGEN_NOV_RODS" />
        </Field>
        <Field label="EU political ads" tooltip="Required for every PMAX campaign. Never guessed — pick the value that matches this campaign.">
          <Select value={campaign.euPoliticalAds} onChange={(e) => patch({ euPoliticalAds: e.target.value as PmaxCampaign['euPoliticalAds'] })}>
            <option value="">—</option>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Daily budget (€)">
          <TextInput type="number" min={0} step="0.01" value={campaign.budget.amount} onChange={(e) => patch({ budget: { amount: Number(e.target.value) } })} />
        </Field>
        <Field label="Start date">
          <TextInput type="date" value={campaign.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
        </Field>
        <Field label="End date (optional)">
          <TextInput type="date" value={campaign.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Bid strategy" tooltip="PMAX only supports Maximize Conversions and Maximize Conversion Value — Manual CPC, Maximize Clicks, Target Impression Share, CPM and CPV don't apply here.">
          <Select value={campaign.bidStrategyType} onChange={(e) => patch({ bidStrategyType: e.target.value as PmaxCampaign['bidStrategyType'], targetCpa: undefined, targetRoas: undefined })}>
            {PMAX_BID_STRATEGIES.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        {needsTargetCpa && (
          <Field label="Target CPA (€, optional)">
            <TextInput type="number" min={0} step="0.01" value={campaign.targetCpa ?? ''} onChange={(e) => patch({ targetCpa: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        )}
        {needsTargetRoas && (
          <Field label="Target ROAS (%, optional)">
            <TextInput type="number" min={0} step="1" value={campaign.targetRoas ?? ''} onChange={(e) => patch({ targetRoas: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        )}
      </div>

      <Field label="Included locations">
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((code) => {
            const name = COUNTRY_MAP[code];
            const active = campaign.locations.some((l) => l.name === name && !l.excluded);
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  const without = campaign.locations.filter((l) => l.name !== name);
                  patch({ locations: active ? without : [...without, { name, excluded: false }] });
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-500'}`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Excluded locations">
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((code) => {
            const name = COUNTRY_MAP[code];
            const active = campaign.locations.some((l) => l.name === name && l.excluded);
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  const without = campaign.locations.filter((l) => l.name !== name);
                  patch({ locations: active ? without : [...without, { name, excluded: true }] });
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-red-500 text-white' : 'bg-ink-100 text-ink-500'}`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Labels (optional)">
          <TextInput value={campaign.labels} onChange={(e) => patch({ labels: e.target.value })} />
        </Field>
        <Field label="Conversion goal mode">
          <Select value={campaign.conversionGoal.mode} onChange={(e) => patch({ conversionGoal: { ...campaign.conversionGoal, mode: e.target.value as 'account_default' | 'campaign_specific' } })}>
            <option value="account_default">Account default</option>
            <option value="campaign_specific">Campaign-specific</option>
          </Select>
        </Field>
        {campaign.conversionGoal.mode === 'campaign_specific' && (
          <Field label="Goal names (comma separated)" hint="Free text — not verified against any Google Ads account yet. Goes in the manual checklist.">
            <TextInput
              value={campaign.conversionGoal.goalNames.join(', ')}
              onChange={(e) => patch({ conversionGoal: { ...campaign.conversionGoal, goalNames: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
            />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-ink-200 pt-4">
        <Field label="Tracking template (optional)">
          <TextInput value={campaign.trackingTemplate} onChange={(e) => patch({ trackingTemplate: e.target.value })} />
        </Field>
        <Field label="Final URL suffix (optional)">
          <TextInput value={campaign.finalUrlSuffix} onChange={(e) => patch({ finalUrlSuffix: e.target.value })} />
        </Field>
        <Field label="Custom parameter (optional)">
          <TextInput value={campaign.customParameter} onChange={(e) => patch({ customParameter: e.target.value })} placeholder="{_key}=value" />
        </Field>
        <Field label="Final URL expansion" tooltip="On by default, matching Google's current behavior. Automation can change supplied copy/images/video/landing pages.">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={campaign.assetAutomation.finalUrlExpansion} onChange={(e) => patch({ assetAutomation: { ...campaign.assetAutomation, finalUrlExpansion: e.target.checked } })} />
            Enabled
          </label>
        </Field>
      </div>

      <div className="border-t border-ink-200 pt-4">
        <Field label="Brand guidelines" tooltip="When on, business name and logos are campaign-level assets. When off, each asset group needs its own.">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={campaign.brandGuidelines.enabled} onChange={(e) => patch({ brandGuidelines: { enabled: e.target.checked } })} />
            Enabled
          </label>
        </Field>
        {campaign.brandGuidelines.enabled && (
          <div className="mt-3 grid grid-cols-3 gap-4">
            <BrandAssetList campaign={campaign} role="business_name" label="Business name (max 25 chars)" />
            <BrandAssetList campaign={campaign} role="logo_square" label="Square logo (required, 1:1)" />
            <BrandAssetList campaign={campaign} role="logo_landscape" label="Landscape logo (optional, 4:1)" />
          </div>
        )}
      </div>

      <details className="rounded-md border border-ink-200">
        <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-ink-600">Customer acquisition &amp; retention (optional)</summary>
        <div className="space-y-3 border-t border-ink-200 p-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={campaign.lifecycle.newCustomerAcquisitionEnabled}
              onChange={(e) => patch({ lifecycle: { ...campaign.lifecycle, newCustomerAcquisitionEnabled: e.target.checked } })}
            />
            Bid higher for new customers (requires value-based bidding)
          </label>
          {campaign.lifecycle.newCustomerAcquisitionEnabled && (
            <Field label="New-customer value adjustment (%)">
              <TextInput
                type="number" min={0} step="1"
                value={campaign.lifecycle.newCustomerValueAdjustmentPct ?? ''}
                onChange={(e) => patch({ lifecycle: { ...campaign.lifecycle, newCustomerValueAdjustmentPct: e.target.value ? Number(e.target.value) : undefined } })}
              />
            </Field>
          )}
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={campaign.lifecycle.retentionEnabled}
              onChange={(e) => patch({ lifecycle: { ...campaign.lifecycle, retentionEnabled: e.target.checked } })}
            />
            Retention / re-engagement
          </label>
          {campaign.lifecycle.retentionEnabled && (
            <Field label="Required Customer Match lists (comma separated)" hint="Free text — resolved against the destination account manually, not verified here.">
              <TextInput
                value={campaign.lifecycle.requiredCustomerMatchLists.join(', ')}
                onChange={(e) => patch({ lifecycle: { ...campaign.lifecycle, requiredCustomerMatchLists: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
              />
            </Field>
          )}
        </div>
      </details>

      <div className="space-y-4 border-t border-ink-200 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-600">Asset groups ({campaign.assetGroups.length}/100)</h3>
          <button type="button" onClick={() => addPmaxAssetGroup(campaignId)} className="text-xs font-semibold text-brand-600 hover:underline">+ Add asset group</button>
        </div>
        {campaign.assetGroups.length === 0 && <p className="text-sm text-ink-400">No asset groups yet — add at least one.</p>}
        {campaign.assetGroups.map((g) => <PmaxAssetGroupEditor key={g.id} campaign={campaign} group={g} />)}
      </div>
    </div>
  );
}
