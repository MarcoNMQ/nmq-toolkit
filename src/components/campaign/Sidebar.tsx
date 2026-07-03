'use client';

import { useMemo, useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { validateCampaigns } from '@/lib/campaign/builder';
import { validateFbCampaigns } from '@/lib/campaign/fbBuilder';

export function Sidebar() {
  const platform = useBuilderStore((s) => s.platform);
  const setPlatform = useBuilderStore((s) => s.setPlatform);
  const googleCampaigns = useBuilderStore((s) => s.googleCampaigns);
  const fbCampaigns = useBuilderStore((s) => s.fbCampaigns);
  const removeGoogleCampaign = useBuilderStore((s) => s.removeGoogleCampaign);
  const removeFbCampaign = useBuilderStore((s) => s.removeFbCampaign);
  const duplicateGoogleCampaign = useBuilderStore((s) => s.duplicateGoogleCampaign);
  const duplicateFbCampaign = useBuilderStore((s) => s.duplicateFbCampaign);
  const selected = useBuilderStore((s) => s.selected);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const expanded = useBuilderStore((s) => s.expanded);
  const toggleExpanded = useBuilderStore((s) => s.toggleExpanded);
  const mobileSidebarOpen = useBuilderStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useBuilderStore((s) => s.setMobileSidebarOpen);
  const clearAll = useBuilderStore((s) => s.clearAll);

  const [exporting, setExporting] = useState(false);

  const campaigns = platform === 'google' ? googleCampaigns : fbCampaigns;
  const errors = useMemo(
    () => (platform === 'google' ? validateCampaigns(googleCampaigns) : validateFbCampaigns(fbCampaigns)),
    [platform, googleCampaigns, fbCampaigns],
  );

  const totalAds = campaigns.reduce((n, c) => n + c.ads.length, 0);
  const totalBudget = campaigns.reduce((n, c) => n + (Number(c.budget) || 0), 0);

  async function downloadExport(exportType: 'campaigns' | 'keywords' | 'sitelinks' | 'fb_ads_only', filename: string) {
    setExporting(true);
    try {
      const res = await fetch('/api/campaign/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, campaigns, exportType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handleExport() {
    return downloadExport('campaigns', platform === 'google' ? 'google_ads_campaigns.csv' : 'facebook_campaigns.xlsx');
  }

  function handleFbAdsOnly() {
    return downloadExport('fb_ads_only', 'facebook_ads_only.xlsx');
  }

  const hasKeywords = platform === 'google' && googleCampaigns.some((c) => c.keywords.length > 0);
  const hasSitelinks = platform === 'google' && googleCampaigns.some((c) => c.sitelinks.length > 0);

  return (
    <>
      {/* Backdrop — mobile only, tap to dismiss the drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-80 max-w-[85vw] flex-col overflow-hidden bg-white border-r border-ink-100 transition-transform duration-200 md:relative md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
      <div className="border-b border-ink-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-base font-extrabold tracking-tight text-ink-900">NMQ Campaign Builder</span>
          <button
            className="rounded-md p-1 text-ink-400 hover:bg-ink-50 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <button
            className={`flex-1 rounded-full py-1.5 transition ${platform === 'google' ? 'bg-mint-500 text-white' : 'border border-ink-200 text-ink-500 hover:bg-ink-50'}`}
            onClick={() => setPlatform('google')}
          >
            Google
          </button>
          <button
            className={`flex-1 rounded-full py-1.5 transition ${platform === 'facebook' ? 'bg-mint-500 text-white' : 'border border-ink-200 text-ink-500 hover:bg-ink-50'}`}
            onClick={() => setPlatform('facebook')}
          >
            Facebook
          </button>
        </div>
      </div>

      <div className="p-3">
        <button
          className="w-full rounded-md bg-brand-500 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
          onClick={() => setSelected({ type: 'new_campaign' })}
        >
          + New Campaign
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {campaigns.length === 0 && (
          <p className="px-2 py-4 text-sm text-ink-400">No campaigns yet.</p>
        )}
        {campaigns.map((c) => {
          const isOpen = expanded[c.id] ?? true;
          const isSelected = selected.type === 'campaign' && selected.campaignId === c.id;
          return (
            <div key={c.id} className="mb-1">
              <div
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition ${isSelected ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-700 hover:bg-ink-50'}`}
              >
                <button onClick={() => toggleExpanded(c.id)} className="text-ink-400">
                  {isOpen ? '▾' : '▸'}
                </button>
                <button
                  className="flex-1 truncate text-left"
                  onClick={() => setSelected({ type: 'campaign', campaignId: c.id })}
                  title={c.campaign_name}
                >
                  {c.campaign_name || '(unnamed campaign)'}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100"
                  title="Duplicate"
                  onClick={() => (platform === 'google' ? duplicateGoogleCampaign(c.id) : duplicateFbCampaign(c.id))}
                >
                  📋
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100"
                  title="Delete"
                  onClick={() => (platform === 'google' ? removeGoogleCampaign(c.id) : removeFbCampaign(c.id))}
                >
                  🗑
                </button>
              </div>
              {isOpen && (
                <div className="ml-5 border-l-2 border-ink-100 pl-2">
                  <button
                    className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs transition ${selected.type === 'adgroup' && selected.campaignId === c.id ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-500 hover:bg-ink-50'}`}
                    onClick={() => setSelected({ type: 'adgroup', campaignId: c.id })}
                  >
                    {c.adset_name || '(ad group)'} · {c.ads.length} ad{c.ads.length === 1 ? '' : 's'}
                  </button>
                  {c.ads.map((ad) => (
                    <button
                      key={ad.id}
                      className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs transition ${selected.type === 'ad' && selected.adId === ad.id ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-400 hover:bg-ink-50'}`}
                      onClick={() => setSelected({ type: 'ad', campaignId: c.id, adId: ad.id })}
                    >
                      {('ad_name' in ad && ad.ad_name) || '(unnamed ad)'}
                    </button>
                  ))}
                  <button
                    className="block w-full truncate rounded-md px-2 py-1 text-left text-xs font-bold text-brand-600 hover:bg-ink-50"
                    onClick={() => setSelected({ type: 'new_ad', campaignId: c.id })}
                  >
                    + Add ad
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-ink-100 p-3 text-xs font-medium text-ink-500">
        {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} · {totalAds} ad{totalAds === 1 ? '' : 's'} · €{totalBudget.toFixed(2)} budget
      </div>

      {errors.length > 0 && (
        <details className="border-t border-ink-100 px-3 py-2 text-xs text-red-600">
          <summary className="cursor-pointer font-semibold">{errors.length} validation issue{errors.length === 1 ? '' : 's'}</summary>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="border-t border-ink-100 p-3">
        <button
          disabled={exporting || campaigns.length === 0}
          onClick={handleExport}
          className="w-full rounded-md border-2 border-brand-500 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : platform === 'google' ? 'Export CSV' : 'Export Excel (full)'}
        </button>
        {platform === 'facebook' && (
          <button
            disabled={exporting || campaigns.length === 0}
            onClick={handleFbAdsOnly}
            className="mt-2 w-full rounded-md border border-brand-500 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-50 disabled:opacity-40"
            title="Exports only the ad rows — use this to add ads to an existing campaign without creating a duplicate campaign structure"
          >
            {exporting ? 'Exporting…' : 'Export Ads only ↗'}
          </button>
        )}
        {hasKeywords && (
          <button
            disabled={exporting}
            onClick={() => downloadExport('keywords', 'google_ads_keywords.csv')}
            className="mt-2 w-full rounded-md border border-ink-200 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
          >
            Export Keywords CSV
          </button>
        )}
        {hasSitelinks && (
          <button
            disabled={exporting}
            onClick={() => downloadExport('sitelinks', 'google_ads_sitelinks.csv')}
            className="mt-2 w-full rounded-md border border-ink-200 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
          >
            Export Sitelinks CSV
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm('Clear all campaigns and ads? This cannot be undone.')) clearAll();
          }}
          className="mt-2 w-full text-xs font-medium text-ink-400 hover:text-red-500 hover:underline"
        >
          Clear all data
        </button>
      </div>
      </aside>
    </>
  );
}
