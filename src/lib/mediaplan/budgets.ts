import type { GoalConfig, MarketConfig, Scenario } from './types';

/** Market budget = totalBudget × pct/100, raw — NOT normalized against
 *  other markets' percentages. Matches media_plan.py: market split only
 *  ever shows a "doesn't sum to 100%" warning, it never auto-normalizes
 *  (unlike goal/channel split below, which do divide by the actual sum). */
export function marketBudget(scenario: Scenario, market: MarketConfig): number {
  return (scenario.totalBudget * market.pct) / 100;
}

export function marketPctSum(scenario: Scenario): number {
  return scenario.markets.reduce((n, m) => n + m.pct, 0);
}

/** Goal budget = marketBudget × goalPct / (sum of all goalPcts in this
 *  market) — normalized, so goal splits always add up to the full market
 *  budget even if the user's percentages don't sum to exactly 100. */
export function goalBudget(scenario: Scenario, market: MarketConfig, goal: GoalConfig): number {
  if (market.goals.length <= 1) return marketBudget(scenario, market);
  const sum = market.goals.reduce((n, g) => n + g.goalPct, 0) || 1;
  return (marketBudget(scenario, market) * goal.goalPct) / sum;
}

/** Channel budget = goalBudget × splitPct / (sum of all splitPcts for
 *  this goal's channels) — same normalized-split rule as goals. */
export function channelBudget(scenario: Scenario, market: MarketConfig, goal: GoalConfig, channelSplitPct: number): number {
  const gb = goalBudget(scenario, market, goal);
  if (goal.channels.length <= 1) return gb;
  const sum = goal.channels.reduce((n, c) => n + c.splitPct, 0) || 1;
  return (gb * channelSplitPct) / sum;
}

/** Back-solve % from a user-entered € value for a market — mirrors
 *  _sync_bud_to_pct() in media_plan.py. */
export function pctFromMarketBudget(scenario: Scenario, euros: number): number {
  if (scenario.totalBudget <= 0) return 0;
  return (euros / scenario.totalBudget) * 100;
}
