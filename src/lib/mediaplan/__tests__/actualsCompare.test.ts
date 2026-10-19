import { describe, expect, it } from 'vitest';
import { compareScenarioToActuals } from '../actualsCompare';
import type { ActualsRow, PlanConfig, Scenario } from '../types';

function makeScenario(totalBudget: number): Scenario {
  return {
    id: 's1',
    name: 'Scenario 1',
    totalBudget,
    markets: [{
      market: 'UK',
      pct: 100,
      expanded: true,
      goals: [{
        goal: 'Awareness',
        goalPct: 100,
        channels: [{
          id: 'uk-yt',
          channel: 'YouTube',
          splitPct: 100,
          benchmark: { cpm: 10, view_rate: 0.3, ctr: 0.003, frequency: 3 },
        }],
      }],
    }],
  };
}

const basePlan: PlanConfig = {
  campaignName: 'Test', audience: 'B2B', industry: '', startDate: '2027-01-01', endDate: '2027-01-31', breakdown: 'Monthly',
};

describe('compareScenarioToActuals', () => {
  it('diffs only the metrics the actuals row actually reported, never inventing reach/views', () => {
    const scenario = makeScenario(1000);
    const row: ActualsRow = {
      id: 'r1', marketRaw: 'UK', market: 'UK', channel: 'YouTube',
      startDate: '2027-01-01', endDate: '2027-01-31', spend: 900,
      metrics: { impressions: 90000, clicks: 250 },
    };

    const result = compareScenarioToActuals(scenario, basePlan, [row]);
    expect(result).toHaveLength(1);
    const comparison = result[0];
    expect(comparison.matchedRowCount).toBe(1);

    const total = comparison.periods.find((p) => p.period === 'TOTAL')!;
    const byKey = (k: string) => total.metrics.find((m) => m.key === k);

    const budget = byKey('Budget')!;
    expect(budget.planned).toBeCloseTo(1000);
    expect(budget.actual).toBeCloseTo(900);
    expect(budget.absDiff).toBeCloseTo(-100);
    expect(budget.pctDiff).toBeCloseTo(-0.1);

    const impressions = byKey('impressions')!;
    expect(impressions.planned).toBeCloseTo(100000);
    expect(impressions.actual).toBeCloseTo(90000);

    const clicks = byKey('clicks')!;
    expect(clicks.planned).toBeCloseTo(300);
    expect(clicks.actual).toBeCloseTo(250);

    // Never reported in the actuals row — must not appear at all.
    expect(byKey('views')).toBeUndefined();
    expect(byKey('reach')).toBeUndefined();

    // Derived rates, only possible because both components were present.
    const ctr = byKey('ctr')!;
    expect(ctr.planned).toBeCloseTo(300 / 100000);
    expect(ctr.actual).toBeCloseTo(250 / 90000);

    const cpc = byKey('cpc')!;
    expect(cpc.planned).toBeCloseTo(1000 / 300);
    expect(cpc.actual).toBeCloseTo(900 / 250);
  });

  it('prorates a multi-week actuals row across periods by day overlap, and totals still add up', () => {
    const scenario = makeScenario(1000);
    const plan: PlanConfig = { ...basePlan, startDate: '2027-01-04', endDate: '2027-01-17', breakdown: 'Weekly' };
    const row: ActualsRow = {
      id: 'r1', marketRaw: 'UK', market: 'UK', channel: 'YouTube',
      startDate: '2027-01-04', endDate: '2027-01-17', spend: 1400,
      metrics: {},
    };

    const result = compareScenarioToActuals(scenario, plan, [row]);
    const comparison = result[0];
    const weekPeriods = comparison.periods.filter((p) => p.period !== 'TOTAL');
    expect(weekPeriods).toHaveLength(2);

    weekPeriods.forEach((p) => {
      const budget = p.metrics.find((m) => m.key === 'Budget')!;
      expect(budget.planned).toBeCloseTo(500);
      expect(budget.actual).toBeCloseTo(700);
    });

    const total = comparison.periods.find((p) => p.period === 'TOTAL')!;
    const totalBudget = total.metrics.find((m) => m.key === 'Budget')!;
    expect(totalBudget.planned).toBeCloseTo(1000);
    expect(totalBudget.actual).toBeCloseTo(1400);
  });

  it('never matches a row from a different market or channel', () => {
    const scenario = makeScenario(1000);
    const rows: ActualsRow[] = [
      { id: 'r1', marketRaw: 'DE', market: 'DE', channel: 'YouTube', startDate: '2027-01-01', endDate: '2027-01-31', spend: 500, metrics: {} },
      { id: 'r2', marketRaw: 'UK', market: 'UK', channel: 'Search', startDate: '2027-01-01', endDate: '2027-01-31', spend: 500, metrics: {} },
    ];
    const result = compareScenarioToActuals(scenario, basePlan, rows);
    expect(result).toHaveLength(0);
  });
});
