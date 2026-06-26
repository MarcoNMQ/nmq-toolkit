'use client';

import { useMemo, useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { aggregateScenarioMetrics } from '@/lib/mediaplan/calc';
import { ADDITIVE, COL_FMT, DONUT_PALETTE } from '@/lib/mediaplan/constants';
import type { Scenario } from '@/lib/mediaplan/types';

const BAR_METRICS = ['impressions', 'reach', 'clicks', 'sessions', 'conversions'];

export function CompareTab({ scenarios }: { scenarios: Scenario[] }) {
  const plan = useMediaPlanStore((s) => s.plan);
  const [selected, setSelected] = useState<Set<string>>(new Set(scenarios.map((s) => s.id)));
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);

  const compareData = scenarios.filter((s) => selected.has(s.id));
  const aggregates = useMemo(() => new Map(compareData.map((s) => [s.id, aggregateScenarioMetrics(s)])), [compareData]);

  if (scenarios.length < 2) {
    return <p className="p-4 text-sm text-ink-400">Fill in at least two scenarios (markets, goals, channels, and budgets) to run a comparison.</p>;
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (compareData.length < 2) {
    return (
      <div className="space-y-3 p-4">
        <ScenarioSelector scenarios={scenarios} selected={selected} toggle={toggle} />
        <p className="text-sm text-ink-400">Select at least two scenarios to compare.</p>
      </div>
    );
  }

  const activeCols = ADDITIVE.filter((c) => c !== 'Budget' && compareData.some((s) => (aggregates.get(s.id)?.[c] ?? 0) > 0));
  const barMetrics = BAR_METRICS.filter((m) => compareData.some((s) => (aggregates.get(s.id)?.[m] ?? 0) > 0));

  async function generateAiCompare() {
    setLoading(true);
    try {
      const res = await fetch('/api/media-plan/ai-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios: compareData, plan }),
      });
      const data = await res.json();
      setAiText(data.text ?? data.error ?? '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 p-4">
      <p className="text-xs text-ink-500">Side-by-side KPI comparison and AI recommendation — budget efficiency, reach, and funnel performance.</p>
      <ScenarioSelector scenarios={scenarios} selected={selected} toggle={toggle} />

      <div>
        <h4 className="mb-2 text-sm font-bold text-ink-900">KPI Summary</h4>
        <div className="overflow-x-auto rounded-md border border-ink-100">
          <table className="w-full min-w-max text-xs">
            <thead>
              <tr className="bg-ink-50 text-left text-ink-500">
                <th className="px-2 py-1.5">Scenario</th>
                <th className="px-2 py-1.5">Budget (€)</th>
                {activeCols.map((c) => <th key={c} className="whitespace-nowrap px-2 py-1.5">{COL_FMT[c].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {compareData.map((s) => {
                const agg = aggregates.get(s.id)!;
                return (
                  <tr key={s.id} className="border-t border-ink-50">
                    <td className="px-2 py-1.5 font-bold">{s.name}</td>
                    <td className="px-2 py-1.5">€{(agg.Budget ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    {activeCols.map((c) => <td key={c} className="whitespace-nowrap px-2 py-1.5">{(agg[c] ?? 0) > 0 ? COL_FMT[c].fmt(agg[c]) : '–'}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-ink-900">Which scenario leads on each KPI?</h4>
        <div className="flex flex-wrap gap-2">
          {activeCols.map((c) => {
            const vals = compareData.map((s) => [s.name, aggregates.get(s.id)?.[c] ?? 0] as const);
            const best = vals.reduce((a, b) => (b[1] > a[1] ? b : a));
            return (
              <div key={c} className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{COL_FMT[c].label}</p>
                <p className="text-xs font-bold text-ink-900">{best[0]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {barMetrics.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-bold text-ink-900">Visual comparison</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barMetrics.map((metric) => {
              const vals = compareData.map((s) => aggregates.get(s.id)?.[metric] ?? 0);
              const max = Math.max(...vals, 1);
              return (
                <div key={metric} className="rounded-md border border-ink-100 p-3">
                  <p className="mb-2 text-center text-xs font-bold text-ink-700">{COL_FMT[metric].label}</p>
                  <div className="space-y-1.5">
                    {compareData.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 truncate text-[10px] text-ink-500" title={s.name}>{s.name}</span>
                        <div className="h-4 flex-1 overflow-hidden rounded-sm bg-ink-50">
                          <div className="h-4 rounded-sm" style={{ width: `${Math.max((vals[i] / max) * 100, 2)}%`, backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
                        </div>
                        <span className="w-14 shrink-0 text-right text-[10px] font-bold text-ink-900">{COL_FMT[metric].fmt(vals[i])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <hr className="border-ink-100" />

      <div>
        <button onClick={generateAiCompare} disabled={loading} className="rounded-md bg-mint-500 px-4 py-2 text-sm font-bold text-white hover:bg-mint-600 disabled:opacity-40">
          {loading ? 'Comparing…' : 'Generate AI Comparison'}
        </button>
        {aiText && <div className="mt-3 whitespace-pre-wrap rounded-md bg-ink-50 p-3 text-sm text-ink-800">{aiText}</div>}
      </div>
    </div>
  );
}

function ScenarioSelector({ scenarios, selected, toggle }: { scenarios: Scenario[]; selected: Set<string>; toggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {scenarios.map((s) => (
        <button
          key={s.id}
          onClick={() => toggle(s.id)}
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${selected.has(s.id) ? 'bg-mint-500 text-white' : 'border border-ink-200 text-ink-500 hover:bg-ink-50'}`}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
