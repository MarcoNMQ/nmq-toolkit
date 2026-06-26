'use client';

import { useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { AiChatBox } from '@/components/mediaplan/AiChatBox';
import type { AiChatKind, Scenario } from '@/lib/mediaplan/types';

const TABS: { kind: AiChatKind; label: string; caption: string; placeholder: string }[] = [
  { kind: 'insights', label: 'Plan Insights', caption: 'High-level read of the plan — what the numbers say, what looks strong, what to watch.', placeholder: 'e.g. What if we cut the Netherlands budget by 20%? Which channel is working hardest?' },
  { kind: 'recs', label: 'Market Recommendations', caption: 'Budget allocation recommendations — which markets or channels deserve more weight and why.', placeholder: 'e.g. Should we shift budget from Germany to France? What if we added LinkedIn to the mix?' },
  { kind: 'bench', label: 'Benchmark Explanations', caption: 'Plain-English explanations of the benchmark values used in this plan.', placeholder: 'e.g. Why is Germany CPM higher than Poland? Can I adjust CTR for a B2B audience?' },
];

export function AiPanel({ scenarios }: { scenarios: Scenario[] }) {
  const plan = useMediaPlanStore((s) => s.plan);
  const insightsLast = useMediaPlanStore((s) => s.insightsLast);
  const recsLast = useMediaPlanStore((s) => s.recsLast);
  const setLastText = useMediaPlanStore((s) => s.setLastText);

  const [activeKind, setActiveKind] = useState<AiChatKind>('insights');
  const [scenarioName, setScenarioName] = useState(scenarios[0]?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [benchText, setBenchText] = useState('');

  const scenario = scenarios.find((s) => s.name === scenarioName) ?? scenarios[0];
  const tab = TABS.find((t) => t.kind === activeKind)!;

  async function generate() {
    if (!scenario) return;
    setLoading(true);
    try {
      const res = await fetch('/api/media-plan/ai-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: activeKind, scenario, plan }),
      });
      const data = await res.json();
      if (activeKind === 'bench') setBenchText(data.text ?? data.error ?? '');
      else setLastText(activeKind, data.text ?? data.error ?? '');
    } finally {
      setLoading(false);
    }
  }

  if (!scenario) return null;

  const lastText = activeKind === 'insights' ? insightsLast : activeKind === 'recs' ? recsLast : benchText;

  return (
    <div className="space-y-3 rounded-md border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-ink-900">AI Insights & Recommendations</h3>
        {scenarios.length > 1 && (
          <select value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} className="rounded-md border border-ink-200 px-2 py-1 text-xs">
            {scenarios.map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <p className="text-xs text-ink-400">
        Insights framed for <strong>{plan.audience}</strong> · <strong>{plan.industry || 'n/a'}</strong>
      </p>

      <div className="flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.kind}
            onClick={() => setActiveKind(t.kind)}
            className={`px-3 py-2 text-xs font-bold transition ${activeKind === t.kind ? 'border-b-2 border-brand-500 text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-500">{tab.caption}</p>

      <button onClick={generate} disabled={loading} className="rounded-md bg-mint-500 px-4 py-2 text-sm font-bold text-white hover:bg-mint-600 disabled:opacity-40">
        {loading ? 'Thinking…' : `Generate ${tab.label}`}
      </button>

      {lastText && <div className="whitespace-pre-wrap rounded-md bg-ink-50 p-3 text-sm text-ink-800">{lastText}</div>}

      <hr className="border-ink-100" />
      <AiChatBox kind={activeKind} scenario={scenario} plan={plan} placeholder={tab.placeholder} />
    </div>
  );
}
