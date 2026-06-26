'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/campaign/store';
import { getGuideContent } from '@/lib/campaign/guideContent';

export function GuidePanel() {
  const platform = useBuilderStore((s) => s.platform);
  const selected = useBuilderStore((s) => s.selected);
  const [open, setOpen] = useState(false);

  const guide = getGuideContent(platform, selected);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white shadow-lg transition hover:bg-brand-600"
        aria-label="Toggle guide"
      >
        {open ? '×' : '?'}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-30 w-80 rounded-lg border border-ink-200 bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-mint-600">💡</span>
            <h3 className="text-sm font-extrabold text-ink-900">{guide.title}</h3>
          </div>
          {guide.steps.length === 0 ? (
            <p className="text-sm text-ink-500">No guidance for this step yet.</p>
          ) : (
            <ol className="list-decimal space-y-2 pl-4 text-sm text-ink-700">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
