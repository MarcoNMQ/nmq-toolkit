import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NETWORKS, LANGUAGES } from './constants';
import { fbNameKey, fbSiblings, pickFbCampaignLevel } from './fbGrouping';
import type { FbCampaign, FbAd, GoogleAd, GoogleCampaign, GoogleKeyword, GoogleNegativeKeyword, GoogleSitelink, Platform, SelectedView } from './types';
import { newPmaxAssetGroup, newPmaxCampaign } from './pmax/pmaxDefaults';
import type { PmaxAsset, PmaxAssetGroup, PmaxAssetGroupSignal, PmaxCampaign, PmaxCampaignAssetLink } from './pmax/pmaxTypes';

const STORAGE_KEY = 'nmq-campaign-builder-store';
/** Bumped whenever the persisted shape changes in a way old data needs
 *  normalizing for (see `migrate` below). There was no version/migrate at
 *  all before this — any pre-existing persisted state has an implicit
 *  version of 0. */
const STORE_VERSION = 1;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * There was no version/migrate at all before STORE_VERSION 1 — any
 * pre-existing persisted state in a user's browser has no `pmaxCampaigns`
 * key yet. Zustand calls this with that old state and version 0 (its
 * default for "no version recorded") whenever the stored version doesn't
 * match STORE_VERSION; existing Search/YouTube/Demand Gen/Facebook data
 * passes through untouched — this only fills in the new collection so it's
 * never undefined. Exported (not inlined in the persist config) so it's
 * directly unit-testable without spinning up the whole store/localStorage.
 */
export function migrateBuilderState(persistedState: unknown): Pick<BuilderState, 'platform' | 'googleCampaigns' | 'fbCampaigns' | 'pmaxCampaigns' | 'selected' | 'expanded'> {
  const state = (persistedState ?? {}) as Record<string, unknown>;
  return {
    platform: (state.platform as BuilderState['platform']) ?? 'google',
    googleCampaigns: Array.isArray(state.googleCampaigns) ? (state.googleCampaigns as GoogleCampaign[]) : [],
    fbCampaigns: Array.isArray(state.fbCampaigns) ? (state.fbCampaigns as FbCampaign[]) : [],
    pmaxCampaigns: Array.isArray(state.pmaxCampaigns) ? (state.pmaxCampaigns as PmaxCampaign[]) : [],
    selected: (state.selected as SelectedView) ?? { type: 'welcome' },
    expanded: (state.expanded as Record<string, boolean>) ?? {},
  };
}

/** Deep-clones an array of {id}-shaped records with a fresh id each —
 *  used by every duplicate/move action so a copy never shares array/object
 *  identity with its source (plain `{...x}` spreads only copy the top
 *  level; nested arrays like keywords/sitelinks stayed shared references
 *  before this, which is harmless under this store's own update functions
 *  but is still the wrong invariant for a "duplicate" to rely on). */
function cloneWithFreshIds<T extends { id: string }>(items: T[]): T[] {
  return items.map((item) => ({ ...item, id: uid() }));
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
    // Blank by default — never silently pre-select a client. The form
    // already falls back to free-text product fields when no known client
    // taxonomy exists (see GoogleCampaignForm.tsx's `clientTaxonomy ?` branch).
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
    budget_type: 'Campaign total',
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
    negative_keywords: [],
    eu_political_ads: '',
    search_partners: false,
    display_expansion: false,
    audience_type: '',
    audience_segments: '',
    audience_keywords: '',
    placement_notes: '',
  };
}

export function newGoogleKeyword(): GoogleKeyword {
  return { id: uid(), text: '', matchType: 'Broad' };
}

export function newGoogleSitelink(): GoogleSitelink {
  return { id: uid(), linkText: '', description1: '', description2: '', finalUrl: '' };
}

export function newGoogleNegativeKeyword(): GoogleNegativeKeyword {
  return { id: uid(), text: '', matchType: 'Broad', level: 'adgroup' };
}

export function newFbAd(): FbAd {
  return {
    id: uid(),
    ad_name: '',
    ad_status: 'PAUSED',
    ad_type: 'new_creative',
    title: '',
    body: '',
    link: '',
    link_description: '',
    display_link: '',
    image_hash: '',
    image_file_name: '',
    story_id: '',
    video_id: '',
    post_url: '',
    creative_type: 'Video Page Post Ad',
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
  /** Performance Max campaigns — a parallel collection, never bolted onto
   *  GoogleCampaign. PMAX has no ad groups/keywords/RSAs at all, so forcing
   *  it into that shape would be exactly the cross-channel leakage the PMAX
   *  audit warns against. */
  pmaxCampaigns: PmaxCampaign[];

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
  moveGoogleAd: (fromCampaignId: string, adId: string, toCampaignId: string) => void;

  addGoogleKeyword: (campaignId: string) => string;
  updateGoogleKeyword: (campaignId: string, keywordId: string, patch: Partial<GoogleKeyword>) => void;
  removeGoogleKeyword: (campaignId: string, keywordId: string) => void;
  addGoogleKeywordsBulk: (campaignId: string, keywords: Pick<GoogleKeyword, 'text' | 'matchType'>[]) => void;

  addGoogleSitelink: (campaignId: string) => string;
  updateGoogleSitelink: (campaignId: string, sitelinkId: string, patch: Partial<GoogleSitelink>) => void;
  removeGoogleSitelink: (campaignId: string, sitelinkId: string) => void;

  addGoogleNegativeKeyword: (campaignId: string) => string;
  updateGoogleNegativeKeyword: (campaignId: string, negativeKeywordId: string, patch: Partial<GoogleNegativeKeyword>) => void;
  removeGoogleNegativeKeyword: (campaignId: string, negativeKeywordId: string) => void;

  addPmaxCampaign: () => string;
  updatePmaxCampaign: (id: string, patch: Partial<PmaxCampaign>) => void;
  removePmaxCampaign: (id: string) => void;
  duplicatePmaxCampaign: (id: string) => void;

  addPmaxAssetGroup: (campaignId: string) => string;
  updatePmaxAssetGroup: (campaignId: string, assetGroupId: string, patch: Partial<PmaxAssetGroup>) => void;
  removePmaxAssetGroup: (campaignId: string, assetGroupId: string) => void;

  /** Adds a new asset to the campaign's pool and links it either at
   *  campaign scope (brand assets) or to one asset group — never both. */
  addPmaxAsset: (campaignId: string, asset: Omit<PmaxAsset, 'id'>, scope: { assetGroupId: string } | { campaignLevel: true }) => string;
  updatePmaxAsset: (campaignId: string, assetId: string, patch: Partial<PmaxAsset>) => void;
  removePmaxAsset: (campaignId: string, assetId: string) => void;

  addPmaxSignal: (campaignId: string, assetGroupId: string, signal: Omit<PmaxAssetGroupSignal, 'id' | 'assetGroupId'>) => string;
  updatePmaxSignal: (campaignId: string, signalId: string, patch: Partial<PmaxAssetGroupSignal>) => void;
  removePmaxSignal: (campaignId: string, signalId: string) => void;

  addFbCampaign: () => string;
  updateFbCampaign: (id: string, patch: Partial<FbCampaign>) => void;
  removeFbCampaign: (id: string) => void;
  duplicateFbCampaign: (id: string) => void;
  /** New blank ad set inside the same campaign as sourceId; returns its id. */
  addFbAdsetToCampaign: (sourceId: string) => string;
  /** Copy sourceId's campaign-level settings onto every ad set of its campaign. */
  applyFbCampaignSettingsFrom: (sourceId: string) => void;
  /** Delete every ad set that belongs to the same campaign as id. */
  removeFbCampaignGroup: (id: string) => void;
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
  pmaxCampaigns: [],

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
      pmaxCampaigns: [],
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
      ads: cloneWithFreshIds(original.ads),
      keywords: cloneWithFreshIds(original.keywords),
      sitelinks: cloneWithFreshIds(original.sitelinks),
      negative_keywords: cloneWithFreshIds(original.negative_keywords),
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
  moveGoogleAd: (fromCampaignId, adId, toCampaignId) =>
    set((state) => {
      const ad = state.googleCampaigns.find((c) => c.id === fromCampaignId)?.ads.find((a) => a.id === adId);
      if (!ad) return state;
      return {
        googleCampaigns: state.googleCampaigns.map((c) => {
          if (c.id === fromCampaignId) return { ...c, ads: c.ads.filter((a) => a.id !== adId) };
          if (c.id === toCampaignId) return { ...c, ads: [...c.ads, ad] };
          return c;
        }),
      };
    }),

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
  addGoogleKeywordsBulk: (campaignId, keywords) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) => (c.id === campaignId
        ? { ...c, keywords: [...c.keywords, ...keywords.map((k) => ({ ...k, id: uid() }))] }
        : c)),
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

  addGoogleNegativeKeyword: (campaignId) => {
    const nk = newGoogleNegativeKeyword();
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, negative_keywords: [...c.negative_keywords, nk] } : c,
      ),
    }));
    return nk.id;
  },
  updateGoogleNegativeKeyword: (campaignId, negativeKeywordId, patch) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, negative_keywords: c.negative_keywords.map((n) => (n.id === negativeKeywordId ? { ...n, ...patch } : n)) }
          : c,
      ),
    })),
  removeGoogleNegativeKeyword: (campaignId, negativeKeywordId) =>
    set((state) => ({
      googleCampaigns: state.googleCampaigns.map((c) =>
        c.id === campaignId ? { ...c, negative_keywords: c.negative_keywords.filter((n) => n.id !== negativeKeywordId) } : c,
      ),
    })),

  addPmaxCampaign: () => {
    const c = newPmaxCampaign();
    set((state) => ({ pmaxCampaigns: [...state.pmaxCampaigns, c] }));
    return c.id;
  },
  updatePmaxCampaign: (id, patch) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removePmaxCampaign: (id) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.filter((c) => c.id !== id),
      selected: state.selected.type === 'pmax_campaign' && state.selected.campaignId === id
        ? { type: 'welcome' }
        : state.selected,
    })),
  duplicatePmaxCampaign: (id) => {
    const original = get().pmaxCampaigns.find((c) => c.id === id);
    if (!original) return;
    // Re-parent every cloned asset group/asset/signal to fresh ids so a
    // duplicate never shares entity identity with its source — the exact
    // bug fixed above for Search's keywords/sitelinks/negatives.
    const assetIdMap = new Map(original.assets.map((a) => [a.id, uid()]));
    const groupIdMap = new Map(original.assetGroups.map((g) => [g.id, uid()]));
    const copy: PmaxCampaign = {
      ...original,
      id: uid(),
      name: `${original.name} (Copy)`,
      assets: original.assets.map((a) => ({ ...a, id: assetIdMap.get(a.id)! })),
      campaignAssetLinks: original.campaignAssetLinks.map((l) => ({ id: uid(), assetId: assetIdMap.get(l.assetId)! })),
      assetGroups: original.assetGroups.map((g) => ({ ...g, id: groupIdMap.get(g.id)!, campaignId: original.id })),
      assetGroupAssetLinks: original.assetGroupAssetLinks.map((l) => ({
        id: uid(), assetGroupId: groupIdMap.get(l.assetGroupId)!, assetId: assetIdMap.get(l.assetId)!,
      })),
      signals: original.signals.map((s) => ({ ...s, id: uid(), assetGroupId: groupIdMap.get(s.assetGroupId)! })),
    };
    // campaignId on each cloned asset group must point at the new campaign.
    copy.assetGroups = copy.assetGroups.map((g) => ({ ...g, campaignId: copy.id }));
    set((state) => ({ pmaxCampaigns: [...state.pmaxCampaigns, copy] }));
  },

  addPmaxAssetGroup: (campaignId) => {
    const g = newPmaxAssetGroup(campaignId);
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId ? { ...c, assetGroups: [...c.assetGroups, g] } : c,
      ),
    }));
    return g.id;
  },
  updatePmaxAssetGroup: (campaignId, assetGroupId, patch) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, assetGroups: c.assetGroups.map((g) => (g.id === assetGroupId ? { ...g, ...patch } : g)) }
          : c,
      ),
    })),
  removePmaxAssetGroup: (campaignId, assetGroupId) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId
          ? {
            ...c,
            assetGroups: c.assetGroups.filter((g) => g.id !== assetGroupId),
            assetGroupAssetLinks: c.assetGroupAssetLinks.filter((l) => l.assetGroupId !== assetGroupId),
            signals: c.signals.filter((s) => s.assetGroupId !== assetGroupId),
          }
          : c,
      ),
    })),

  addPmaxAsset: (campaignId, asset, scope) => {
    const id = uid();
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) => {
        if (c.id !== campaignId) return c;
        const newAsset: PmaxAsset = { ...asset, id };
        const campaignAssetLinks: PmaxCampaignAssetLink[] = 'campaignLevel' in scope
          ? [...c.campaignAssetLinks, { id: uid(), assetId: id }]
          : c.campaignAssetLinks;
        const assetGroupAssetLinks = 'assetGroupId' in scope
          ? [...c.assetGroupAssetLinks, { id: uid(), assetGroupId: scope.assetGroupId, assetId: id }]
          : c.assetGroupAssetLinks;
        return { ...c, assets: [...c.assets, newAsset], campaignAssetLinks, assetGroupAssetLinks };
      }),
    }));
    return id;
  },
  updatePmaxAsset: (campaignId, assetId, patch) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, assets: c.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)) }
          : c,
      ),
    })),
  removePmaxAsset: (campaignId, assetId) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId
          ? {
            ...c,
            assets: c.assets.filter((a) => a.id !== assetId),
            campaignAssetLinks: c.campaignAssetLinks.filter((l) => l.assetId !== assetId),
            assetGroupAssetLinks: c.assetGroupAssetLinks.filter((l) => l.assetId !== assetId),
          }
          : c,
      ),
    })),

  addPmaxSignal: (campaignId, assetGroupId, signal) => {
    const id = uid();
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, signals: [...c.signals, { ...signal, id, assetGroupId }] }
          : c,
      ),
    }));
    return id;
  },
  updatePmaxSignal: (campaignId, signalId, patch) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, signals: c.signals.map((s) => (s.id === signalId ? { ...s, ...patch } : s)) }
          : c,
      ),
    })),
  removePmaxSignal: (campaignId, signalId) =>
    set((state) => ({
      pmaxCampaigns: state.pmaxCampaigns.map((c) =>
        c.id === campaignId ? { ...c, signals: c.signals.filter((s) => s.id !== signalId) } : c,
      ),
    })),

  addFbCampaign: () => {
    const c = newFbCampaign();
    set((state) => ({ fbCampaigns: [...state.fbCampaigns, c] }));
    return c.id;
  },
  // Cards sharing a campaign name are ad sets of one Meta campaign, so a
  // campaign-level edit on one of them is applied to all of them. A patch
  // that renames the campaign never propagates: typing a name that happens
  // to match another campaign must not overwrite either side's settings —
  // the form offers an explicit "use these settings" action instead.
  updateFbCampaign: (id, patch) =>
    set((state) => {
      const target = state.fbCampaigns.find((c) => c.id === id);
      if (!target) return {};
      const key = fbNameKey(target.campaign_name);
      const renaming = 'campaign_name' in patch && fbNameKey(patch.campaign_name) !== key;
      const shared = renaming || !key ? {} : pickFbCampaignLevel(patch);
      const propagate = Object.keys(shared).length > 0;
      return {
        fbCampaigns: state.fbCampaigns.map((c) => {
          if (c.id === id) return { ...c, ...patch };
          if (propagate && fbNameKey(c.campaign_name) === key) return { ...c, ...shared };
          return c;
        }),
      };
    }),
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
      // Same campaign name → the copy is another ad set of the same
      // campaign. The ad set gets the "(Copy)" suffix so the two stay
      // distinct ad sets instead of Meta merging them on import.
      adset_name: `${original.adset_name} (Copy)`,
      ads: original.ads.map((ad) => ({ ...ad, id: uid() })),
    };
    set((state) => ({ fbCampaigns: [...state.fbCampaigns, copy] }));
  },
  addFbAdsetToCampaign: (sourceId) => {
    const source = get().fbCampaigns.find((c) => c.id === sourceId);
    const c: FbCampaign = {
      ...newFbCampaign(),
      ...(source ? { campaign_name: source.campaign_name, ...pickFbCampaignLevel(source) } : {}),
    };
    set((state) => ({ fbCampaigns: [...state.fbCampaigns, c] }));
    return c.id;
  },
  applyFbCampaignSettingsFrom: (sourceId) => {
    const all = get().fbCampaigns;
    const source = all.find((c) => c.id === sourceId);
    if (!source) return;
    const ids = new Set(fbSiblings(all, sourceId).map((c) => c.id));
    const shared = pickFbCampaignLevel(source);
    set((state) => ({
      fbCampaigns: state.fbCampaigns.map((c) => (ids.has(c.id) ? { ...c, ...shared } : c)),
    }));
  },
  removeFbCampaignGroup: (id) => {
    const ids = new Set(fbSiblings(get().fbCampaigns, id).map((c) => c.id));
    set((state) => ({
      fbCampaigns: state.fbCampaigns.filter((c) => !ids.has(c.id)),
      selected: 'campaignId' in state.selected && ids.has(state.selected.campaignId)
        ? { type: 'welcome' }
        : state.selected,
    }));
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
      version: STORE_VERSION,
      // Persist the actual progress (campaigns/ads, which platform, which
      // one was open) but not transient UI chrome like the mobile drawer's
      // open/closed state — that should always start closed on load.
      partialize: (state) => ({
        platform: state.platform,
        googleCampaigns: state.googleCampaigns,
        fbCampaigns: state.fbCampaigns,
        pmaxCampaigns: state.pmaxCampaigns,
        selected: state.selected,
        expanded: state.expanded,
      }),
      migrate: migrateBuilderState,
    },
  ),
);
