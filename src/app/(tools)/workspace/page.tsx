'use client';
import { useState, useRef, useCallback } from 'react';

const TOOLS = [
  { href: '/campaign-builder', label: 'Campaign Builder' },
  { href: '/media-plan',       label: 'Media Plan Builder' },
  { href: '/dashboard',        label: 'Performance Dashboard' },
];

export default function WorkspacePage() {
  const [leftTool, setLeftTool]   = useState('/media-plan');
  const [rightTool, setRightTool] = useState('/dashboard');
  const [splitPct, setSplitPct]   = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => { dragging.current = true; }, []);
  const onMouseUp   = useCallback(() => { dragging.current = false; }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.min(80, Math.max(20, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full select-none overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Left pane */}
      <div className="flex flex-col overflow-hidden" style={{ width: `${splitPct}%` }}>
        <PaneHeader
          value={leftTool}
          onChange={setLeftTool}
          exclude={rightTool}
          label="Left"
        />
        <FrameSet active={leftTool} side="left" />
      </div>

      {/* Resize divider */}
      <div
        className="flex w-1.5 flex-shrink-0 cursor-col-resize flex-col items-center justify-center bg-ink-100 hover:bg-brand-500 transition-colors"
        onMouseDown={onMouseDown}
        title="Drag to resize"
      >
        <div className="flex flex-col gap-0.5">
          {[0,1,2,3,4].map((i) => <div key={i} className="h-1 w-0.5 rounded-full bg-ink-400" />)}
        </div>
      </div>

      {/* Right pane */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <PaneHeader
          value={rightTool}
          onChange={setRightTool}
          exclude={leftTool}
          label="Right"
        />
        <FrameSet active={rightTool} side="right" />
      </div>
    </div>
  );
}

// Renders all three tool iframes at once; only the active one is visible.
// This keeps iframe state alive when the user switches tools in the dropdown.
function FrameSet({ active, side }: { active: string; side: string }) {
  return (
    <div className="relative flex-1 overflow-hidden">
      {TOOLS.map((t) => (
        <iframe
          key={`${side}-${t.href}`}
          src={t.href}
          title={`${side} — ${t.label}`}
          className="absolute inset-0 h-full w-full border-0"
          style={{ visibility: t.href === active ? 'visible' : 'hidden', zIndex: t.href === active ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

function PaneHeader({
  value, onChange, exclude, label,
}: {
  value: string;
  onChange: (v: string) => void;
  exclude: string;
  label: string;
}) {
  const available = TOOLS.filter((t) => t.href !== exclude);
  return (
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-ink-100 bg-ink-50 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-semibold text-ink-700 focus:outline-none"
      >
        {available.map((t) => (
          <option key={t.href} value={t.href}>{t.label}</option>
        ))}
      </select>
      <button
        onClick={() => window.open(value, '_blank')}
        title="Open in new tab"
        className="text-ink-400 hover:text-ink-700 text-xs"
      >
        ↗
      </button>
    </div>
  );
}
