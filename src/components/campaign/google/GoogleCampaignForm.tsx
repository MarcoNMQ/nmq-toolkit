'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { generateAdsetName, generateCampaignName } from '@/lib/campaign/builder';
import {
  CHANNELS, MAIN_GOALS, PERF_GOALS,
  MARKETS, MONTHS, CTAS, BID_STRATEGIES, COUNTRY_OPTIONS, MARKET_TO_GROUP,
  COUNTRY_GROUP_PRESETS, COUNTRY_GROUPS, NETWORK_OPTIONS, LANGUAGE_OPTIONS,
  COUNTRY_LANGUAGE_MAP, CLIENT_PROFILES, CLIENT_TAXONOMIES,
} from '@/lib/campaign/constants';
import { Field, MultiToggle, Select, TextInput } from '@/components/Field';
import { BriefingImportPanel } from '@/components/campaign/BriefingImportPanel';
import { getConventionForClient } from '@/lib/campaign/naming/templates';
import type { GoogleCampaign } from '@/lib/campaign/types';

export function GoogleCampaignForm({ campaignId }: { campaignId: string }) {
  const campaign = useBuilderStore((s) => s.googleCampaigns.find((c) => c.id === campaignId));
  const update = useBuilderStore((s) => s.updateGoogleCampaign);
  const removeCampaign = useBuilderStore((s) => s.removeGoogleCampaign);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const addGoogleKeyword = useBuilderStore((s) => s.addGoogleKeyword);
  const updateGoogleKeyword = useBuilderStore((s) => s.updateGoogleKeyword);
  const removeGoogleKeyword = useBuilderStore((s) => s.removeGoogleKeyword);
  const addGoogleSitelink = useBuilderStore((s) => s.addGoogleSitelink);
  const updateGoogleSitelink = useBuilderStore((s) => s.updateGoogleSitelink);
  const removeGoogleSitelink = useBuilderStore((s) => s.removeGoogleSitelink);

  // Keep computed names in sync whenever the inputs that feed them change
  useEffect(() => {
    if (!campaign) return;
    const name = generateCampaignName(campaign);
    const adsetName = generateAdsetName(campaign);
    if (name !== campaign.campaign_name || adsetName !== campaign.adset_name) {
      update(campaignId, { campaign_name: name, adset_name: adsetName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    campaign?.channel, campaign?.main_goal, campaign?.perf_goal, campaign?.month,
    campaign?.product_category, campaign?.product_subcategory, campaign?.product_promoted,
    campaign?.market, campaign?.key_category, campaign?.country_group,
    campaign?.start_date, campaign?.end_date,
  ]);

  if (!campaign) return null;

  function patch(p: Partial<GoogleCampaign>) {
    update(campaignId, p);
  }

  function onMarketChange(market: string) {
    const group = MARKET_TO_GROUP[market] ?? '';
    const countries = COUNTRY_GROUP_PRESETS[group] ?? [];
    patch({ market, country_group: group, countries });
  }

  const isBlank = !campaign.market && !campaign.product_category && campaign.budget === 0 && campaign.ads.length === 0;
  const clientTaxonomy = CLIENT_TAXONOMIES[campaign.client_profile];
  const families = clientTaxonomy && campaign.product_category
    ? Object.keys(clientTaxonomy.taxonomy[campaign.product_category] ?? {})
    : [];
  const products = clientTaxonomy && campaign.product_subcategory
    ? clientTaxonomy.taxonomy[campaign.product_category]?.[campaign.product_subcategory] ?? []
    : [];
  const convention = getConventionForClient(campaign.client_profile);
  const isSearch = campaign.channel === 'Search';
  const isYouTube = campaign.channel === 'YouTube';
  const availablePerfGoals = isYouTube
    ? PERF_GOALS.filter((g) => g === 'Video Views' || g === 'Demand Gen')
    : PERF_GOALS;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <details className="rounded-md border border-ink-200">
        <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-ink-600">📥 Import from Briefing Sheet</summary>
        <div className="border-t border-ink-200 p-4">
          <BriefingImportPanel
            platform="google"
            onDone={(lastCampaignId) => {
              if (isBlank && lastCampaignId !== campaignId) removeCampaign(campaignId);
              setSelected({ type: 'campaign', campaignId: lastCampaignId });
            }}
          />
        </div>
      </details>

      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Campaign</h2>
        <p className="mt-1 text-sm text-ink-500">
          Campaign name: <span className="font-mono text-ink-700">{campaign.campaign_name || '—'}</span>
        </p>
        <p className="text-sm text-ink-500">
          Ad group name: <span className="font-mono text-ink-700">{campaign.adset_name || '—'}</span>
        </p>
        <p className="mt-1 text-xs font-medium text-ink-400">
          Using: {convention.name}{convention.locked ? ' (locked)' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Channel" tooltip="Feeds the first segment of the auto-generated campaign name (e.g. YT for YouTube).">
          <Select value={campaign.channel} onChange={(e) => patch({ channel: e.target.value })}>
            <option value="">—</option>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Main goal" tooltip="The high-level campaign objective. Also feeds the campaign name.">
          <Select value={campaign.main_goal} onChange={(e) => patch({ main_goal: e.target.value })}>
            <option value="">—</option>
            {MAIN_GOALS.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field
          label="Performance goal"
          tooltip="The specific metric this ad group optimizes for. YouTube only shows Video Views and Demand Gen — Traffic campaigns on YouTube are Demand Gen campaigns with Maximize clicks bidding."
        >
          <Select
            value={campaign.perf_goal}
            onChange={(e) => {
              const perf_goal = e.target.value;
              // Demand Gen on YouTube = Maximize clicks bid strategy
              const bid_strategy =
                isYouTube && perf_goal === 'Demand Gen' ? 'Maximize clicks' : campaign.bid_strategy;
              patch({ perf_goal, bid_strategy });
            }}
          >
            <option value="">—</option>
            {availablePerfGoals.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Month">
          <Select value={campaign.month} onChange={(e) => patch({ month: e.target.value })}>
            <option value="">—</option>
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>

      <Field
        label="For which client are you setting up the campaign?"
        hint="Leave blank for free-text product fields. Picking a known client switches Product category/family/promoted to that client's fixed naming convention."
      >
        <Select
          value={campaign.client_profile}
          onChange={(e) => patch({ client_profile: e.target.value, product_category: '', product_subcategory: '', product_promoted: '' })}
        >
          <option value="">— None —</option>
          {CLIENT_PROFILES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>

      <div className="grid grid-cols-3 gap-4">
        {clientTaxonomy ? (
          <>
            <Field label="Product category" tooltip={`${campaign.client_profile}'s top-level catalogue grouping. Narrows the Product family list below.`}>
              <Select
                value={campaign.product_category}
                onChange={(e) => patch({ product_category: e.target.value, product_subcategory: '', product_promoted: '' })}
              >
                <option value="">—</option>
                {clientTaxonomy.categories.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Product family">
              <Select
                value={campaign.product_subcategory}
                onChange={(e) => patch({ product_subcategory: e.target.value, product_promoted: '' })}
                disabled={!families.length}
              >
                <option value="">—</option>
                {families.map((f) => <option key={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Product promoted">
              <Select
                value={campaign.product_promoted}
                onChange={(e) => patch({ product_promoted: e.target.value })}
                disabled={!products.length}
              >
                <option value="">—</option>
                {products.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Product category" tooltip="Free text — your own product taxonomy. Feeds the auto-generated campaign and ad group names.">
              <TextInput value={campaign.product_category} onChange={(e) => patch({ product_category: e.target.value })} placeholder="e.g. Running shoes" />
            </Field>
            <Field label="Product family">
              <TextInput value={campaign.product_subcategory} onChange={(e) => patch({ product_subcategory: e.target.value })} placeholder="e.g. Trail" />
            </Field>
            <Field label="Product promoted">
              <TextInput value={campaign.product_promoted} onChange={(e) => patch({ product_promoted: e.target.value })} placeholder="e.g. Trail Runner X2" />
            </Field>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Market" tooltip="Picking a market auto-fills Country group and Countries below to match — you can still adjust them after.">
          <Select value={campaign.market} onChange={(e) => onMarketChange(e.target.value)}>
            <option value="">—</option>
            {MARKETS.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Country group">
          <Select
            value={campaign.country_group}
            onChange={(e) => patch({ country_group: e.target.value, countries: COUNTRY_GROUP_PRESETS[e.target.value] ?? [] })}
          >
            <option value="">—</option>
            {COUNTRY_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Key category" tooltip="Marks this as a flagship/priority product. Adds 'KC' to the campaign name when set to Yes.">
          <Select value={campaign.key_category} onChange={(e) => patch({ key_category: e.target.value as 'YES' | 'NO' })}>
            <option value="NO">No</option>
            <option value="YES">Yes</option>
          </Select>
        </Field>
      </div>

      <Field label="Countries" hint="Auto-filled from country group, adjust as needed">
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((code) => {
            const active = campaign.countries.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() =>
                  patch({
                    countries: active
                      ? campaign.countries.filter((c) => c !== code)
                      : [...campaign.countries, code],
                  })
                }
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-500'}`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Location targeting level" hint="Whether the country targeting applies to the whole campaign or just this ad group">
        <div className="flex rounded-md bg-ink-100 p-1 text-sm font-medium w-fit">
          <button
            type="button"
            className={`rounded-md px-3 py-1 transition ${campaign.location_level === 'campaign' ? 'bg-white text-ink-900 shadow' : 'text-ink-500'}`}
            onClick={() => patch({ location_level: 'campaign' })}
          >
            Campaign level
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 transition ${campaign.location_level === 'adgroup' ? 'bg-white text-ink-900 shadow' : 'text-ink-500'}`}
            onClick={() => patch({ location_level: 'adgroup' })}
          >
            Ad group level
          </button>
        </div>
      </Field>

      <h3 className="text-sm font-semibold text-ink-600">Editor settings</h3>

      <Field label="Networks" tooltip="Which Google Ads networks the campaign can serve on. These are the only values Editor's bulk import accepts for Demand Gen campaigns.">
        <MultiToggle
          options={NETWORK_OPTIONS}
          values={campaign.networks ? campaign.networks.split(';').filter(Boolean) : []}
          onChange={(v) => patch({ networks: v.join(';') })}
        />
      </Field>

      <Field
        label="Languages"
        hint="Pick 'All' or specific languages — use the shortcut to add languages for the countries selected above"
        tooltip="Targets people based on their Google account/browser language, not their location. Usually matches the countries you're targeting."
      >
        <MultiToggle
          options={LANGUAGE_OPTIONS}
          values={campaign.languages ? campaign.languages.split(',').map((s) => s.trim()).filter(Boolean) : []}
          onChange={(v) => {
            // "All" is exclusive — picking it clears everything else, and picking
            // anything else while "All" is active drops "All".
            if (v.includes('All') && v.length > 1) {
              patch({ languages: v.filter((l) => l !== 'All').join(',') });
            } else {
              patch({ languages: v.join(',') });
            }
          }}
        />
        <button
          type="button"
          className="mt-1 w-fit text-xs font-semibold text-brand-600 hover:underline"
          onClick={() => {
            const fromCountries = Array.from(new Set(campaign.countries.flatMap((c) => COUNTRY_LANGUAGE_MAP[c] ?? [])));
            const current = campaign.languages ? campaign.languages.split(',').map((s) => s.trim()).filter(Boolean) : [];
            const merged = Array.from(new Set([...current.filter((l) => l !== 'All'), ...fromCountries]));
            patch({ languages: merged.join(',') });
          }}
        >
          + Add languages for selected countries
        </button>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Labels" hint="Leave blank to auto-generate from month + year">
          <TextInput value={campaign.labels} onChange={(e) => patch({ labels: e.target.value })} placeholder={campaign.month && campaign.end_date ? undefined : 'e.g. JUN;2026'} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date">
          <TextInput type="date" value={campaign.start_date} onChange={(e) => patch({ start_date: e.target.value })} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={campaign.end_date} onChange={(e) => patch({ end_date: e.target.value })} />
        </Field>
        <Field label="Budget (€/day)">
          <TextInput type="number" min={0} step="0.01" value={campaign.budget} onChange={(e) => patch({ budget: Number(e.target.value) })} />
        </Field>
        <Field label="Bid strategy">
          <Select value={campaign.bid_strategy} onChange={(e) => patch({ bid_strategy: e.target.value })}>
            <option value="">—</option>
            {BID_STRATEGIES.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Default CTA">
          <Select value={campaign.cta} onChange={(e) => patch({ cta: e.target.value })}>
            <option value="">—</option>
            {CTAS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
      </div>

      <details className="rounded-md border border-ink-200">
        <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-ink-600">Audience &amp; placement setup (optional)</summary>
        <div className="space-y-4 border-t border-ink-200 p-4">
          <p className="text-xs text-ink-400">These fields are for your own reference only — they are not exported to the CSV. Use them to keep audience strategy notes alongside the campaign settings.</p>
          <Field label="Audience type">
            <Select
              value={campaign.audience_type ?? ''}
              onChange={(e) => patch({ audience_type: e.target.value as GoogleCampaign['audience_type'] })}
            >
              <option value="">— Not specified —</option>
              <option>In-market</option>
              <option>Affinity</option>
              <option>Life events</option>
              <option>Detailed demographics</option>
              <option>Custom segment</option>
              <option>Your data segment</option>
              <option>Optimized targeting</option>
            </Select>
          </Field>
          {campaign.audience_type === 'Custom segment' ? (
            <Field
              label="Custom segment keywords / URLs / apps"
              hint="One per line — these are the signals you'd enter when building the custom segment in Google Ads"
            >
              <textarea
                rows={5}
                value={campaign.audience_keywords ?? ''}
                onChange={(e) => patch({ audience_keywords: e.target.value })}
                placeholder={'running shoes\nhttps://competitor.com\nFitness Tracker app'}
                className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Field>
          ) : (
            <Field
              label="Audience segments"
              hint="Names of the in-market, affinity, or data segments you plan to target"
            >
              <TextInput
                value={campaign.audience_segments ?? ''}
                onChange={(e) => patch({ audience_segments: e.target.value })}
                placeholder="e.g. Outdoor enthusiasts, Fishing gear buyers"
              />
            </Field>
          )}
          <Field label="Placement notes" hint="e.g. In-stream only, exclude gaming channels">
            <TextInput
              value={campaign.placement_notes ?? ''}
              onChange={(e) => patch({ placement_notes: e.target.value })}
              placeholder="e.g. In-stream only"
            />
          </Field>
        </div>
      </details>

      {isSearch && (
        <div className="space-y-6 border-t border-ink-200 pt-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-600">Keywords</h3>
              <button
                type="button"
                onClick={() => addGoogleKeyword(campaignId)}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                + Add keyword
              </button>
            </div>
            <p className="mb-2 text-xs text-ink-400">Exported as a separate CSV — Editor imports keywords through its own bulk-upload step.</p>
            {campaign.keywords.length === 0 && <p className="text-sm text-ink-400">No keywords yet.</p>}
            <div className="space-y-2">
              {campaign.keywords.map((kw) => (
                <div key={kw.id} className="flex items-center gap-2">
                  <TextInput
                    value={kw.text}
                    onChange={(e) => updateGoogleKeyword(campaignId, kw.id, { text: e.target.value })}
                    placeholder="e.g. predator fishing rods"
                    className="flex-1"
                  />
                  <Select
                    value={kw.matchType}
                    onChange={(e) => updateGoogleKeyword(campaignId, kw.id, { matchType: e.target.value as 'Broad' | 'Phrase' | 'Exact' })}
                    className="w-32"
                  >
                    <option value="Broad">Broad</option>
                    <option value="Phrase">Phrase</option>
                    <option value="Exact">Exact</option>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeGoogleKeyword(campaignId, kw.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-600">Sitelinks</h3>
              <button
                type="button"
                onClick={() => addGoogleSitelink(campaignId)}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                + Add sitelink
              </button>
            </div>
            <p className="mb-2 text-xs text-ink-400">Campaign-level sitelink extensions — also exported as a separate CSV.</p>
            {campaign.sitelinks.length === 0 && <p className="text-sm text-ink-400">No sitelinks yet.</p>}
            <div className="space-y-3">
              {campaign.sitelinks.map((sl) => (
                <div key={sl.id} className="rounded-md border border-ink-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-500">Sitelink</span>
                    <button
                      type="button"
                      onClick={() => removeGoogleSitelink(campaignId, sl.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Link text">
                      <TextInput value={sl.linkText} onChange={(e) => updateGoogleSitelink(campaignId, sl.id, { linkText: e.target.value })} />
                    </Field>
                    <Field label="Final URL">
                      <TextInput value={sl.finalUrl} onChange={(e) => updateGoogleSitelink(campaignId, sl.id, { finalUrl: e.target.value })} placeholder="https://example.com/..." />
                    </Field>
                    <Field label="Description line 1">
                      <TextInput value={sl.description1} onChange={(e) => updateGoogleSitelink(campaignId, sl.id, { description1: e.target.value })} />
                    </Field>
                    <Field label="Description line 2">
                      <TextInput value={sl.description2} onChange={(e) => updateGoogleSitelink(campaignId, sl.id, { description2: e.target.value })} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
