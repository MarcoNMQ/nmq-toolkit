'use client';
import type { BreakdownRow } from '@/lib/dashboard/types';
import { METRIC_DEFS, formatMetric, type MetricKey } from '@/lib/dashboard/metrics';

interface BreakdownTableProps {
  rows: BreakdownRow[];
  dimLabel: string;
  metrics: MetricKey[];
  accent?: string;
}

export default function BreakdownTable({ rows, dimLabel, metrics, accent = '#4F46E5' }: BreakdownTableProps) {
  if (!rows.length) return <p className="text-sm text-ink-400">No data</p>;

  const maxSpend = Math.max(...rows.map((r) => r.spend ?? 0), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left">
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {dimLabel}
            </th>
            {metrics.map((m) => (
              <th key={m} className="pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-400 whitespace-nowrap">
                {METRIC_DEFS[m]?.shortLabel ?? m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const barPct = maxSpend > 0 ? ((row.spend ?? 0) / maxSpend) * 100 : 0;
            return (
              <tr key={row.dim} className="border-b border-ink-50 hover:bg-ink-50">
                <td className="py-2.5 pr-4 font-medium text-ink-900">
                  <div className="flex flex-col gap-0.5">
                    <span>{row.dim}</span>
                    <div className="h-1 w-full max-w-[120px] rounded-full bg-ink-100">
                      <div
                        className="h-1 rounded-full opacity-50"
                        style={{ width: `${barPct}%`, backgroundColor: accent }}
                      />
                    </div>
                  </div>
                </td>
                {metrics.map((m) => (
                  <td key={m} className="py-2.5 pr-3 text-right text-ink-700 tabular-nums">
                    {formatMetric(m, row[m])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
