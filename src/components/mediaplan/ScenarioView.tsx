'use client';

import { useState } from 'react';
import { marketPctSum } from '@/lib/mediaplan/budgets';
import { PLAN_TEMPLATES } from '@/lib/mediaplan/constants';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { MarketCard } from '@/components/mediaplan/MarketCard';
import { MarketPicker } from '@/components/mediaplan/MarketPicker';
import { GrandTotals } from '@/components/mediaplan/GrandTotals';
import { Field, Select, TextInput } from '@/components/Field';
import type { Scenario } from '@/lib/mediaplan/types';

export function ScenarioView({ scenario }: { scenario: Scenario }) {
  const plan = useMediaPlanStore((s) => s.plan);
  const setScenarioBudget = useMediaPlanStore((s) => s.setScenarioBudget);
  const applyTemplate = useMediaPlanStore((s) => s.applyTemplate);
  const [templateName, setTemplateName] = useState('');

  const pctSum = marketPctSum(scenario);
  const sumOk = Math.abs(pctSum - 100) <= 0.5;

  // Pinned market's KPIs, shown in a sticky bar — mirrors media_plan.py's
  // cached_kpis_ / pinned_country_ behavior.
  const pinned = scenario.markets.find((m) => m.market === scenario.pinnedMarket);

  return (
    <div className="space-y-4 p-4">
      {pinned && (
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-ink-100 bg-white/95 px-4 py-2 text-xs font-semibold text-ink-700 backdrop-blur">
          📌 Pinned: {pinned.market} — {pinned.goals.length} goal{pinned.goals.length === 1 ? '' : 's'}, {pinned.goals.reduce((n, g) => n + g.channels.length, 0)} channel{pinned.goals.reduce((n, g) => n + g.channels.length, 0) === 1 ? '' : 's'}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="max-w-xs">
          <Field label="Total budget (€)">
            <TextInput
              type="number" step="100" min="0"
              value={scenario.totalBudget}
              // Blocking '-'/'e' at the keystroke level (not just clamping after
              // the fact) matters here: parseFloat('-') is NaN, so the old
              // "|| 0" fallback fired mid-keystroke and React force-synced the
              // input's DOM value back to "0" — the next digit typed then
              // appended AFTER that stray 0 (typing "-500" produced "0500").
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
              onChange={(e) => setScenarioBudget(scenario.id, Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </Field>
        </div>
        <div className="max-w-xs flex-1">
          <Field label="Start from a template" hint="Overwrites this scenario's markets, budget, goals and channels">
            <div className="flex gap-2">
              <Select value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="flex-1">
                <option value="">— Choose a template —</option>
                {Object.keys(PLAN_TEMPLATES).map((name) => <option key={name}>{name}</option>)}
              </Select>
              <button
                disabled={!templateName}
                onClick={() => { applyTemplate(scenario.id, PLAN_TEMPLATES[templateName]); setTemplateName(''); }}
                className="rounded-md bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold text-ink-600">Markets</p>
        <MarketPicker scenario={scenario} />
      </div>

      {scenario.markets.length > 0 && (
        <p className={`text-xs font-semibold ${sumOk ? 'text-mint-600' : 'text-amber-600'}`}>
          {sumOk ? `✓ €${scenario.totalBudget.toLocaleString()} allocated` : `Split: ${pctSum.toFixed(1)}% — adjust to 100%`}
        </p>
      )}

      <div className="space-y-3">
        {scenario.markets.map((m) => (
          <MarketCard key={m.market} scenario={scenario} market={m} audience={plan.audience} industry={plan.industry} />
        ))}
      </div>

      <GrandTotals scenario={scenario} />
    </div>
  );
}
