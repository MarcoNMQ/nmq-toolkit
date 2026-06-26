import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NETWORKS, LANGUAGES } from './constants';
import type { FbCampaign, FbAd, GoogleAd, GoogleCampaign, GoogleKeyword, GoogleSitelink, Platform, SelectedView } from './types';

const STORAGE_KEY = 'nmq-campaign-builder-store';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function newGoogleAd(): GoogleAd {
  return {
    id: uid(),
    ad_name: '',
    video_id: '',
    headline_1: '', headline_2: '', headline_3: '', headline_4: '', headline_5: '',
    headline_6: '', headline_7: '', headline_8: '', headline_9: '', headline_10: '',
    headline_11: '', headline_12: '', headline_13: '', headline_14: '', headline_15: '',
    long_headline_1: '', long_headline_2: '', long_headline_3: '', long_headline_4: '', long_headline_5: '',
    description_1: '', description_2: '', description_3: '', description_4: '', description_5: '',
    cta: '',
    final_url: '',
    path1: '',
    path2: '',
  };
}

export function newGoogleCampaign(): GoogleCampaign {
  return {
    id: uid(),
    campaign_name: '',
    adset_name: '',
    channel: '',
    main_goal: '',
    perf_goal: '',
    month: '',
    client_profile: '',
    product_category: '',
    product_subcategory: '',
    product_promoted: '',
    market: '',
    key_category: 'NO',
    country_group: '',
    countries: [],
    location_level: 'campaign',
    budget: 0,
    bid_strategy: '',
    networks: NETWORKS,
    languages: LANGUAGES,
    labels: '',
    start_date: '',
    end_date: '',
    cta: '',
    ads: [],
    keywords: [],
    sitelinks: [],
  };
}

export function newGoogleKeyword(): GoogleKeyword {
  return { id: uid(), text: '', matchType: 'Broad' };
}

export function newGoogleSitelink(): GoogleSitelink {
  return { id: uid(), linkText: '', description1: '', description2: '', finalUrl: '' };
}

export function newFbAd(): FbAd {
  return {
    id: uid(),
    ad_name: '',
    ad_status: 'PAUSED',
    title: '',
    body: '',
    link: '',
    link_description: '',
    display_link: '',
    image_file_name: '',
    creative_type: 'Page post ad',
    url_tags: '',
    cta: '',
  };
}

export function newFbCampaign(): FbCampaign {
  return {
    id: uid(),
    campaign_name: '',
    campaign_status: 'PAUSED',
    campaign_objective: '',
    buying_type: 'AUCTION',
    campaign_bid_strategy: '',
    tags: '',
    campaign_start_time: '',
    campaign_stop_time: '',
    budget_type: 'Daily',
    budget: 0,
    adset_name: '',
    adset_status: 'PAUSED',
    adset_start_time: '',
    adset_stop_time: '',
    adset_budget_type: 'Daily',
    adset_budget: 0,
    countries: [],
    gender: 'All',
    custom_audiences: '',
    excluded_custom_audiences: '',
    publisher_platforms: [],
    device_platforms: [],
    facebook_positions: [],
    instagram_positions: [],
    optimization_goal: '',
    billing_event: '',
    adset_bid_strategy: '',
    ads: [],
  };
}

interface BuilderState {
  platform: Platform;
  setPlatform: (p: Platform) => void;

  googleCampaigns: GoogleCampaign[];
  fbCampaigns: FbCampaign[];

  selected: SelectedView;
  setSelected: (s: SelectedView) => void;

  // Sidebar is a fixed-width panel that's fine on desktop but eats most of
  // a phone screen — on mobile it's a togglable overlay drawer instead.
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;

  /** Wipes all saved campaigns/ads and resets to a blank slate — also
   *  clears the persisted copy in localStorage, not just in-memory state. */
  clearAll: () => void;

  addGoogleCampaign: () => string;
  updateGoogleCampaign: (id: string, patch: Partial<GoogleCampaign>) => void;
  removeGoogleCampaign: (id: string) => void;
  duplicateGoogleCampaign: (id: string) => void;
  addGoogleAd: (campaignId: string) => string;
  updateGoogleAd: (campaignId: string, adId: string, patch: Partial<GoogleAd>) => void;
  removeGoogleAd: (campaignId: string, adId: string) => void;

  addGoogleKeyword: (campaignId: string) => string;
  updateGoogleKeyword: (campaignId: string, keywordId: string, patch: Partial<GoogleKeyword>) => void;
  removeGoogleKeyword: (campaignId: string, keywordId: string) => void;

  addGoogleSitelink: (campaignId: string) => string;
  updateGoogleSitelink: (campaignId: string, sitelinkId: string, patch: Partial<GoogleSitelink>) => void;
  removeGoogleSitelink: (campaignId: string, sitelinkId: string) => void;

  addFbCampaign: () => string;
  updateFbCampaign: (id: string, patch: Partial<FbCampaign>) => void;
  removeFbCampaign: (id: string) => void;
  duplicateFbCampaign: (id: string) => void;
  addFbAd: (campaignId: string) => string;
  updateFbAd: (campaignId: string, adId: string, patch: Partial<FbAd>) => void;
  removeFbAd: (campaignId: string, adId: string) => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
  platform: 'google',
  // Switching platforms always lands on a usable campaign form — the most
  // recent campaign for that platform, or a fresh blank one if none exist —
  // so all fields are visible without an extra "+ New Campaign" click.
  setPlatform: (p) =>
    set((state) => {
      if (p === 'google') {
        const last = state.googleCampaigns[state.googleCampaigns.length - 1];
        if (last) return { platform: p, selected: { type: 'campaign', campaignId: last.id }, mobileSidebarOpen: false };
        const c = newGoogleCampaign();
        return { platform: p, googleCampaigns: [...state.googleCampaigns, c], selected: { type: 'campaign', campaignId: c.id }, mobileSidebarOpen: false };
      }
      const last = state.fbCampaigns[state.fbCampaigns.length - 1];
      if (last) return { platform: p, selected: { type: 'campaign', campaignId: last.id }, mobileSidebarOpen: false };
      const c = newFbCampaign();
      return { platform: p, fbCampaigns: [...state.fbCampaigns, c], selected: { type: 'campaign', campaignId: c.id }, mobileSidebarOpen: false };
    }),

  googleCampaigns: [],
  fbCampaigns: [],

  selected: { type: 'welcome' },
  // Selecting something on mobile means the user found what they wanted in
  // the drawer — auto-close it so the form is actually visible.
  setSelected: (s) => set({ selected: s, mobileSidebarOpen: false }),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  expanded: {},
  toggleExpanded: (id) => set((state) => ({ expanded: { ...state.expanded, [id]: !state.expanded[id] } })),

  clearAll: () =>
    set({
      platform: 'google',
      googleCampaigns: [],
      fbCampaigns: [],
      selected: { type: 'welcome' },
      expanded: {},
      mobileSidebarOpen: false,
    }),

  addGoogleCampaign: () => {
    const c = newGoogleCampaign();
    set((state) => ({ googleCampaigns: [...state.googleCampaigns, c] }));
    return c.id;
  },
  updateGoogleCampaign: (id, patch) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removeGoogleCampaign: (id) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.filter((c) => c.id !== id),
      selected: state.selected.type !== 'welcome' && 'campaignId' in state.selected && state.selected.campaignId === id
        ? { type: 'welcome' }
        : state.selected,
    })),
  duplicateGoogleCampaign: (id) => {
    const original = get().googleCampaigns.find((c) => c.id === id);
    if (!original) return;
    const copy: GoogleCampaign = {
      ...original,
      id: uid(),
      campaign_name: `${original.campaign_name} (Copy)`,
      ads: original.ads.map((ad) => ({ ...ad, id: uid() })),
    };
    set((state) => ({ googleCampaigns: [...state.googleCampaigns, copy] }));
  },
  addGoogleAd: (campaignId) => {
    const ad = newGoogleAd();
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, ads: [...c.ads, ad] } : c,
      ),
    }));
    return ad.id;
  },
  updateGoogleAd: (campaignId, adId, patch) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, ads: c.ads.map((a) => (a.id === adId ? { ...a, ...patch } : a)) }
          : c,
      ),
    })),
  removeGoogleAd: (campaignId, adId) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, ads: c.ads.filter((a) => a.id !== adId) } : c,
      ),
    })),

  addGoogleKeyword: (campaignId) => {
    const kw = newGoogleKeyword();
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, keywords: [...c.keywords, kw] } : c,
      ),
    }));
    return kw.id;
  },
  updateGoogleKeyword: (campaignId, keywordId, patch) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, keywords: c.keywords.map((k) => (k.id === keywordId ? { ...k, ...patch } : k)) }
          : c,
      ),
    })),
  removeGoogleKeyword: (campaignId, keywordId) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, keywords: c.keywords.filter((k) => k.id !== keywordId) } : c,
      ),
    })),

  addGoogleSitelink: (campaignId) => {
    const sl = newGoogleSitelink();
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, sitelinks: [...c.sitelinks, sl] } : c,
      ),
    }));
    return sl.id;
  },
  updateGoogleSitelink: (campaignId, sitelinkId, patch) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, sitelinks: c.sitelinks.map((s) => (s.id === sitelinkId ? { ...s, ...patch } : s)) }
          : c,
      ),
    })),
  removeGoogleSitelink: (campaignId, sitelinkId) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, sitelinks: c.sitelinks.filter((s) => s.id !== sitelinkId) } : c,
      ),
    })),

  addFbCampaign: () => {
    const c = newFbCampaign();
    set((state) => ({ fbCampaigns: [...state.fbCampaigns, c] }));
    return c.id;
  },
  updateFbCampaign: (id, patch) =>
    set((state) => ({
      fbCampaigns: state.fbCampaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removeFbCampaign: (id) =>
    set((state) => ({
      fbCampaigns: state.fbCampaigns.filter((c) => c.id !== id),
      selected: state.selected.type !== 'welcome' && 'campaignId' in state.selected && state.selected.campaignId === id
        ? { type: 'welcome' }
        : state.selected,
    })),
  duplicateFbCampaign: (id) => {
    const original = get().fbCampaigns.find((c) => c.id === id);
    if (!original) return;
    const copy: FbCampaign = {
      ...original,
      id: uid(),
      campaign_name: `${original.campaign_name} (Copy)`,
      ads: original.ads.map((ad) => ({ ...ad, id: uid() })),
    };
    set((state) => ({ fbCampaigns: [...state.fbCampaigns, copy] }));
  },
  addFbAd: (campaignId) => {
    const ad = newFbAd();
    set((state) => ({
      fbCampaigns: state.fbCampaigns.map((c) =>
        c.id === campaignId ? { ...c, ads: [...c.ads, ad] } : c,
      ),
    }));
    return ad.id;
  },
  updateFbAd: (campaignId, adId, patch) =>
    set((state) => ({
      fbCampaigns: state.fbCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, ads: c.ads.map((a) => (a.id === adId ? { ...a, ...patch } : a)) }
          : c,
      ),
    })),
  removeFbAd: (campaignId, adId) =>
    set((state) => ({
      fbCampaigns: state.fbCampaigns.map((c) =>
        c.id === campaignId ? { ...c, ads: c.ads.filter((a) => a.id !== adId) } : c,
      ),
    })),
    }),
    {
      name: STORAGE_KEY,
      // Persist the actual progress (campaigns/ads, which platform, which
      // one was open) but not transient UI chrome like the mobile drawer's
      // open/closed state — that should always start closed on load.
      partialize: (state) => ({
        platform: state.platform,
        googleCampaigns: state.googleCampaigns,
        fbCampaigns: state.fbCampaigns,
        selected: state.selected,
        expanded: state.expanded,
      }),
    },
  ),
);
