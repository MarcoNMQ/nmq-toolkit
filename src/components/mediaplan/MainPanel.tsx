'use client';

import { useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { ScenarioView } from '@/components/mediaplan/ScenarioView';
import { CompareTab } from '@/components/mediaplan/CompareTab';
import { AiPanel } from '@/components/mediaplan/AiPanel';

export function MainPanel() {
  const scenarios = useMediaPlanStore((s) => s.scenarios);
  const activeScenarioId = useMediaPlanStore((s) => s.activeScenarioId);
  const setActiveScenarioId = useMediaPlanStore((s) => s.setActiveScenarioId);
  const addScenario = useMediaPlanStore((s) => s.addScenario);
  const [showCompare, setShowCompare] = useState(false);

  if (scenarios.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-400">
        <p className="text-sm">No scenarios yet.</p>
        <button onClick={() => addScenario()} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
          + New Scenario
        </button>
      </div>
    );
  }

  const active = scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-white px-2 pt-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => { setActiveScenarioId(s.id); setShowCompare(false); }}
            className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-bold transition ${!showCompare && s.id === active.id ? 'bg-ink-50 text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
          >
            {s.name}
          </button>
        ))}
        {scenarios.length > 1 && (
          <button
            onClick={() => setShowCompare(true)}
            className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-bold transition ${showCompare ? 'bg-ink-50 text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
          >
            ⚖ Compare
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto bg-ink-50">
        {showCompare ? <CompareTab scenarios={scenarios} /> : <ScenarioView scenario={active} />}
        <div className="p-4 pt-0">
          <AiPanel scenarios={scenarios} />
        </div>
      </div>
    </div>
  );
}
