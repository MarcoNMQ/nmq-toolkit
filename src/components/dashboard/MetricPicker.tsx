'use client';
import { useState } from 'react';
import { METRIC_DEFS, METRIC_CATEGORIES, type MetricKey } from '@/lib/dashboard/metrics';

interface MetricPickerProps {
  available: MetricKey[];
  selected: MetricKey[];
  onChange: (metrics: MetricKey[]) => void;
}

export default function MetricPicker({ available, selected, onChange }: MetricPickerProps) {
  const [open, setOpen] = useState(false);

  function toggle(key: MetricKey) {
    if (selected.includes(key)) {
      if (selected.length === 1) return; // keep at least one
      onChange(selected.filter((k) => k !== key));
    } else {
      const newSelected = [...selected, key].sort(
        (a, b) => METRIC_DEFS[a].order - METRIC_DEFS[b].order
      );
      onChange(newSelected);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm hover:bg-ink-50 transition"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-ink-400">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </svg>
        Metrics
        <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
          {selected.length}
        </span>
        <svg viewBox="0 0 16 16" fill="currentColor" className={`h-3 w-3 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-ink-100 bg-white p-3 shadow-lg">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Select metrics to display
          </p>
          <div className="space-y-3">
            {METRIC_CATEGORIES.map(({ key: cat, label: catLabel }) => {
              const catMetrics = (Object.entries(METRIC_DEFS) as [MetricKey, typeof METRIC_DEFS[MetricKey]][])
                .filter(([k, def]) => def.category === cat && available.includes(k));
              if (!catMetrics.length) return null;
              return (
                <div key={cat}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-300">{catLabel}</p>
                  <div className="flex flex-wrap gap-1">
                    {catMetrics.map(([key, def]) => {
                      const active = selected.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggle(key)}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            active
                              ? 'bg-ink-900 text-white'
                              : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                          }`}
                        >
                          {def.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-lg bg-ink-50 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
