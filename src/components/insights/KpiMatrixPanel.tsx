'use client';
import { useState } from 'react';

type Badge = 'core' | 'secondary' | 'diagnostic' | 'caution';

interface ChannelGuide {
  channel: string;
  core: string[];
  secondary: string[];
  diagnostic: string[];
  caution?: string[];
}

const KPI_GUIDE: Record<string, ChannelGuide[]> = {
  awareness: [
    {
      channel: 'YouTube / Video',
      core:       ['CPM', 'VTR', 'Video Plays', 'Completions', 'Reach'],
      secondary:  ['Impressions', 'Frequency'],
      diagnostic: ['CTR', 'CPC', 'Clicks'],
    },
    {
      channel: 'Display / GDN',
      core:       ['CPM', 'Reach', 'Frequency'],
      secondary:  ['Impressions'],
      diagnostic: ['CTR', 'CPC'],
    },
    {
      channel: 'Search Brand',
      core:       ['Impressions', 'Impr. Share'],
      secondary:  ['CTR', 'Clicks'],
      diagnostic: ['CPC', 'Conversions'],
    },
    {
      channel: 'LinkedIn',
      core:       ['CPM', 'Reach', 'Engagements'],
      secondary:  ['VTR', 'Impressions', 'Frequency'],
      diagnostic: ['CTR', 'CPC'],
    },
    {
      channel: 'Facebook / Meta',
      core:       ['CPM', 'Reach', 'Video Plays', 'Frequency'],
      secondary:  ['Engagements', 'VTR'],
      diagnostic: ['CTR', 'CPC'],
    },
  ],
  consideration: [
    {
      channel: 'YouTube / Demand Gen',
      core:       ['Clicks', 'CTR', 'CPC', 'LP Views'],
      secondary:  ['Video Plays', 'Impressions'],
      diagnostic: ['Conversions'],
    },
    {
      channel: 'Search Non-Brand',
      core:       ['Clicks', 'CTR', 'CPC', 'Impressions'],
      secondary:  ['LP Views', 'Impr. Share'],
      diagnostic: ['Conversions'],
    },
    {
      channel: 'Display / GDN',
      core:       ['Clicks', 'CTR', 'CPC'],
      secondary:  ['LP Views', 'CPM'],
      diagnostic: ['Conversions'],
    },
    {
      channel: 'LinkedIn',
      core:       ['Engagements', 'CTR', 'CPC', 'Clicks'],
      secondary:  ['LP Views'],
      diagnostic: ['Conversions'],
    },
    {
      channel: 'Facebook / Meta',
      core:       ['Clicks', 'CTR', 'CPC', 'Link Clicks'],
      secondary:  ['LP Views'],
      diagnostic: ['Conversions'],
    },
  ],
  conversion: [
    {
      channel: 'Search / PMax',
      core:       ['CPA', 'Conversions', 'CVR', 'CPC'],
      secondary:  ['ROAS', 'Impr. Share'],
      diagnostic: ['CPM', 'Impressions'],
    },
    {
      channel: 'YouTube Action',
      core:       ['CPA', 'Conversions', 'CVR'],
      secondary:  ['CPC', 'Clicks'],
      diagnostic: ['CPM', 'VTR'],
    },
    {
      channel: 'LinkedIn Lead Gen',
      core:       ['CPA', 'Conversions', 'CVR', 'MQL'],
      secondary:  ['SQL'],
      diagnostic: ['CPM'],
    },
    {
      channel: 'Display Remarketing',
      core:       ['CPA', 'Conversions', 'CVR'],
      secondary:  ['View-through Conv.'],
      caution:    ['View-through Conv.'],
      diagnostic: ['CPM'],
    },
  ],
};

const BADGE_STYLES: Record<Badge, string> = {
  core:       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  secondary:  'bg-blue-50 text-blue-600 border border-blue-200',
  caution:    'bg-amber-50 text-amber-700 border border-amber-200',
  diagnostic: 'bg-ink-100 text-ink-400 border border-ink-200',
};

const PHASE_CONFIG = [
  { key: 'awareness',     label: 'Awareness',     color: '#7F77DD' },
  { key: 'consideration', label: 'Consideration', color: '#1D9E75' },
  { key: 'conversion',    label: 'Conversion',    color: '#D85A30' },
];

function MetricBadge({ label, type }: { label: string; type: Badge }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_STYLES[type]}`}>
      {label}
    </span>
  );
}

interface Props {
  open: boolean;
  onToggle: () => void;
}

export default function KpiMatrixPanel({ open, onToggle }: Props) {
  const [activePhase, setActivePhase] = useState<string>('awareness');
  const channels = KPI_GUIDE[activePhase] ?? [];
  const phaseConfig = PHASE_CONFIG.find((p) => p.key === activePhase)!;

  return (
    <div
      className={`flex-shrink-0 transition-all duration-200 ${open ? 'w-72' : 'w-10'}`}
    >
      {/* Collapsed — just show the toggle tab */}
      {!open && (
        <button
          onClick={onToggle}
          className="flex h-full min-h-32 w-10 items-start justify-center pt-4"
          title="Open KPI Reference"
        >
          <span
            className="flex items-center gap-1.5 rounded-full bg-ink-100 px-2 py-1.5 text-[10px] font-bold text-ink-500 hover:bg-ink-200 transition"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            KPI Guide
          </span>
        </button>
      )}

      {/* Open panel */}
      {open && (
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-500">KPI Reference</h3>
            <button
              onClick={onToggle}
              className="text-ink-300 hover:text-ink-600 transition text-sm leading-none"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Phase tabs */}
          <div className="flex border-b border-ink-100">
            {PHASE_CONFIG.map((p) => (
              <button
                key={p.key}
                onClick={() => setActivePhase(p.key)}
                className={`flex-1 py-2 text-[11px] font-semibold transition ${
                  activePhase === p.key ? 'border-b-2 text-ink-900' : 'text-ink-400 hover:text-ink-700'
                }`}
                style={activePhase === p.key ? { borderColor: p.color, color: p.color } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-1.5 border-b border-ink-50 px-4 py-2.5">
            {(['core', 'secondary', 'diagnostic'] as Badge[]).map((b) => (
              <MetricBadge key={b} label={b.charAt(0).toUpperCase() + b.slice(1)} type={b} />
            ))}
          </div>

          {/* Channel list */}
          <div className="divide-y divide-ink-50 overflow-y-auto max-h-[calc(100vh-18rem)]">
            {channels.map((ch) => (
              <div key={ch.channel} className="px-4 py-3">
                <p className="mb-2 text-[11px] font-bold text-ink-700">{ch.channel}</p>
                <div className="flex flex-wrap gap-1">
                  {ch.core.map((m) => <MetricBadge key={m} label={m} type="core" />)}
                  {ch.secondary.map((m) => <MetricBadge key={m} label={m} type="secondary" />)}
                  {ch.diagnostic.map((m) => <MetricBadge key={m} label={m} type="diagnostic" />)}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="border-t border-ink-50 px-4 py-2.5">
            <p className="text-[10px] text-ink-300 leading-snug">
              Based on NMQ KPI matrix · Source: kpi_matrix.py
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
