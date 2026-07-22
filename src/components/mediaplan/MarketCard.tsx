'use client';

import { ALL_GOALS, MARKET_LABELS } from '@/lib/mediaplan/constants';
import { marketBudget } from '@/lib/mediaplan/budgets';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { GoalSection } from '@/components/mediaplan/GoalSection';
import { MultiToggle } from '@/components/Field';
import type { Goal, MarketConfig, Scenario } from '@/lib/mediaplan/types';

export function MarketCard({ scenario, market, audience, industry }: { scenario: Scenario; market: MarketConfig; audience: string; industry: string }) {
  const setMarketPct = useMediaPlanStore((s) => s.setMarketPct);
  const setMarketBudgetEuros = useMediaPlanStore((s) => s.setMarketBudgetEuros);
  const toggleMarketExpanded = useMediaPlanStore((s) => s.toggleMarketExpanded);
  const setPinnedMarket = useMediaPlanStore((s) => s.setPinnedMarket);
  const removeMarket = useMediaPlanStore((s) => s.removeMarket);
  const setMarketGoals = useMediaPlanStore((s) => s.setMarketGoals);

  const budget = marketBudget(scenario, market);
  const isPinned = scenario.pinnedMarket === market.market;

  return (
    <div className="rounded-md border border-ink-200 bg-ink-50/40">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => toggleMarketExpanded(scenario.id, market.market)} className="text-ink-400">
          {market.expanded ? '▾' : '▸'}
        </button>
        <span className="text-sm font-bold text-ink-900">
          {MARKET_LABELS[market.market] ?? market.market}
          {MARKET_LABELS[market.market] ? ` (${market.market})` : ''}
        </span>

        <label className="flex items-center gap-1 text-xs text-ink-500">
          %
          <input
            type="number" step="0.5"
            value={Math.round(market.pct * 10) / 10}
            onChange={(e) => setMarketPct(scenario.id, market.market, parseFloat(e.target.value) || 0)}
            className="w-16 rounded-md border border-ink-200 px-1.5 py-0.5 text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-500">
          €
          <input
            type="number" step="100"
            value={Math.round(budget)}
            onChange={(e) => setMarketBudgetEuros(scenario.id, market.market, parseFloat(e.target.value) || 0)}
            className="w-24 rounded-md border border-ink-200 px-1.5 py-0.5 text-xs"
          />
        </label>

        <button
          onClick={() => setPinnedMarket(scenario.id, isPinned ? undefined : market.market)}
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${isPinned ? 'bg-brand-500 text-white' : 'border border-ink-200 text-ink-400 hover:bg-ink-100'}`}
          title="Pin to top"
        >
          📌
        </button>
        <button onClick={() => removeMarket(scenario.id, market.market)} className="ml-auto text-xs text-ink-400 hover:text-red-500" title="Remove market">
          🗑
        </button>
      </div>

      {market.expanded && (
        <div className="space-y-3 border-t border-ink-100 p-3">
          <div>
            <span className="mb-1 block text-xs font-bold text-ink-600">Goals</span>
            <MultiToggle
              options={[...ALL_GOALS]}
              values={market.goals.map((g) => g.goal)}
              onChange={(v) => setMarketGoals(scenario.id, market.market, v as Goal[])}
            />
          </div>

          <div className="space-y-2">
            {market.goals.map((g) => (
              <GoalSection key={g.goal} scenario={scenario} market={market} goal={g} audience={audience} industry={industry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
