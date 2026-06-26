'use client';

import { COL_FMT, PHASE_COLS, channelKeyFor } from '@/lib/mediaplan/constants';
import type { Channel, Goal, LinkedInFormat, PeriodRow } from '@/lib/mediaplan/types';

export function PeriodTable({ rows, channel, goal, liFormat }: { rows: PeriodRow[]; channel: Channel; goal: Goal; liFormat?: LinkedInFormat }) {
  const key = channelKeyFor(channel, liFormat);
  const colOrder = PHASE_COLS[`${key}|${goal}`];
  const cols = (colOrder ?? Object.keys(COL_FMT)).filter((c) => c in COL_FMT);

  return (
    <div className="overflow-x-auto rounded-md border border-ink-100">
      <table className="w-full min-w-max text-xs">
        <thead>
          <tr className="bg-ink-50 text-left text-ink-500">
            <th className="px-2 py-1.5 font-semibold">Period</th>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-1.5 font-semibold">{COL_FMT[c].label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isTotal = row.Period === 'TOTAL';
            return (
              <tr key={i} className={`border-t border-ink-50 ${isTotal ? 'bg-mint-100 font-bold text-ink-900' : 'text-ink-700'}`}>
                <td className="whitespace-nowrap px-2 py-1.5">{row.Period}</td>
                {cols.map((c) => {
                  const raw = (row as unknown as Record<string, number | string>)[c];
                  return (
                    <td key={c} className="whitespace-nowrap px-2 py-1.5">
                      {typeof raw === 'number' ? COL_FMT[c].fmt(raw) : '–'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
