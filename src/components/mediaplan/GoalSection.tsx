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

  const budget = goalBudget(scenario, market, goal);

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
        values={goal.channels.map((c) => c.channel)}
        onChange={(v) => setGoalChannels(scenario.id, market.market, goal.goal, v as Channel[])}
      />

      <div className="space-y-2">
        {goal.channels.map((_, i) => (
          <ChannelSection key={goal.channels[i].channel} scenario={scenario} market={market} goal={goal} channelIndex={i} audience={audience} industry={industry} />
        ))}
      </div>
    </div>
  );
}
