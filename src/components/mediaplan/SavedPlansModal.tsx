'use client';

import { useSavedPlansStore } from '@/lib/mediaplan/savedPlansStore';
import type { PlanConfig, Scenario } from '@/lib/mediaplan/types';

export function SavedPlansModal({
  onClose, onLoad, onImportFile,
}: {
  onClose: () => void;
  onLoad: (id: string, data: { plan: PlanConfig; scenarios: Scenario[] }) => void;
  onImportFile: () => void;
}) {
  const savedPlans = useSavedPlansStore((s) => s.savedPlans);
  const deletePlan = useSavedPlansStore((s) => s.deletePlan);
  const renamePlan = useSavedPlansStore((s) => s.renamePlan);
  const duplicatePlan = useSavedPlansStore((s) => s.duplicatePlan);

  const sorted = [...savedPlans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">Saved plans</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-50" aria-label="Close">✕</button>
        </div>

        {sorted.length === 0 ? (
          <p className="mb-4 text-sm text-ink-400">No saved plans yet — use &quot;Save plan&quot; to create one.</p>
        ) : (
          <div className="mb-4 space-y-1.5">
            {sorted.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-ink-100 px-3 py-2 hover:bg-ink-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800">{p.name}</p>
                  <p className="text-[11px] text-ink-400">
                    {p.scenarios.length} scenario{p.scenarios.length === 1 ? '' : 's'} · updated {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  title="Load"
                  onClick={() => onLoad(p.id, { plan: p.plan, scenarios: p.scenarios })}
                  className="rounded-md border border-brand-400 px-2 py-1 text-xs font-bold text-brand-600 hover:bg-brand-50"
                >
                  Load
                </button>
                <button
                  title="Rename"
                  onClick={() => {
                    const name = window.prompt('Rename plan:', p.name);
                    if (name?.trim()) renamePlan(p.id, name.trim());
                  }}
                  className="rounded-md px-1.5 py-1 text-xs text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                >
                  ✏️
                </button>
                <button
                  title="Duplicate"
                  onClick={() => duplicatePlan(p.id)}
                  className="rounded-md px-1.5 py-1 text-xs text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                >
                  📋
                </button>
                <button
                  title="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) deletePlan(p.id);
                  }}
                  className="rounded-md px-1.5 py-1 text-xs text-ink-400 hover:bg-red-50 hover:text-red-500"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { onImportFile(); onClose(); }}
          className="w-full rounded-md border border-dashed border-ink-300 py-2 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600"
        >
          📂 Import from a .json plan file…
        </button>
      </div>
    </div>
  );
}
