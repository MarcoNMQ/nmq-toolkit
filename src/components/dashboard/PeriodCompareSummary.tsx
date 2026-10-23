'use client';
import { METRIC_DEFS, formatMetric, type MetricKey } from '@/lib/dashboard/metrics';
import type { PeriodComparisonResult } from '@/lib/dashboard/periodCompare';

// A curated, stable set rather than every available metric — keeps the
// strip readable regardless of which channels are in the data.
const SUMMARY_METRICS: MetricKey[] = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions'];

function fmtPct(p: number | null): string {
  if (p === null) return 'n/a';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${(p * 100).toFixed(1)}%`;
}

export default function PeriodCompareSummary({ result }: { result: PeriodComparisonResult }) {
  const metrics = SUMMARY_METRICS.filter((m) => result.deltas[m]);
  if (metrics.length === 0) return null;

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
        <h3 className="text-sm font-bold text-ink-900">Period comparison</h3>
        <p className="text-xs text-ink-400">
          {result.currentRange.from} to {result.currentRange.to} vs {result.previousRange.from} to {result.previousRange.to}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((key) => {
          const d = result.deltas[key]!;
          const up = d.absDelta > 0;
          const flat = d.absDelta === 0;
          return (
            <div key={key} className="rounded-lg border border-ink-50 bg-ink-50 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{METRIC_DEFS[key].shortLabel}</p>
              <p className="mt-1 text-lg font-extrabold text-ink-900">{formatMetric(key, d.current)}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-500">
                {flat ? '—' : up ? '▲' : '▼'} {fmtPct(d.pctDelta)}
                <span className="ml-1 font-normal text-ink-400">vs {formatMetric(key, d.previous)}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
