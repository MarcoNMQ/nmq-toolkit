import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHIMANO_FB_PAGES } from './shimanoPages';

// Shared client roster used by BOTH Campaign Builder (client_profile picker)
// and AI Insight Generator (Client tabs) — previously each tool hardcoded its
// own separate, non-editable list (Campaign Builder: just "Shimano";
// Insights: generic/Rituals/Lineage), with no way to add a real client like
// "Worldline". This is the single source of truth for "which clients exist";
// each tool still keeps its own client-SPECIFIC behavior (Shimano's product
// taxonomy in campaign/constants.ts, Rituals/Lineage's curated analysis
// presets in InsightsClient.tsx) keyed by matching name — adding a client
// here just makes it selectable, with a sensible generic/free-text fallback
// in both tools for clients with no specific config.

export interface FbPageEntry {
  id: string;
  /** A human label, e.g. "Shimano-Tribal (FR - French)" — a client can run
   *  dozens of these (one per brand line × market), so the name is what a
   *  person actually picks from, not the numeric ID. */
  name: string;
  pageId: string;
}

export interface ClientEntry {
  id: string;
  name: string;
  // Meta bulk upload requires a "Link Object ID" (o:<Page ID>) on every
  // Facebook ad so it knows which Page is running it. A client can run from
  // many Pages — Shimano alone has ~30, one per brand line and market — so
  // each campaign later picks exactly which of these it belongs to (see
  // FbCampaign.facebook_page_ref), resolved automatically at export time.
  facebookPages?: FbPageEntry[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface ClientsState {
  clients: ClientEntry[];
  addClient: (name: string) => ClientEntry | null;
  removeClient: (id: string) => void;
  renameClient: (id: string, name: string) => void;
  /** Replaces a client's whole Facebook Pages list — the bulk-paste importer
   *  computes the merged list (existing + newly parsed rows, deduped by
   *  pageId) and calls this once, rather than one add-call per row. */
  setClientFacebookPages: (id: string, pages: FbPageEntry[]) => void;
}

/** v0 → v1: Shimano's real Facebook Page list is now seeded by default (see
 *  shimanoPages.ts) — but that only applies to the initial creator state in
 *  useClientsStore below, which Zustand never reaches once a browser
 *  already has persisted clients. Anyone who picked "Shimano" before this
 *  existed has that client with no facebookPages at all, so back-fill it
 *  here too. Never overwrites a Shimano entry that already has pages (from
 *  the bulk-paste importer or a prior run of this same migration) — a
 *  person's own edits always win. Exported (not inlined in the persist
 *  config) so it's directly unit-testable. */
export function migrateClientsState(persistedState: unknown): { clients?: ClientEntry[] } | undefined {
  const state = persistedState as { clients?: ClientEntry[] } | undefined;
  if (!state?.clients) return state;
  return {
    ...state,
    clients: state.clients.map((c) => (
      c.name === 'Shimano' && !c.facebookPages?.length ? { ...c, facebookPages: SHIMANO_FB_PAGES } : c
    )),
  };
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      // Seeded example rows, deletable — never the ONLY options, and never
      // pre-selected as a default anywhere that reads this list. Shimano
      // comes with its real Facebook Pages pre-loaded (see shimanoPages.ts)
      // since it's a real, active client with ~30 Pages already known —
      // not a placeholder to delete like the other two.
      clients: [
        { id: 'shimano', name: 'Shimano', facebookPages: SHIMANO_FB_PAGES },
        { id: 'rituals', name: 'Rituals' },
        { id: 'lineage', name: 'Lineage' },
      ],

      addClient: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const existing = get().clients.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing;
        const entry: ClientEntry = { id: uid(), name: trimmed };
        set((s) => ({ clients: [...s.clients, entry] }));
        return entry;
      },

      removeClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      renameClient: (id, name) => set((s) => ({
        clients: s.clients.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)),
      })),

      setClientFacebookPages: (id, pages) => set((s) => ({
        clients: s.clients.map((c) => (c.id === id ? { ...c, facebookPages: pages } : c)),
      })),
    }),
    {
      name: 'nmq-clients-store',
      version: 1,
      migrate: migrateClientsState,
    },
  ),
);
