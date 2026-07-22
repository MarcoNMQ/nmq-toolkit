'use client';

import { ALL_CHANNELS } from '@/lib/mediaplan/constants';
import { goalBudget } from '@/lib/mediaplan/budgets';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { ChannelSection } from '@/components/mediaplan/ChannelSection';
import { MultiToggle } from '@/components/Field';
import type { Channel, GoalConfig, MarketConfig, Scenario } from '@/lib/mediaplan/types';

export function GoalSection({ scenario, market, goal, audience, industry }: { scenario: Scenario; market: MarketConfig; goal: GoalConfig; audience: string; industry: string }) {
  const setGoalChannels = useMediaPlanStore((s) => s.setGoalChannels);
  const setGoalPct = useMediaPlanStore((s) => s.setGoalPct);
  const addChannelInstance = useMediaPlanStore((s) => s.addChannelInstance);

  const budget = goalBudget(scenario, market, goal);
  // Channel types currently present at least once — each gets an "add another"
  // affordance so e.g. LinkedIn can run as two separate line items (one
  // Sponsored Message, one Lead Gen Form) within the same goal.
  const presentChannelTypes = [...new Set(goal.channels.map((c) => c.channel))];

  return (
    <div className="space-y-2 rounded-md border border-ink-100 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-ink-900">{goal.goal}</span>
        <div className="flex items-center gap-3">
          {market.goals.length > 1 && (
            <label className="flex items-center gap-1 text-xs text-ink-500">
              Goal split %
              <input
                type="number"
                value={goal.goalPct}
                onChange={(e) => setGoalPct(scenario.id, market.market, goal.goal, parseFloat(e.target.value) || 0)}
                className="w-16 rounded-md border border-ink-200 px-1.5 py-0.5 text-xs"
              />
            </label>
          )}
          <span className="text-xs font-bold text-brand-600">€{budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <MultiToggle
        options={[...ALL_CHANNELS]}
        values={presentChannelTypes}
        onChange={(v) => setGoalChannels(scenario.id, market.market, goal.goal, v as Channel[])}
      />

      {presentChannelTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presentChannelTypes.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => addChannelInstance(scenario.id, market.market, goal.goal, ch)}
              className="rounded-md border border-dashed border-ink-300 px-2 py-1 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600"
              title={`Add another ${ch} line item under this goal — e.g. a second LinkedIn entry with a different format`}
            >
              + Add another {ch}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {goal.channels.map((c, i) => (
          <ChannelSection key={c.id} scenario={scenario} market={market} goal={goal} channelIndex={i} audience={audience} industry={industry} />
        ))}
      </div>
    </div>
  );
}
