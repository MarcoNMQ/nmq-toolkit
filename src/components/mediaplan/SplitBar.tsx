'use client';

import { useRef, useState } from 'react';

// Cycled by segment index — enough distinct hues that adjacent segments
// (including duplicate-channel-type instances) are always visually distinct.
const SEGMENT_COLORS = ['#2BB5A5', '#2E75B6', '#7C3AED', '#D97706', '#DC2626', '#0EA5E9', '#65A30D', '#DB2777'];

export interface SplitSegment {
  id: string;
  label: string;
  pct: number;
  amount: number;
}

// A horizontal proportional bar with a draggable handle between each pair of
// adjacent segments. Dragging a handle reallocates % only between the two
// segments it borders (their combined share stays fixed), so the whole bar
// always sums to the same total — no normalization step needed after a drag.
// This is the multi-channel generalization of the old Streamlit tool's
// two-sided budget slider (which only ever worked for exactly 2 channels).
export function SplitBar({ segments, onChange }: { segments: SplitSegment[]; onChange: (updates: Record<string, number>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (segments.length === 0) return null;

  const total = segments.reduce((n, s) => n + s.pct, 0) || 1;

  function handlePointerDown(i: number) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragIndex(i);
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragIndex === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

    const prevCum = segments.slice(0, dragIndex).reduce((n, s) => n + s.pct, 0);
    const combined = segments[dragIndex].pct + segments[dragIndex + 1].pct;
    let leftPct = f * total - prevCum;
    leftPct = Math.min(combined, Math.max(0, leftPct));
    const rightPct = combined - leftPct;

    onChange({
      [segments[dragIndex].id]: Math.round(leftPct * 10) / 10,
      [segments[dragIndex + 1].id]: Math.round(rightPct * 10) / 10,
    });
  }

  function endDrag() {
    setDragIndex(null);
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative flex h-8 w-full select-none overflow-hidden rounded-md border border-ink-200"
      >
        {segments.map((s, i) => (
          <div
            key={s.id}
            style={{ width: `${(s.pct / total) * 100}%`, backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            className="relative flex items-center justify-center transition-[width] duration-75"
            title={`${s.label}: ${s.pct.toFixed(0)}%`}
          >
            {i < segments.length - 1 && (
              <div
                onPointerDown={handlePointerDown(i)}
                className="absolute right-0 top-0 z-10 -mr-1.5 h-full w-3 cursor-col-resize touch-none"
              >
                <div className="mx-auto h-full w-0.5 bg-white/70" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1 text-[11px] font-semibold text-ink-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
            {s.label}: {s.pct.toFixed(0)}% (€{s.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })})
          </span>
        ))}
      </div>
    </div>
  );
}
