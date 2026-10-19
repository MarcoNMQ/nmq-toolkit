// Acceptance checks for LinkedIn Video planning metrics (CPV/VTR-driven,
// not CPM-driven like every other impression-based channel). No test
// framework is installed in this repo (no jest/vitest in package.json) —
// this mirrors the sister repo's convention of a standalone verify
// script. Run with: npx tsx scripts/verify-linkedin-video.ts
import { aggregateLinkedInVideoMetrics, calcRow } from '../src/lib/mediaplan/calc';
import type { Scenario } from '../src/lib/mediaplan/types';

let failures = 0;

function approx(actual: number, expected: number, tolerance: number, label: string) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    failures += 1;
    console.error(`FAIL ${label}: expected ${expected}, got ${actual} (diff ${diff})`);
  } else {
    console.log(`PASS ${label}: ${actual}`);
  }
}

function assertUndefined(actual: unknown, label: string) {
  if (actual !== undefined) {
    failures += 1;
    console.error(`FAIL ${label}: expected undefined, got ${actual}`);
  } else {
    console.log(`PASS ${label}: undefined`);
  }
}

// --- Acceptance test 1: UK, LinkedIn Video, budget 4,000 -----------------
{
  const row = calcRow(4000, { cpv: 0.06, view_rate: 0.30, ctr: 0.004, frequency: 3 }, 'Awareness', 'LinkedIn', 0.02, 'Video');
  approx(row.views ?? NaN, 66667, 1, 'views');
  approx(row.impressions ?? NaN, 222222, 1, 'impressions');
  approx(row.eff_cpm ?? NaN, 18.00, 0.01, 'planned CPM');
  approx(row.clicks ?? NaN, 889, 1, 'clicks');
  approx(row.reach ?? NaN, 74074, 1, 'reach');
  approx(row.cpc ?? NaN, 4.50, 0.01, 'CPC');
}

// --- Acceptance test 2: four markets, same CPV, different VTR -------------
{
  const budgets: Record<string, number> = { UK: 4000, NL: 4000, ES: 1250, PL: 1250 };
  const vtrByMarket: Record<string, number> = { UK: 0.30, NL: 0.20, ES: 0.40, PL: 0.25 };
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);

  const scenario: Scenario = {
    id: 's1',
    name: 'Test',
    totalBudget,
    markets: Object.entries(budgets).map(([market, budget]) => ({
      market,
      pct: (budget / totalBudget) * 100,
      expanded: true,
      goals: [{
        goal: 'Awareness',
        goalPct: 100,
        channels: [{
          id: `${market}-li-video`,
          channel: 'LinkedIn',
          splitPct: 100,
          liFormat: 'Video',
          benchmark: { cpv: 0.06, view_rate: vtrByMarket[market] },
        }],
      }],
    })),
  };

  const totals = aggregateLinkedInVideoMetrics(scenario);
  approx(totals.budget, 10500, 0.01, 'blended budget');
  approx(totals.views, 175000, 1, 'blended views');
  approx(totals.cpv, 0.06, 0.0001, 'blended CPV (regardless of VTR)');
}

// --- Acceptance test 3: missing CPV / VTR never produce NaN/Infinity -----
{
  const noCpv = calcRow(4000, { view_rate: 0.30 }, 'Awareness', 'LinkedIn', 0.02, 'Video');
  assertUndefined(noCpv.views, 'views with no CPV');
  assertUndefined(noCpv.impressions, 'impressions with no CPV');

  const noVtr = calcRow(4000, { cpv: 0.06 }, 'Awareness', 'LinkedIn', 0.02, 'Video');
  assertUndefined(noVtr.views, 'views with no VTR');
  assertUndefined(noVtr.impressions, 'impressions with no VTR');

  const zeroCpv = calcRow(4000, { cpv: 0, view_rate: 0.30 }, 'Awareness', 'LinkedIn', 0.02, 'Video');
  assertUndefined(zeroCpv.views, 'views with zero CPV');
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll LinkedIn Video checks passed.');
}
