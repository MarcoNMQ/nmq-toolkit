'use client';

import { useMemo, useRef, useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { validateCampaigns } from '@/lib/campaign/builder';
import { validateFbCampaigns } from '@/lib/campaign/fbBuilder';
import type { GoogleCampaign, FbCampaign } from '@/lib/campaign/types';

type AnyCampaign = GoogleCampaign | FbCampaign;

function getMarket(c: AnyCampaign): string {
  // Key Products campaigns always go in their own bucket regardless of market,
  // because they are SEU-wide and not tied to a single regional market.
  if ('key_category' in c && c.key_category === 'YES') return 'Key Products';
  return ('market' in c ? c.market : '') || '—';
}

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
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [collapsedMarkets, setCollapsedMarkets] = useState<Set<string>>(new Set());
  const [openErrorId, setOpenErrorId] = useState<string | null>(null);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  function onHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      setSidebarWidth(Math.max(240, Math.min(680, startWidth.current + (ev.clientX - startX.current))));
    }
    function onUp() {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function toggleMarket(key: string) {
    setCollapsedMarkets((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const campaigns = platform === 'google' ? googleCampaigns : fbCampaigns;

  // Compute per-item error messages so each row can show its own issue list.
  const { campaignErrors, adErrors, errorCampaignIds, errorAdIds } = useMemo(() => {
    const campaignErrors = new Map<string, string[]>();
    const adErrors = new Map<string, string[]>();
    const errorCampaignIds = new Set<string>();
    const errorAdIds = new Set<string>();
    if (platform !== 'google') return { campaignErrors, adErrors, errorCampaignIds, errorAdIds };

    for (const c of googleCampaigns) {
      const isSearch = c.channel === 'Search';
      const cErrs: string[] = [];
      if (!c.end_date) cErrs.push('End date is missing');
      if (!c.countries?.length) cErrs.push('No countries selected');
      if (!c.ads?.length) cErrs.push('No ads added yet');
      if (cErrs.length) { campaignErrors.set(c.id, cErrs); errorCampaignIds.add(c.id); }

      for (const ad of c.ads ?? []) {
        const a = ad as unknown as Record<string, string>;
        const aErrs: string[] = [];
        if (!ad.final_url) {
          aErrs.push('Final URL is required');
        } else if (!/^https?:\/\//i.test(ad.final_url)) {
          aErrs.push(`Final URL must start with https:// (got "${ad.final_url.slice(0, 35)}")`);
        }
        if (!isSearch) {
          const hasLongHeadline = [1,2,3,4,5].some((k) => a[`long_headline_${k}`]);
          if (!hasLongHeadline) aErrs.push('At least one Long Headline is required');
        } else {
          const hCount = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].filter((k) => a[`headline_${k}`]).length;
          const dCount = [1,2,3,4].filter((k) => a[`description_${k}`]).length;
          if (hCount < 3) aErrs.push(`Only ${hCount} headline${hCount === 1 ? '' : 's'} — need at least 3`);
          if (dCount < 2) aErrs.push(`Only ${dCount} description${dCount === 1 ? '' : 's'} — need at least 2`);
        }
        if (aErrs.length) {
          adErrors.set(ad.id, aErrs);
          errorAdIds.add(ad.id);
          errorCampaignIds.add(c.id);
        }
      }
    }
    return { campaignErrors, adErrors, errorCampaignIds, errorAdIds };
  }, [platform, googleCampaigns]);

  const grouped = useMemo(() => {
    const map = new Map<string, AnyCampaign[]>();
    for (const c of campaigns) {
      const key = getMarket(c);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      return a.localeCompare(b);
    });
  }, [campaigns]);

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
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside
        style={{ width: sidebarWidth }}
        className={`fixed inset-y-0 left-0 z-40 flex h-screen max-w-[85vw] flex-col overflow-hidden bg-white border-r border-ink-100 transition-transform duration-200 md:relative md:h-full md:max-w-none md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drag-to-resize handle — desktop only */}
        <div
          onMouseDown={onHandleMouseDown}
          className="absolute right-0 top-0 bottom-0 z-10 hidden w-1 cursor-col-resize bg-transparent hover:bg-brand-300 active:bg-brand-500 md:block"
          title="Drag to resize"
        />

        {/* Header */}
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

        {/* New campaign */}
        <div className="p-3">
          <button
            className="w-full rounded-md bg-brand-500 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
            onClick={() => setSelected({ type: 'new_campaign' })}
          >
            + New Campaign
          </button>
        </div>

        {/* Campaign tree grouped by market */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {campaigns.length === 0 && (
            <p className="px-2 py-4 text-sm text-ink-400">No campaigns yet.</p>
          )}

          {grouped.map(([market, group]) => {
            const isMarketOpen = !collapsedMarkets.has(market);
            return (
              <div key={market} className="mb-1">
                {/* Market group header */}
                {(() => {
                  const marketHasErrors = group.some((c) => errorCampaignIds.has(c.id));
                  return (
                    <button
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition hover:bg-ink-50"
                      onClick={() => toggleMarket(market)}
                    >
                      <span className="text-[11px] text-ink-400">{isMarketOpen ? '▾' : '▸'}</span>
                      <span className="flex-1 text-xs font-extrabold uppercase tracking-widest text-ink-700">{market}</span>
                      {marketHasErrors && <span className="shrink-0 h-2 w-2 rounded-full bg-red-500" title="One or more campaigns have validation issues" />}
                      <span className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
                        {group.length}
                      </span>
                    </button>
                  );
                })()}

                {/* Campaigns under this market */}
                {isMarketOpen && (
                  <div className="ml-2 border-l-2 border-ink-100 pl-1">
                    {group.map((c) => {
                      const isOpen = expanded[c.id] ?? true;
                      const isSelected = selected.type === 'campaign' && selected.campaignId === c.id;
                      const campHasError = errorCampaignIds.has(c.id);
                      const adGroupHasError = c.ads.some((ad) => errorAdIds.has(ad.id));
                      const campOwnErrors = campaignErrors.get(c.id) ?? [];
                      return (
                        <div key={c.id} className="mb-0.5">
                          <div
                            className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition ${isSelected ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-700 hover:bg-ink-50'}`}
                          >
                            <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-brand-100 text-brand-600">C</span>
                            <button onClick={() => toggleExpanded(c.id)} className="shrink-0 text-ink-400">
                              {isOpen ? '▾' : '▸'}
                            </button>
                            <button
                              className="min-w-0 flex-1 truncate text-left"
                              onClick={() => setSelected({ type: 'campaign', campaignId: c.id })}
                              title={c.campaign_name}
                            >
                              {c.campaign_name || '(unnamed campaign)'}
                            </button>
                            {campHasError && (
                              <button
                                className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white transition hover:bg-red-600 group-hover:opacity-100"
                                title="Click to see issues"
                                onClick={(e) => { e.stopPropagation(); setOpenErrorId(openErrorId === c.id ? null : c.id); }}
                              >
                                !
                              </button>
                            )}
                            <button
                              className="shrink-0 opacity-0 group-hover:opacity-100"
                              title="Duplicate"
                              onClick={() => (platform === 'google' ? duplicateGoogleCampaign(c.id) : duplicateFbCampaign(c.id))}
                            >
                              📋
                            </button>
                            <button
                              className="shrink-0 opacity-0 group-hover:opacity-100"
                              title="Delete"
                              onClick={() => (platform === 'google' ? removeGoogleCampaign(c.id) : removeFbCampaign(c.id))}
                            >
                              🗑
                            </button>
                          </div>

                          {openErrorId === c.id && campOwnErrors.length > 0 && (
                            <div className="mx-1 mb-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                              {campOwnErrors.map((e, i) => (
                                <p key={i} className="text-[11px] text-red-700">• {e}</p>
                              ))}
                            </div>
                          )}

                          {isOpen && (
                            <div className="ml-5 border-l-2 border-ink-100 pl-2">
                              <button
                                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition ${selected.type === 'adgroup' && selected.campaignId === c.id ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-500 hover:bg-ink-50'}`}
                                onClick={() => setSelected({ type: 'adgroup', campaignId: c.id })}
                              >
                                <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-mint-100 text-mint-700">AG</span>
                                <span className="min-w-0 flex-1 truncate" title={c.adset_name}>
                                  {c.adset_name || '(ad group)'} · {c.ads.length} ad{c.ads.length === 1 ? '' : 's'}
                                </span>
                                {adGroupHasError && (
                                  <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">!</span>
                                )}
                              </button>
                              {c.ads.map((ad) => {
                                const adHasError = errorAdIds.has(ad.id);
                                const adOwnErrors = adErrors.get(ad.id) ?? [];
                                return (
                                  <div key={ad.id}>
                                    <button
                                      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition ${selected.type === 'ad' && selected.adId === ad.id ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-400 hover:bg-ink-50'}`}
                                      onClick={() => setSelected({ type: 'ad', campaignId: c.id, adId: ad.id })}
                                    >
                                      <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-ink-100 text-ink-500">Ad</span>
                                      <span className="min-w-0 flex-1 truncate" title={('ad_name' in ad && ad.ad_name) || ''}>
                                        {('ad_name' in ad && ad.ad_name) || '(unnamed ad)'}
                                      </span>
                                      {adHasError && (
                                        <button
                                          className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white transition hover:bg-red-600"
                                          title="Click to see issues"
                                          onClick={(e) => { e.stopPropagation(); setOpenErrorId(openErrorId === ad.id ? null : ad.id); }}
                                        >
                                          !
                                        </button>
                                      )}
                                    </button>
                                    {openErrorId === ad.id && adOwnErrors.length > 0 && (
                                      <div className="mx-1 mb-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                        {adOwnErrors.map((e, i) => (
                                          <p key={i} className="text-[11px] text-red-700">• {e}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="shrink-0 border-t border-ink-100 p-3 text-xs font-medium text-ink-500">
          {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} · {totalAds} ad{totalAds === 1 ? '' : 's'} · €{totalBudget.toFixed(2)} budget
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <details className="shrink-0 border-t border-ink-100 px-3 py-2 text-xs text-red-600">
            <summary className="cursor-pointer font-semibold">{errors.length} validation issue{errors.length === 1 ? '' : 's'}</summary>
            <ul className="mt-1 max-h-28 list-disc overflow-y-auto pl-4">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        )}

        {/* Export + clear */}
        <div className="shrink-0 border-t border-ink-100 p-3">
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
