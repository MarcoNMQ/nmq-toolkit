'use client';

import { useEffect, useRef } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { GoogleCampaignForm } from '@/components/campaign/google/GoogleCampaignForm';
import { GoogleAdForm } from '@/components/campaign/google/GoogleAdForm';
import { FbCampaignForm } from '@/components/campaign/facebook/FbCampaignForm';
import { FbAdForm } from '@/components/campaign/facebook/FbAdForm';

export function MainPanel() {
  const platform = useBuilderStore((s) => s.platform);
  const selected = useBuilderStore((s) => s.selected);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const addGoogleCampaign = useBuilderStore((s) => s.addGoogleCampaign);
  const addFbCampaign = useBuilderStore((s) => s.addFbCampaign);
  const addGoogleAd = useBuilderStore((s) => s.addGoogleAd);
  const addFbAd = useBuilderStore((s) => s.addFbAd);

  // Handle "new_campaign" / "new_ad" intents by creating the item then
  // redirecting selection to it, so forms always edit a concrete id and all
  // fields are visible immediately — no extra "start" click needed.
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify(selected);
    if (handledRef.current === key) return;
    handledRef.current = key;

    if (selected.type === 'new_campaign') {
      const id = platform === 'google' ? addGoogleCampaign() : addFbCampaign();
      setSelected({ type: 'campaign', campaignId: id });
    } else if (selected.type === 'new_ad') {
      const adId = platform === 'google' ? addGoogleAd(selected.campaignId) : addFbAd(selected.campaignId);
      setSelected({ type: 'ad', campaignId: selected.campaignId, adId });
    }
  }, [selected, platform, addGoogleCampaign, addFbCampaign, addGoogleAd, addFbAd, setSelected]);

  if (selected.type === 'welcome' || selected.type === 'new_campaign') {
    return (
      <div className="flex flex-1 items-center justify-center text-ink-400">
        <div className="text-center">
          <p className="text-lg font-medium text-ink-500">No campaign selected</p>
          <p className="text-sm">Click “+ New Campaign” in the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  if (selected.type === 'campaign' || selected.type === 'adgroup') {
    return platform === 'google'
      ? <GoogleCampaignForm campaignId={selected.campaignId} />
      : <FbCampaignForm campaignId={selected.campaignId} />;
  }

  if (selected.type === 'ad' || selected.type === 'new_ad') {
    const adId = selected.type === 'ad' ? selected.adId : undefined;
    if (!adId) return null;
    return platform === 'google'
      ? <GoogleAdForm campaignId={selected.campaignId} adId={adId} />
      : <FbAdForm campaignId={selected.campaignId} adId={adId} />;
  }

  return null;
}
