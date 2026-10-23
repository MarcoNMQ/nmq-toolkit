'use client';
import { useDashboardStore } from '@/lib/dashboard/store';
import type { CompareMode } from '@/lib/dashboard/periodCompare';

const MODE_LABELS: Record<CompareMode, string> = {
  previous_period: 'Previous period',
  previous_year: 'Previous year',
  custom: 'Custom',
};

export default function PeriodCompareControl() {
  const {
    periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo,
    setPeriodCompareEnabled, setPeriodCompareMode, setCustomCompareRange,
  } = useDashboardStore();

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-400">
        <input
          type="checkbox"
          checked={periodCompareEnabled}
          onChange={(e) => setPeriodCompareEnabled(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-ink-300"
        />
        Compare
      </label>
      {periodCompareEnabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={periodCompareMode}
            onChange={(e) => setPeriodCompareMode(e.target.value as CompareMode)}
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs focus:outline-none"
          >
            {(Object.keys(MODE_LABELS) as CompareMode[]).map((m) => (
              <option key={m} value={m}>{MODE_LABELS[m]}</option>
            ))}
          </select>
          {periodCompareMode === 'custom' && (
            <>
              <input
                type="date"
                value={customCompareFrom}
                onChange={(e) => setCustomCompareRange({ from: e.target.value, to: customCompareTo })}
                className="rounded-lg border border-ink-200 px-2 py-1 text-xs focus:outline-none"
              />
              <span className="text-xs text-ink-300">to</span>
              <input
                type="date"
                value={customCompareTo}
                onChange={(e) => setCustomCompareRange({ from: customCompareFrom, to: e.target.value })}
                className="rounded-lg border border-ink-200 px-2 py-1 text-xs focus:outline-none"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
