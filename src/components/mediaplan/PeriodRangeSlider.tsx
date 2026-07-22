'use client';

import { useEffect, useState } from 'react';
import type { Period } from '@/lib/mediaplan/types';

// Lets a channel run only across a SUB-RANGE of the plan's periods (e.g. one
// LinkedIn format for the first 2 weeks, a retargeting format for the next
// 2) instead of spreading its budget evenly across the whole flight. Periods
// are discrete units (weeks/months, whatever the plan's breakdown is) with
// uneven day-counts (the last period is often a partial week/month), so this
// is a click-and-drag cell selector snapped to period boundaries — not a
// continuous pixel slider — which sidesteps all the uneven-width math a
// pixel-based range would need.
export function PeriodRangeSlider({
  periods, activeFrom, activeTo, onChange,
}: {
  periods: Period[];
  activeFrom?: string;
  activeTo?: string;
  onChange: (activeFrom?: string, activeTo?: string) => void;
}) {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const hasWindow = !!(activeFrom && activeTo);

  const committedRange = (() => {
    if (!hasWindow) return null;
    const startIdx = periods.findIndex((p) => p.end >= activeFrom!);
    let endIdx = -1;
    for (let i = periods.length - 1; i >= 0; i--) {
      if (periods[i].start <= activeTo!) { endIdx = i; break; }
    }
    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;
    return [startIdx, endIdx] as const;
  })();

  const displayRange = dragStart !== null && dragEnd !== null
    ? [Math.min(dragStart, dragEnd), Math.max(dragStart, dragEnd)] as const
    : committedRange;

  useEffect(() => {
    if (dragStart === null) return;

    function handleMove(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const idxAttr = el?.closest('[data-period-idx]')?.getAttribute('data-period-idx');
      if (idxAttr != null) setDragEnd(Number(idxAttr));
    }
    function handleUp() {
      setDragStart((startAtUp) => {
        setDragEnd((endAtUp) => {
          if (startAtUp !== null && endAtUp !== null) {
            const lo = Math.min(startAtUp, endAtUp);
            const hi = Math.max(startAtUp, endAtUp);
            onChange(periods[lo].start, periods[hi].end);
          }
          return null;
        });
        return null;
      });
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragStart, periods, onChange]);

  if (periods.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink-500">
          Active period{hasWindow ? '' : ' — full flight (drag to set a sub-range)'}
        </span>
        {hasWindow && (
          <button
            type="button"
            onClick={() => onChange(undefined, undefined)}
            className="text-[11px] font-semibold text-brand-600 hover:underline"
          >
            Reset to full flight
          </button>
        )}
      </div>
      <div className="flex select-none overflow-hidden rounded-md border border-ink-200">
        {periods.map((p, i) => {
          const active = displayRange ? i >= displayRange[0] && i <= displayRange[1] : true;
          return (
            <div
              key={i}
              data-period-idx={i}
              onMouseDown={() => { setDragStart(i); setDragEnd(i); }}
              title={p.label}
              className={`flex-1 cursor-pointer border-r border-white/50 px-1 py-1.5 text-center text-[9px] font-semibold leading-tight transition last:border-r-0 ${
                active ? 'bg-violet-500 text-white' : 'bg-ink-100 text-ink-400 hover:bg-ink-200'
              }`}
            >
              {p.label.length > 9 ? `${p.label.slice(0, 8)}…` : p.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
