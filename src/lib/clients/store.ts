import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface ClientEntry {
  id: string;
  name: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface ClientsState {
  clients: ClientEntry[];
  addClient: (name: string) => ClientEntry | null;
  removeClient: (id: string) => void;
  renameClient: (id: string, name: string) => void;
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      // Seeded example rows, deletable — never the ONLY options, and never
      // pre-selected as a default anywhere that reads this list.
      clients: [
        { id: 'shimano', name: 'Shimano' },
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
    }),
    { name: 'nmq-clients-store' },
  ),
);
