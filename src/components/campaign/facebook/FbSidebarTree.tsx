'use client';

import { useMemo, useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { groupFbCampaigns, fbGroupingIssuesByCard } from '@/lib/campaign/fbGrouping';

// Facebook tree for the sidebar: Campaign → Ad sets → Ads. Cards that share
// a campaign name render under ONE campaign row, because that's how they'll
// land in Meta (see fbGrouping.ts).
export function FbSidebarTree() {
  const fbCampaigns = useBuilderStore((s) => s.fbCampaigns);
  const selected = useBuilderStore((s) => s.selected);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const expanded = useBuilderStore((s) => s.expanded);
  const toggleExpanded = useBuilderStore((s) => s.toggleExpanded);
  const removeFbCampaign = useBuilderStore((s) => s.removeFbCampaign);
  const removeFbCampaignGroup = useBuilderStore((s) => s.removeFbCampaignGroup);
  const duplicateFbCampaign = useBuilderStore((s) => s.duplicateFbCampaign);
  const addFbAdsetToCampaign = useBuilderStore((s) => s.addFbAdsetToCampaign);

  const [openErrorId, setOpenErrorId] = useState<string | null>(null);

  const groups = useMemo(() => groupFbCampaigns(fbCampaigns), [fbCampaigns]);
  const issuesByCard = useMemo(() => fbGroupingIssuesByCard(fbCampaigns), [fbCampaigns]);

  if (fbCampaigns.length === 0) {
    return <p className="px-2 py-4 text-sm text-ink-400">No campaigns yet.</p>;
  }

  return (
    <div>
      {groups.map((g) => {
        const owner = g.cards[0];
        // Expand state is keyed on the owner card, so the whole campaign
        // folds as one unit.
        const isOpen = expanded[owner.id] ?? true;
        const isSelected = selected.type === 'campaign' && g.cards.some((c) => c.id === selected.campaignId);
        // Every card in a group carries the same campaign-level issues.
        const groupIssues = [...new Set(g.cards.flatMap((c) => issuesByCard.get(c.id) ?? []))];
        const errorKey = `group:${g.key}`;

        return (
          <div key={g.key} className="mb-0.5">
            <div
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition ${isSelected ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-700 hover:bg-ink-50'}`}
            >
              <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-brand-100 text-brand-600">C</span>
              <button onClick={() => toggleExpanded(owner.id)} className="shrink-0 text-ink-400">
                {isOpen ? '▾' : '▸'}
              </button>
              <button
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => setSelected({ type: 'campaign', campaignId: owner.id })}
                title={g.name}
              >
                {g.name || '(unnamed campaign)'}
              </button>
              {g.cards.length > 1 && (
                <span
                  className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500"
                  title={`${g.cards.length} ad sets in this campaign`}
                >
                  {g.cards.length} ad sets
                </span>
              )}
              {groupIssues.length > 0 && (
                <button
                  className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white transition hover:bg-red-600"
                  title="Click to see issues"
                  onClick={(e) => { e.stopPropagation(); setOpenErrorId(openErrorId === errorKey ? null : errorKey); }}
                >
                  !
                </button>
              )}
              <button
                className="shrink-0 opacity-0 group-hover:opacity-100"
                title={g.cards.length > 1 ? `Delete campaign and its ${g.cards.length} ad sets` : 'Delete'}
                onClick={() => {
                  if (g.cards.length > 1 && !window.confirm(`Delete "${g.name || 'this campaign'}" and all ${g.cards.length} of its ad sets?`)) return;
                  removeFbCampaignGroup(owner.id);
                }}
              >
                🗑
              </button>
            </div>

            {openErrorId === errorKey && groupIssues.length > 0 && (
              <div className="mx-1 mb-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                {groupIssues.map((e, i) => (
                  <p key={i} className="text-[11px] text-red-700">• {e}</p>
                ))}
              </div>
            )}

            {isOpen && (
              <div className="ml-5 border-l-2 border-ink-100 pl-2">
                {g.cards.map((c) => {
                  const adsetSelected = selected.type === 'adgroup' && selected.campaignId === c.id;
                  const adsetHasIssue = (issuesByCard.get(c.id) ?? []).length > 0;
                  return (
                    <div key={c.id}>
                      <div
                        className={`group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition ${adsetSelected ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-500 hover:bg-ink-50'}`}
                      >
                        <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-mint-100 text-mint-700">AS</span>
                        <button
                          className="min-w-0 flex-1 truncate text-left"
                          onClick={() => setSelected({ type: 'adgroup', campaignId: c.id })}
                          title={c.adset_name}
                        >
                          {c.adset_name || '(ad set)'} · {c.ads.length} ad{c.ads.length === 1 ? '' : 's'}
                        </button>
                        {adsetHasIssue && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-red-500" title="This ad set has campaign grouping issues" />
                        )}
                        <button
                          className="shrink-0 opacity-0 group-hover:opacity-100"
                          title="Duplicate ad set (stays in this campaign)"
                          onClick={() => duplicateFbCampaign(c.id)}
                        >
                          📋
                        </button>
                        {g.cards.length > 1 && (
                          <button
                            className="shrink-0 opacity-0 group-hover:opacity-100"
                            title="Delete ad set"
                            onClick={() => removeFbCampaign(c.id)}
                          >
                            🗑
                          </button>
                        )}
                      </div>

                      <div className="ml-4">
                        {c.ads.map((ad) => (
                          <button
                            key={ad.id}
                            className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition ${selected.type === 'ad' && selected.adId === ad.id ? 'bg-mint-100 text-ink-900 font-semibold' : 'text-ink-400 hover:bg-ink-50'}`}
                            onClick={() => setSelected({ type: 'ad', campaignId: c.id, adId: ad.id })}
                          >
                            <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-ink-100 text-ink-500">Ad</span>
                            <span className="min-w-0 flex-1 truncate" title={ad.ad_name}>
                              {ad.ad_name || '(unnamed ad)'}
                            </span>
                          </button>
                        ))}
                        <button
                          className="block w-full truncate rounded-md px-2 py-1 text-left text-xs font-bold text-brand-600 hover:bg-ink-50"
                          onClick={() => setSelected({ type: 'new_ad', campaignId: c.id })}
                        >
                          + Add ad
                        </button>
                      </div>
                    </div>
                  );
                })}
                {g.name && (
                  <button
                    className="block w-full truncate rounded-md px-2 py-1 text-left text-xs font-bold text-mint-600 hover:bg-ink-50"
                    onClick={() => {
                      const id = addFbAdsetToCampaign(owner.id);
                      setSelected({ type: 'adgroup', campaignId: id });
                    }}
                  >
                    + Add ad set
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
