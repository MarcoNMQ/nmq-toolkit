'use client';
import type { CompareRow } from '@/lib/dashboard/mediaPlanTypes';

const PHASE_COLORS: Record<string, string> = {
  awareness: '#10b981',
  consideration: '#3b82f6',
  conversion: '#f97316',
};

function fmtEur(n: number) {
  return `€${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function PacingBar({ pacing }: { pacing: number }) {
  const pct = Math.min(pacing * 100, 150); // cap visual at 150%
  const over = pacing > 1.05;
  const under = pacing < 0.8;
  const color = over ? '#f97316' : under ? '#6b7280' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 overflow-hidden rounded-full bg-ink-100" style={{ height: 6 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold" style={{ color }}>
        {(pacing * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function CompareTable({ rows }: { rows: CompareRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100">
            <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-400">Channel</th>
            <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-400">Phase</th>
            <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-400">Planned</th>
            <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-400">Actual</th>
            <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-400">Variance</th>
            <th className="pb-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-400">Pacing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const variance = row.actualSpend - row.plannedSpend;
            return (
              <tr key={row.key} className="border-b border-ink-50 hover:bg-ink-50/50">
                <td className="py-2.5 pr-4 font-semibold text-ink-900">{row.channelLabel}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                    style={{
                      backgroundColor: `${PHASE_COLORS[row.phase] ?? '#6b7280'}18`,
                      color: PHASE_COLORS[row.phase] ?? '#6b7280',
                    }}
                  >
                    {row.phase}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-xs text-ink-600">{fmtEur(row.plannedSpend)}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-xs font-semibold text-ink-900">{fmtEur(row.actualSpend)}</td>
                <td className={`py-2.5 pr-4 text-right font-mono text-xs font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-ink-400'}`}>
                  {variance >= 0 ? '+' : ''}{fmtEur(variance)}
                </td>
                <td className="py-2.5 pl-4" style={{ minWidth: 120 }}>
                  <PacingBar pacing={row.pacing} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
