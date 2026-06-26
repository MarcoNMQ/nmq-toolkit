'use client';

import { useRef, useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { importLegacyPlan, isLegacyPlanFile } from '@/lib/mediaplan/legacyImport';
import { Field, Select, TextInput } from '@/components/Field';

export function Sidebar() {
  const plan = useMediaPlanStore((s) => s.plan);
  const setPlan = useMediaPlanStore((s) => s.setPlan);
  const scenarios = useMediaPlanStore((s) => s.scenarios);
  const activeScenarioId = useMediaPlanStore((s) => s.activeScenarioId);
  const setActiveScenarioId = useMediaPlanStore((s) => s.setActiveScenarioId);
  const addScenario = useMediaPlanStore((s) => s.addScenario);
  const duplicateScenario = useMediaPlanStore((s) => s.duplicateScenario);
  const removeScenario = useMediaPlanStore((s) => s.removeScenario);
  const renameScenario = useMediaPlanStore((s) => s.renameScenario);
  const loadPlan = useMediaPlanStore((s) => s.loadPlan);
  const clearAll = useMediaPlanStore((s) => s.clearAll);
  const mobileSidebarOpen = useMediaPlanStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useMediaPlanStore((s) => s.setMobileSidebarOpen);
  const [exporting, setExporting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function savePlanJson() {
    const blob = new Blob([JSON.stringify({ plan, scenarios }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(plan.campaignName || 'media_plan').replace(/[^a-z0-9]+/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadPlanJson(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (isLegacyPlanFile(data)) {
        loadPlan(importLegacyPlan(data));
        return;
      }
      if (!data.plan || !Array.isArray(data.scenarios)) throw new Error('Not a valid media plan file.');
      loadPlan(data);
    } catch (e) {
      window.alert(`Couldn't load this file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function downloadExcel() {
    setExporting('excel');
    try {
      const res = await fetch('/api/media-plan/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios, plan }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(plan.campaignName || 'media_plan').replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function downloadGads(scenario: typeof scenarios[number]) {
    setExporting(`gads-${scenario.id}`);
    try {
      const res = await fetch('/api/media-plan/export-gads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, plan }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `google_ads_${scenario.name.replace(/[^a-z0-9]+/gi, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-ink-100 bg-white transition-transform duration-200 md:relative md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
      <div className="border-b border-ink-100 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-base font-extrabold tracking-tight text-ink-900">NMQ Media Plan Builder</span>
          <button className="rounded-md p-1 text-ink-400 hover:bg-ink-50 md:hidden" onClick={() => setMobileSidebarOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={savePlanJson} disabled={scenarios.length === 0} className="flex-1 rounded-md border border-ink-200 py-1 font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40">
            💾 Save plan
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-md border border-ink-200 py-1 font-semibold text-ink-600 hover:bg-ink-50">
            📂 Load plan
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) loadPlanJson(e.target.files[0]); e.target.value = ''; }}
          />
        </div>
      </div>

      <div className="space-y-3 border-b border-ink-100 p-4">
        <Field label="Campaign name">
          <TextInput value={plan.campaignName} onChange={(e) => setPlan({ campaignName: e.target.value })} placeholder="Q3 EU Lead Gen" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Audience">
            <Select value={plan.audience} onChange={(e) => setPlan({ audience: e.target.value as 'B2B' | 'B2C' })}>
              <option>B2B</option>
              <option>B2C</option>
            </Select>
          </Field>
          <Field label="Industry">
            <TextInput value={plan.industry} onChange={(e) => setPlan({ industry: e.target.value })} placeholder="e.g. Fintech" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start date">
            <TextInput type="date" value={plan.startDate} onChange={(e) => setPlan({ startDate: e.target.value })} />
          </Field>
          <Field label="End date">
            <TextInput type="date" value={plan.endDate} onChange={(e) => setPlan({ endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Breakdown">
          <Select value={plan.breakdown} onChange={(e) => setPlan({ breakdown: e.target.value as typeof plan.breakdown })}>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Bi-Weekly</option>
            <option>Monthly</option>
          </Select>
        </Field>
      </div>

      <div className="p-3">
        <button
          className="w-full rounded-md bg-brand-500 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
          onClick={() => addScenario()}
        >
          + New Scenario
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {scenarios.length === 0 && <p className="px-2 py-4 text-sm text-ink-400">No scenarios yet.</p>}
        {scenarios.map((s) => {
          const isActive = s.id === activeScenarioId;
          return (
            <div
              key={s.id}
              className={`group mb-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition ${isActive ? 'bg-mint-100 font-semibold text-ink-900' : 'text-ink-700 hover:bg-ink-50'}`}
            >
              <input
                value={s.name}
                onChange={(e) => renameScenario(s.id, e.target.value)}
                onFocus={() => setActiveScenarioId(s.id)}
                className="flex-1 truncate bg-transparent outline-none"
              />
              <button className="opacity-0 group-hover:opacity-100" title="Duplicate" onClick={() => duplicateScenario(s.id)}>📋</button>
              <button className="opacity-0 group-hover:opacity-100" title="Delete" onClick={() => removeScenario(s.id)}>🗑</button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-ink-100 p-3">
        <button
          disabled={exporting !== null || scenarios.length === 0}
          onClick={downloadExcel}
          className="w-full rounded-md border-2 border-brand-500 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white disabled:opacity-40"
        >
          {exporting === 'excel' ? 'Exporting…' : 'Export Excel (all scenarios)'}
        </button>
        {scenarios.map((s) => (
          <button
            key={s.id}
            disabled={exporting !== null}
            onClick={() => downloadGads(s)}
            className="mt-2 w-full rounded-md border border-ink-200 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
          >
            {exporting === `gads-${s.id}` ? 'Exporting…' : `Export Google Ads CSV — ${s.name}`}
          </button>
        ))}
        <button
          onClick={() => {
            if (window.confirm('Clear all scenarios and plan config? This cannot be undone.')) clearAll();
          }}
          className="mt-2 w-full text-xs font-medium text-ink-400 hover:text-red-500 hover:underline"
        >
          Clear all data
        </button>
      </div>
      </aside>
    </>
  );
}
