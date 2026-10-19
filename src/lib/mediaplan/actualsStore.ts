import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActualsDataset, ActualsRow } from './types';

// A library of imported actuals datasets — real campaign results, used
// for plan-vs-actuals comparison and for suggesting benchmarks on new
// plans from historical performance. Same persist-to-localStorage
// pattern as savedPlansStore.ts for v1; kept behind this one module
// deliberately, so moving this data to a real backend later is a change
// to this file's internals, not to every place that reads actuals data.

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface ActualsState {
  datasets: ActualsDataset[];
  // Creates a new dataset from freshly imported rows. Returns the new id.
  addDataset: (name: string, clientName: string, rows: ActualsRow[]) => string;
  // Appends more rows to an existing dataset (a later import for the same
  // client/dataset) rather than requiring one giant import per client.
  appendRows: (datasetId: string, rows: ActualsRow[]) => void;
  renameDataset: (id: string, name: string) => void;
  deleteDataset: (id: string) => void;
}

export const useActualsStore = create<ActualsState>()(
  persist(
    (set) => ({
      datasets: [],

      addDataset: (name, clientName, rows) => {
        const now = new Date().toISOString();
        const id = uid();
        const entry: ActualsDataset = { id, name, clientName, createdAt: now, updatedAt: now, rows };
        set((s) => ({ datasets: [...s.datasets, entry] }));
        return id;
      },

      appendRows: (datasetId, rows) => set((s) => ({
        datasets: s.datasets.map((d) => (d.id === datasetId
          ? { ...d, rows: [...d.rows, ...rows], updatedAt: new Date().toISOString() }
          : d)),
      })),

      renameDataset: (id, name) => set((s) => ({
        datasets: s.datasets.map((d) => (d.id === id ? { ...d, name } : d)),
      })),

      deleteDataset: (id) => set((s) => ({ datasets: s.datasets.filter((d) => d.id !== id) })),
    }),
    { name: 'nmq-media-plan-actuals' },
  ),
);
