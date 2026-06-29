'use client';

import { useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';

interface GuideStep {
  heading: string;
  steps: string[];
}

const GUIDES: Record<string, GuideStep> = {
  default: {
    heading: 'Getting started',
    steps: [
      'Fill in Campaign name, Audience, Industry, and dates in the sidebar.',
      'Click "+ New Scenario" to create your first budget scenario.',
      'Use the Markets tab to add the markets you\'re running in and set their % budget split.',
      'Within each market, add Goals (Awareness, Traffic, Conversion) and set how much of the market budget each goal gets.',
      'Under each goal, add Channels and set their % split of the goal budget.',
      'The Period Table tab shows your estimated KPIs week by week based on benchmark rates.',
    ],
  },
  scenarios: {
    heading: 'Working with scenarios',
    steps: [
      'A scenario is one version of your media plan — useful for comparing strategies.',
      'Each scenario has its own total budget, markets, goals, and channels.',
      'Click the 📋 icon next to a scenario in the sidebar to duplicate it, then tweak the copy.',
      'The Compare tab lets you see all scenarios side by side.',
      'Export individual scenarios as Google Ads CSV, or export all at once as Excel.',
    ],
  },
  budgets: {
    heading: 'How budgets work',
    steps: [
      'Set the total budget at the scenario level.',
      'Each market gets a % of that total (the market splits must sum to 100%).',
      'Within a market, each goal gets a % of the market budget.',
      'Within a goal, each channel gets a % of the goal budget.',
      'The tool calculates the actual € amount for each channel automatically.',
      'Benchmark KPIs (CPM, CPC, etc.) are then applied to estimate impressions, clicks, and views.',
    ],
  },
  benchmarks: {
    heading: 'Benchmark KPIs',
    steps: [
      'Each channel has a default CPM or CPC based on industry averages.',
      'These are used to estimate reach and performance in the Period Table.',
      'You can edit them via the Benchmark Editor button in the main panel.',
      'Industry benchmarks are pre-filled when you select an industry in the sidebar — but you can always override them.',
      'For YouTube: impressions = budget × 1000 / CPM, views = impressions × VTR.',
      'For Search: clicks = budget / CPC, impressions = clicks / CTR.',
    ],
  },
  export: {
    heading: 'Exporting your plan',
    steps: [
      '"Export Excel" downloads all scenarios into a structured .xlsx with a Summary and Period Table per scenario.',
      '"Export Google Ads CSV" downloads a single scenario formatted for Google Ads Editor import.',
      '"Save plan" saves a .json file you can reload later via "Load plan".',
      'The JSON file preserves everything — scenarios, benchmarks, plan config.',
    ],
  },
};

const GUIDE_MENU = [
  { key: 'default',    label: 'Getting started' },
  { key: 'scenarios',  label: 'Scenarios' },
  { key: 'budgets',    label: 'How budgets work' },
  { key: 'benchmarks', label: 'Benchmarks' },
  { key: 'export',     label: 'Exporting' },
];

export function GuidePanel() {
  const scenarios = useMediaPlanStore((s) => s.scenarios);
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('default');

  const guideKey = !scenarios.length ? 'default' : activeKey;
  const guide = GUIDES[guideKey] ?? GUIDES.default;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white shadow-lg transition hover:bg-brand-600"
        aria-label="Toggle media plan guide"
      >
        {open ? '×' : '?'}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-30 w-80 rounded-xl border border-ink-200 bg-white shadow-2xl overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-mint-600">💡</span>
              <h3 className="text-sm font-extrabold text-ink-900">{guide.heading}</h3>
            </div>
          </div>

          {/* Topic tabs */}
          <div className="flex flex-wrap gap-1 border-b border-ink-100 px-3 py-2">
            {GUIDE_MENU.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveKey(item.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  activeKey === item.key
                    ? 'bg-brand-500 text-white'
                    : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ol className="list-decimal space-y-2 px-4 py-3 pl-8 text-sm text-ink-700">
            {guide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
