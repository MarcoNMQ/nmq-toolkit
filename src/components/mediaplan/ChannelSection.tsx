'use client';

import { useMemo } from 'react';
import { buildTable, generatePeriods } from '@/lib/mediaplan/calc';
import { channelBudget } from '@/lib/mediaplan/budgets';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { BenchmarkEditor } from '@/components/mediaplan/BenchmarkEditor';
import { PeriodTable } from '@/components/mediaplan/PeriodTable';
import { Funnel } from '@/components/mediaplan/Funnel';
import { Select } from '@/components/Field';
import type { GoalConfig, LinkedInFormat, MarketConfig, Scenario } from '@/lib/mediaplan/types';

const LI_FORMATS = ['Static', 'Video', 'Carousel', 'Sponsored Message / Conversational Ad', 'Conversation Ad', 'Document Ad', 'Lead Gen Form'] as const;

export function ChannelSection({
  scenario, market, goal, channelIndex, audience, industry,
}: { scenario: Scenario; market: MarketConfig; goal: GoalConfig; channelIndex: number; audience: string; industry: string }) {
  const plan = useMediaPlanStore((s) => s.plan);
  const setChannelSplitPctAndRebalance = useMediaPlanStore((s) => s.setChannelSplitPctAndRebalance);
  const setChannelLiFormat = useMediaPlanStore((s) => s.setChannelLiFormat);
  const removeChannelInstance = useMediaPlanStore((s) => s.removeChannelInstance);
  const channelConfig = goal.channels[channelIndex];

  const budget = channelBudget(scenario, market, goal, channelConfig.splitPct);
  const convRate = channelConfig.benchmark.conv_rate ?? 0.02;

  // Instance label ("#1", "#2") only shown once a channel type appears more
  // than once in this goal — e.g. two separate LinkedIn line items.
  const sameTypeInstances = goal.channels.filter((c) => c.channel === channelConfig.channel);
  const instanceNumber = sameTypeInstances.length > 1 ? sameTypeInstances.indexOf(channelConfig) + 1 : null;

  const rows = useMemo(
    () => {
      const periods = generatePeriods(plan.startDate, plan.endDate, plan.breakdown);
      return buildTable(periods, budget, channelConfig.benchmark, goal.goal, channelConfig.channel, convRate, channelConfig.liFormat);
    },
    [plan.startDate, plan.endDate, plan.breakdown, budget, channelConfig.benchmark, goal.goal, channelConfig.channel, convRate, channelConfig.liFormat],
  );
  const totalRow = rows[rows.length - 1];

  return (
    <div className="space-y-2 rounded-md border border-ink-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink-900">
            {channelConfig.channel}{instanceNumber !== null && ` #${instanceNumber}`}
          </span>
          {channelConfig.channel === 'LinkedIn' && (
            <Select
              value={channelConfig.liFormat ?? 'Static'}
              onChange={(e) => setChannelLiFormat(scenario.id, market.market, goal.goal, channelConfig.id, e.target.value as LinkedInFormat)}
              className="text-xs"
            >
              {LI_FORMATS.map((f) => <option key={f}>{f}</option>)}
            </Select>
          )}
          {goal.channels.length > 1 && (
            <label className="flex items-center gap-1 text-xs text-ink-500">
              Split %
              <input
                type="number"
                value={channelConfig.splitPct}
                onChange={(e) => setChannelSplitPctAndRebalance(scenario.id, market.market, goal.goal, channelConfig.id, parseFloat(e.target.value) || 0)}
                className="w-16 rounded-md border border-ink-200 px-1.5 py-0.5 text-xs"
              />
            </label>
          )}
          {sameTypeInstances.length > 1 && (
            <button
              type="button"
              onClick={() => removeChannelInstance(scenario.id, market.market, goal.goal, channelConfig.id)}
              className="rounded-md px-1.5 py-0.5 text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600"
              title={`Remove this ${channelConfig.channel} line item`}
            >
              ✕
            </button>
          )}
        </div>
        <span className="text-xs font-bold text-mint-600">€{budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>

      <BenchmarkEditor
        scenarioId={scenario.id} market={market.market} goal={goal.goal} channel={channelConfig.channel}
        channelConfig={channelConfig} audience={audience} industry={industry}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="min-w-0">
          <PeriodTable rows={rows} channel={channelConfig.channel} goal={goal.goal} liFormat={channelConfig.liFormat} />
        </div>
        <div className="min-w-0">
          <Funnel totalRow={totalRow} channel={channelConfig.channel} goal={goal.goal} liFormat={channelConfig.liFormat} />
        </div>
      </div>
    </div>
  );
}
