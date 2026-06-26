'use client';

import { useMemo } from 'react';
import { ADDITIVE, COL_FMT } from '@/lib/mediaplan/constants';
import { aggregateScenarioMetrics } from '@/lib/mediaplan/calc';
import type { Scenario } from '@/lib/mediaplan/types';

export function GrandTotals({ scenario }: { scenario: Scenario }) {
  const totals = useMemo(() => aggregateScenarioMetrics(scenario), [scenario]);
  const nonZero = ADDITIVE.filter((c) => (totals[c] ?? 0) > 0);

  if (nonZero.length === 0) return null;

  return (
    <div className="rounded-md border border-brand-100 bg-brand-50 p-3">
      <p className="mb-2 text-xs font-bold text-brand-700">Grand totals — {scenario.name}</p>
      <div className="flex flex-wrap gap-4">
        {nonZero.map((c) => (
          <div key={c}>
            <p className="text-[11px] text-ink-500">{COL_FMT[c].label}</p>
            <p className="text-sm font-bold text-ink-900">{COL_FMT[c].fmt(totals[c])}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
