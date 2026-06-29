'use client';
import type { BreakdownRow } from '@/lib/dashboard/types';

function fmt(n: number | undefined, type: 'int' | 'eur' | 'pct' | 'dec'): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  switch (type) {
    case 'int': return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
    case 'eur': return `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'pct': return `${(n * 100).toFixed(2)}%`;
    case 'dec': return n.toFixed(2);
  }
}

interface BreakdownTableProps {
  rows: BreakdownRow[];
  dimLabel: string;
  accent?: string;
}

export default function BreakdownTable({ rows, dimLabel, accent = '#4F46E5' }: BreakdownTableProps) {
  if (!rows.length) return <p className="text-sm text-ink-400">No data</p>;

  const maxImpr = Math.max(...rows.map((r) => r.impressions));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left">
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {dimLabel}
            </th>
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400 text-right">Impressions</th>
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400 text-right">Clicks</th>
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400 text-right">CTR</th>
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400 text-right">CPM</th>
            <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-400 text-right">CPC</th>
            <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-ink-400 text-right">Spend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const barPct = maxImpr > 0 ? (row.impressions / maxImpr) * 100 : 0;
            return (
              <tr key={row.dim} className="border-b border-ink-50 hover:bg-ink-50">
                <td className="py-2.5 pr-4 font-medium text-ink-900">
                  <div className="flex flex-col gap-0.5">
                    <span>{row.dim}</span>
                    <div className="h-1 w-full rounded-full bg-ink-100">
                      <div
                        className="h-1 rounded-full opacity-60"
                        style={{ width: `${barPct}%`, backgroundColor: accent }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-right text-ink-700">{fmt(row.impressions, 'int')}</td>
                <td className="py-2.5 pr-4 text-right text-ink-700">{fmt(row.clicks, 'int')}</td>
                <td className="py-2.5 pr-4 text-right text-ink-700">{fmt(row.ctr, 'pct')}</td>
                <td className="py-2.5 pr-4 text-right text-ink-700">{fmt(row.cpm, 'eur')}</td>
                <td className="py-2.5 pr-4 text-right text-ink-700">{fmt(row.cpc, 'eur')}</td>
                <td className="py-2.5 text-right text-ink-700">{fmt(row.spend, 'eur')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
