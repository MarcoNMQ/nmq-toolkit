import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanConfig, Scenario } from './types';

// A library of multiple named, savable plans — separate from the single
// always-on autosave in store.ts (`nmq-media-plan-builder-store`), which
// only ever holds the ONE plan currently open in the editor. This is what
// lets a user build several distinct plans (different clients/campaigns)
// and switch between them, rather than only ever having one live draft.

export interface SavedPlan {
  id: string;
  name: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
  plan: PlanConfig;
  scenarios: Scenario[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface SavedPlansState {
  savedPlans: SavedPlan[];
  // Creates a new entry, or updates an existing one when `existingId` matches
  // one already in the library — so repeat saves of the same open plan
  // update it in place instead of piling up duplicates. Returns the entry id.
  savePlan: (name: string, plan: PlanConfig, scenarios: Scenario[], clientId?: string, existingId?: string) => string;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  duplicatePlan: (id: string) => string | null;
}

export const useSavedPlansStore = create<SavedPlansState>()(
  persist(
    (set, get) => ({
      savedPlans: [],

      savePlan: (name, plan, scenarios, clientId, existingId) => {
        const now = new Date().toISOString();
        const id = existingId ?? uid();
        set((s) => {
          const existing = s.savedPlans.find((p) => p.id === id);
          const entry: SavedPlan = {
            id,
            name,
            clientId,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            plan,
            scenarios,
          };
          return {
            savedPlans: existing
              ? s.savedPlans.map((p) => (p.id === id ? entry : p))
              : [...s.savedPlans, entry],
          };
        });
        return id;
      },

      deletePlan: (id) => set((s) => ({ savedPlans: s.savedPlans.filter((p) => p.id !== id) })),

      renamePlan: (id, name) => set((s) => ({
        savedPlans: s.savedPlans.map((p) => (p.id === id ? { ...p, name } : p)),
      })),

      duplicatePlan: (id) => {
        const original = get().savedPlans.find((p) => p.id === id);
        if (!original) return null;
        const now = new Date().toISOString();
        const copy: SavedPlan = { ...structuredClone(original), id: uid(), name: `${original.name} (copy)`, createdAt: now, updatedAt: now };
        set((s) => ({ savedPlans: [...s.savedPlans, copy] }));
        return copy.id;
      },
    }),
    { name: 'nmq-media-plan-saved-plans' },
  ),
);
