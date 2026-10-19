'use client';

import { useState } from 'react';
import { MARKET_GROUPS, MARKET_LABELS } from '@/lib/mediaplan/constants';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import type { Scenario } from '@/lib/mediaplan/types';

export function MarketPicker({ scenario }: { scenario: Scenario }) {
  const addMarket = useMediaPlanStore((s) => s.addMarket);
  const removeMarket = useMediaPlanStore((s) => s.removeMarket);
  const [customLabel, setCustomLabel] = useState('');

  const selected = new Set(scenario.markets.map((m) => m.market));
  // `market` is an opaque string everywhere in the data model/budget math/
  // exports (no country-code union type, all lookups fall back to the raw
  // string) — the ONLY thing making this country-only today is that this
  // picker never offered a way to add anything else. Any non-geo allocation
  // unit (ABM list, "Global", a named audience segment, etc.) is just a
  // custom string market that isn't in MARKET_LABELS.
  const customMarkets = scenario.markets.map((m) => m.market).filter((code) => !MARKET_LABELS[code]);

  function toggle(market: string) {
    if (selected.has(market)) removeMarket(scenario.id, market);
    else addMarket(scenario.id, market);
  }

  // A group button reflects selection state (green when every one of its
  // countries is selected) and toggles as a whole: click again to remove
  // every country it added, instead of only ever adding more.
  function isGroupActive(group: string): boolean {
    const codes = MARKET_GROUPS[group] ?? [];
    return codes.length > 0 && codes.every((c) => selected.has(c));
  }

  function toggleGroup(group: string) {
    const codes = MARKET_GROUPS[group] ?? [];
    if (isGroupActive(group)) {
      codes.forEach((c) => removeMarket(scenario.id, c));
    } else {
      codes.forEach((c) => {
        if (!selected.has(c)) addMarket(scenario.id, c);
      });
    }
  }

  function clearAll() {
    scenario.markets.forEach((m) => removeMarket(scenario.id, m.market));
  }

  function addCustom() {
    const label = customLabel.trim();
    if (!label || selected.has(label)) return;
    addMarket(scenario.id, label);
    setCustomLabel('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.keys(MARKET_GROUPS).map((g) => {
          const active = isGroupActive(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggleGroup(g)}
              title={active ? `Remove all ${g} markets` : `Add all ${g} markets`}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${active ? 'bg-mint-500 text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}
            >
              {active ? g : `+ ${g}`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={clearAll}
          disabled={scenario.markets.length === 0}
          title="Remove every selected market"
          className="ml-auto rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Delete all
        </button>
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
        {customMarkets.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            title={`${code} — non-geographic / custom market. Click to remove.`}
            className="rounded-full bg-violet-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-violet-600"
          >
            {code} ✕
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
          placeholder="Non-geo market — e.g. ABM Company List (US)"
          className="min-w-0 flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs outline-none focus:border-brand-400"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customLabel.trim()}
          className="rounded-md border border-dashed border-ink-300 px-2.5 py-1 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
