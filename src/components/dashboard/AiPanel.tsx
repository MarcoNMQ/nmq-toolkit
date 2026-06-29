'use client';
import { useDashboardStore } from '@/lib/dashboard/store';

export default function AiPanel() {
  const { insightsText, recommendationsText, aiLoading, fetchAi, totals } = useDashboardStore();
  const disabled = !totals || aiLoading;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-900">Performance Insights</h3>
          <button
            onClick={() => fetchAi('insights')}
            disabled={disabled}
            className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-700 disabled:opacity-40"
          >
            {aiLoading ? 'Generating…' : insightsText ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        {insightsText ? (
          <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
            {insightsText}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 p-4 text-sm text-ink-400">
            Click Generate to get AI-powered insights on the current data view.
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-900">Recommendations</h3>
          <button
            onClick={() => fetchAi('recommendations')}
            disabled={disabled}
            className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-700 disabled:opacity-40"
          >
            {aiLoading ? 'Generating…' : recommendationsText ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        {recommendationsText ? (
          <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
            {recommendationsText}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 p-4 text-sm text-ink-400">
            Click Generate for actionable next-period recommendations.
          </div>
        )}
      </div>
    </div>
  );
}
