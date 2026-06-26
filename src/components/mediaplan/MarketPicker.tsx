'use client';

import { MARKET_GROUPS, MARKET_LABELS } from '@/lib/mediaplan/constants';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import type { Scenario } from '@/lib/mediaplan/types';

export function MarketPicker({ scenario }: { scenario: Scenario }) {
  const addMarket = useMediaPlanStore((s) => s.addMarket);
  const removeMarket = useMediaPlanStore((s) => s.removeMarket);

  const selected = new Set(scenario.markets.map((m) => m.market));

  function toggle(market: string) {
    if (selected.has(market)) removeMarket(scenario.id, market);
    else addMarket(scenario.id, market);
  }

  function applyGroup(group: string) {
    const codes = MARKET_GROUPS[group] ?? [];
    codes.forEach((c) => {
      if (!selected.has(c)) addMarket(scenario.id, c);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(MARKET_GROUPS).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => applyGroup(g)}
            className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-bold text-ink-600 hover:bg-ink-50"
          >
            + {g}
          </button>
        ))}
      </div>
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-ink-100 p-2">
        {Object.entries(MARKET_LABELS).map(([code, label]) => {
          const active = selected.has(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              title={label}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${active ? 'bg-mint-500 text-white' : 'border border-ink-200 text-ink-500 hover:bg-ink-50'}`}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
