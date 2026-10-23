import { describe, expect, it } from 'vitest';
import {
  buildPeriodComparison, daysInclusive, getPreviousPeriodRange, getPreviousYearRange, resolveComparisonRange,
} from '../periodCompare';
import type { AdRow, DashboardFilters } from '../types';

function row(overrides: Partial<AdRow>): AdRow {
  return {
    date: '2026-08-01', campaign_name: 'C', platform: 'meta', spend: 0, impressions: 0, clicks: 0,
    ...overrides,
  };
}

const baseFilters: DashboardFilters = {
  dateFrom: '2026-08-01', dateTo: '2026-08-31',
  platforms: ['meta', 'google_ads'], channels: [], markets: [],
  funnelStages: ['awareness', 'consideration', 'conversion'], breakdownDim: 'category',
};

describe('daysInclusive', () => {
  it('counts both endpoints', () => {
    expect(daysInclusive('2026-08-01', '2026-08-01')).toBe(1);
    expect(daysInclusive('2026-08-01', '2026-08-31')).toBe(31);
    expect(daysInclusive('2026-08-01', '2026-08-14')).toBe(14);
  });
});

describe('getPreviousPeriodRange', () => {
  it('covers month-on-month: a calendar month shifts to the prior calendar month', () => {
    expect(getPreviousPeriodRange({ from: '2026-08-01', to: '2026-08-31' })).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('covers week-on-week: a 7-day range shifts to the 7 days immediately before', () => {
    expect(getPreviousPeriodRange({ from: '2026-08-08', to: '2026-08-14' })).toEqual({ from: '2026-08-01', to: '2026-08-07' });
  });

  it('covers bi-week-on-bi-week: a 14-day range shifts to the 14 days immediately before', () => {
    expect(getPreviousPeriodRange({ from: '2026-08-15', to: '2026-08-28' })).toEqual({ from: '2026-08-01', to: '2026-08-14' });
  });

  it('handles a month boundary correctly (no off-by-one across Jan/Feb)', () => {
    expect(getPreviousPeriodRange({ from: '2026-02-01', to: '2026-02-05' })).toEqual({ from: '2026-01-27', to: '2026-01-31' });
  });
});

describe('getPreviousYearRange', () => {
  it('shifts both ends back exactly one year', () => {
    expect(getPreviousYearRange({ from: '2026-08-01', to: '2026-08-31' })).toEqual({ from: '2025-08-01', to: '2025-08-31' });
  });
});

describe('resolveComparisonRange', () => {
  const current = { from: '2026-08-01', to: '2026-08-31' };

  it('returns null for custom mode with no range picked yet', () => {
    expect(resolveComparisonRange(current, 'custom')).toBeNull();
    expect(resolveComparisonRange(current, 'custom', { from: '', to: '' })).toBeNull();
  });

  it('returns the picked range for custom mode once both ends are set', () => {
    expect(resolveComparisonRange(current, 'custom', { from: '2026-01-01', to: '2026-01-31' }))
      .toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });
});

describe('buildPeriodComparison', () => {
  it('computes current vs previous totals and a correct percentage delta', () => {
    const rows: AdRow[] = [
      row({ date: '2026-08-15', spend: 100, impressions: 10000, clicks: 300 }), // current period
      row({ date: '2026-08-01', spend: 50, impressions: 5000, clicks: 100 }),   // previous period
    ];
    const result = buildPeriodComparison(rows, baseFilters, 'previous_period')!;
    expect(result.currentRange).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(result.previousRange).toEqual({ from: '2026-07-01', to: '2026-07-31' });

    // Row 2 (2026-08-01) actually falls INSIDE the current filter range, not
    // the previous one — rebuild with a row genuinely in July to test a
    // real previous-period value.
    const rows2: AdRow[] = [
      row({ date: '2026-08-15', spend: 100, impressions: 10000, clicks: 300 }),
      row({ date: '2026-07-15', spend: 50, impressions: 5000, clicks: 100 }),
    ];
    const result2 = buildPeriodComparison(rows2, baseFilters, 'previous_period')!;
    const spendDelta = result2.deltas.spend!;
    expect(spendDelta.current).toBe(100);
    expect(spendDelta.previous).toBe(50);
    expect(spendDelta.absDelta).toBe(50);
    expect(spendDelta.pctDelta).toBeCloseTo(1.0); // +100%
  });

  it('returns pctDelta: null when the previous period was zero, never Infinity', () => {
    const rows: AdRow[] = [row({ date: '2026-08-15', spend: 100, impressions: 1000, clicks: 10 })];
    const result = buildPeriodComparison(rows, baseFilters, 'previous_period')!;
    const spendDelta = result.deltas.spend!;
    expect(spendDelta.previous).toBe(0);
    expect(spendDelta.pctDelta).toBeNull();
    expect(Number.isFinite(spendDelta.absDelta)).toBe(true);
  });

  it('omits a metric entirely when both periods are zero for it', () => {
    const rows: AdRow[] = [row({ date: '2026-08-15', spend: 100, impressions: 1000, clicks: 10 })];
    const result = buildPeriodComparison(rows, baseFilters, 'previous_period')!;
    expect(result.deltas.revenue).toBeUndefined();
  });

  it('returns null for custom mode until both dates are picked', () => {
    const rows: AdRow[] = [row({ date: '2026-08-15', spend: 100, impressions: 1000, clicks: 10 })];
    expect(buildPeriodComparison(rows, baseFilters, 'custom')).toBeNull();
    expect(buildPeriodComparison(rows, baseFilters, 'custom', { from: '2026-01-01', to: '' })).toBeNull();
  });

  it('respects the dashboard\'s own non-date filters (e.g. platform) in both periods', () => {
    const rows: AdRow[] = [
      row({ date: '2026-08-15', platform: 'meta', spend: 100, impressions: 1000, clicks: 10 }),
      row({ date: '2026-08-15', platform: 'google_ads', spend: 999, impressions: 9999, clicks: 99 }),
      row({ date: '2026-07-15', platform: 'meta', spend: 40, impressions: 400, clicks: 4 }),
      row({ date: '2026-07-15', platform: 'google_ads', spend: 888, impressions: 8888, clicks: 88 }),
    ];
    const metaOnlyFilters: DashboardFilters = { ...baseFilters, platforms: ['meta'] };
    const result = buildPeriodComparison(rows, metaOnlyFilters, 'previous_period')!;
    expect(result.deltas.spend!.current).toBe(100);
    expect(result.deltas.spend!.previous).toBe(40);
  });
});
