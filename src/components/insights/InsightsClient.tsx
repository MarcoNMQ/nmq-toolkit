'use client';
import { useState, useRef } from 'react';
import DataSourcePicker from '@/components/dashboard/DataSourcePicker';
import { detectColumns, applyMapping } from '@/lib/dashboard/columnDetect';
import { aggregateKpis, buildBreakdown, applyFilters } from '@/lib/dashboard/aggregate';
import { formatMetric } from '@/lib/dashboard/metrics';

type Step = 'upload' | 'ready' | 'generating' | 'done';

interface DataSummary {
  rowCount: number;
  dateRange: string;
  channels: string[];
  markets: string[];
  hasFunnelData: boolean;
  context: string;
}

function buildContext(columns: string[], rows: Record<string, string>[]): DataSummary {
  const { mapped } = detectColumns(columns);
  const adRows = applyMapping(rows, mapped);

  if (!adRows.length) {
    const sampleLines = [
      columns.join(', '),
      ...rows.slice(0, 3).map((r) => columns.map((c) => r[c] ?? '').join(', ')),
    ];
    return {
      rowCount: rows.length,
      dateRange: 'unknown',
      channels: [],
      markets: [],
      hasFunnelData: false,
      context: `Raw data (${rows.length} rows, columns: ${columns.join(', ')}):\n${sampleLines.join('\n')}`,
    };
  }

  const dates = adRows.map((r) => r.date).filter(Boolean).sort();
  const dateRange = dates.length
    ? `${dates[0]} to ${dates[dates.length - 1]}`
    : 'unknown date range';
  const channels = [...new Set(adRows.map((r) => r.channel).filter(Boolean) as string[])].sort();
  const markets = [...new Set(adRows.map((r) => r.market).filter(Boolean) as string[])].sort();
  const stages = [...new Set(adRows.map((r) => r.funnel_stage).filter(Boolean))];
  const hasFunnelData = stages.some((s) => s !== 'unknown');

  const totals = aggregateKpis(adRows);
  const byChannel = buildBreakdown(adRows, 'channel');
  const byMarket = buildBreakdown(adRows, 'market');

  const lines: string[] = [
    'PAID MEDIA CAMPAIGN DATA',
    `Date range: ${dateRange}`,
    `Total data rows: ${adRows.length.toLocaleString()}`,
    channels.length ? `Channels: ${channels.join(', ')}` : '',
    markets.length ? `Markets: ${markets.join(', ')}` : '',
    '',
    'OVERALL TOTALS:',
    `Impressions: ${formatMetric('impressions', totals.impressions)}`,
    `Spend: ${formatMetric('spend', totals.spend)}`,
    `Clicks: ${formatMetric('clicks', totals.clicks)}`,
    `CTR: ${formatMetric('ctr', totals.ctr)}`,
    `CPM: ${formatMetric('cpm', totals.cpm)}`,
    `CPC: ${formatMetric('cpc', totals.cpc)}`,
    totals.video_plays ? `Video Plays: ${formatMetric('video_plays', totals.video_plays)}` : '',
    totals.vtr ? `VTR: ${formatMetric('vtr', totals.vtr)}` : '',
    totals.conversions ? `Conversions: ${formatMetric('conversions', totals.conversions)}` : '',
    totals.roas ? `ROAS: ${formatMetric('roas', totals.roas)}` : '',
    totals.revenue ? `Revenue: ${formatMetric('revenue', totals.revenue)}` : '',
  ].filter(Boolean);

  if (byChannel.length > 1) {
    lines.push('', 'BY CHANNEL:');
    for (const row of byChannel) {
      const parts = [
        `${row.dim}:`,
        `${formatMetric('impressions', row.impressions)} impr`,
        `${formatMetric('spend', row.spend)} spend`,
        `CTR ${formatMetric('ctr', row.ctr)}`,
        `CPM ${formatMetric('cpm', row.cpm)}`,
      ];
      if (row.vtr) parts.push(`VTR ${formatMetric('vtr', row.vtr)}`);
      if (row.roas) parts.push(`ROAS ${formatMetric('roas', row.roas)}`);
      lines.push(parts.join(' | '));
    }
  }

  if (byMarket.length > 1) {
    lines.push('', 'BY MARKET:');
    for (const row of byMarket) {
      lines.push(
        `${row.dim}: ${formatMetric('impressions', row.impressions)} impr | ${formatMetric('spend', row.spend)} spend | CTR ${formatMetric('ctr', row.ctr)}`
      );
    }
  }

  if (hasFunnelData) {
    const awareness = applyFilters(adRows, { funnelStages: ['awareness'] });
    const consideration = applyFilters(adRows, { funnelStages: ['consideration'] });
    const conversion = applyFilters(adRows, { funnelStages: ['conversion'] });
    if (awareness.length) {
      const k = aggregateKpis(awareness);
      lines.push('', `AWARENESS PHASE (${awareness.length} rows): ${formatMetric('impressions', k.impressions)} impr | ${formatMetric('spend', k.spend)} | CPM ${formatMetric('cpm', k.cpm)}${k.vtr ? ` | VTR ${formatMetric('vtr', k.vtr)}` : ''}`);
    }
    if (consideration.length) {
      const k = aggregateKpis(consideration);
      lines.push(`CONSIDERATION PHASE (${consideration.length} rows): ${formatMetric('clicks', k.clicks)} clicks | CTR ${formatMetric('ctr', k.ctr)} | CPC ${formatMetric('cpc', k.cpc)}`);
    }
    if (conversion.length) {
      const k = aggregateKpis(conversion);
      lines.push(`CONVERSION PHASE (${conversion.length} rows): ${formatMetric('conversions', k.conversions ?? 0)} conv | ${k.roas ? `ROAS ${formatMetric('roas', k.roas)}` : `CPC ${formatMetric('cpc', k.cpc)}`}`);
    }
  }

  return {
    rowCount: adRows.length,
    dateRange,
    channels,
    markets,
    hasFunnelData,
    context: lines.join('\n'),
  };
}

// Simple section parser for the ## heading structure Claude returns
function parseSections(text: string): Array<{ title: string; content: string }> {
  const raw = text.split(/\n(?=## )/);
  return raw.map((chunk) => {
    const firstBreak = chunk.indexOf('\n');
    const title = chunk.slice(0, firstBreak).replace(/^##\s*/, '').trim();
    const content = chunk.slice(firstBreak + 1).trim();
    return { title, content };
  }).filter((s) => s.title && s.content);
}

// Minimal inline markdown: **bold** and - lists
function renderContent(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm text-ink-700 leading-relaxed">
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ');
        const cleaned = line.replace(/^[-•]\s*/, '').trim();
        const parts = cleaned.split(/\*\*(.+?)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} className="text-ink-900 font-semibold">{p}</strong> : p
        );
        if (isBullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
              <span>{rendered}</span>
            </div>
          );
        }
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

const SECTION_COLORS: Record<string, string> = {
  'Executive Summary': '#7C3AED',
  'Awareness Performance': '#7F77DD',
  'Consideration Performance': '#1D9E75',
  'Conversion Performance': '#D85A30',
  'Top Opportunities': '#0284C7',
  'Watch Points': '#DC2626',
};

export default function InsightsClient() {
  const [step, setStep] = useState<Step>('upload');
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const [insightsText, setInsightsText] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  function handleData(data: { columns: string[]; rows: Record<string, string>[] }) {
    const s = buildContext(data.columns, data.rows);
    setSummary(s);
    setStep('ready');
  }

  async function generate() {
    if (!summary) return;
    setStep('generating');
    setInsightsText('');
    setError('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: summary.context, deepMode }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setInsightsText(text);
      }

      setStep('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('ready');
    }
  }

  function reset() {
    abortRef.current?.abort();
    setStep('upload');
    setSummary(null);
    setInsightsText('');
    setError('');
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={1.75} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.091z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-ink-900">AI Insight Generator</h1>
            <p className="mt-2 text-sm text-ink-500 max-w-md">
              Upload any paid media export and Claude will read it and write you a full strategic analysis — no setup, no filters.
            </p>
          </div>
          <DataSourcePicker onData={handleData} />
        </div>
      </div>
    );
  }

  // ── Ready to generate ──────────────────────────────────────────────────────
  if (step === 'ready' && summary) {
    return (
      <div className="h-full overflow-y-auto bg-ink-50">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-ink-900">Data loaded</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Rows', value: summary.rowCount.toLocaleString() },
                { label: 'Date range', value: summary.dateRange.replace(' to ', ' → ') },
                { label: 'Channels', value: summary.channels.length ? summary.channels.join(', ') : 'n/a' },
                { label: 'Markets', value: summary.markets.length ? summary.markets.join(', ') : 'n/a' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-ink-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink-800 truncate" title={item.value}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">Generate analysis</h2>
                <p className="mt-0.5 text-xs text-ink-400">Claude will write a full strategic breakdown of your data.</p>
              </div>
              {/* Deep mode toggle */}
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <span className="text-xs font-semibold text-ink-500">Deep mode</span>
                <div
                  onClick={() => setDeepMode((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${deepMode ? 'bg-violet-600' : 'bg-ink-200'}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${deepMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-[10px] text-ink-400">{deepMode ? 'Sonnet' : 'Haiku'}</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generate}
                className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition"
              >
                ✦ Generate insights
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-500 hover:bg-ink-50 transition"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Generating (streaming) ─────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="h-full overflow-y-auto bg-ink-50">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-ink-400">Claude is analysing your data…</span>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700 leading-relaxed">
              {insightsText}
              <span className="animate-pulse text-violet-400">▌</span>
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // ── Done — formatted sections ──────────────────────────────────────────────
  const sections = parseSections(insightsText);

  return (
    <div className="h-full overflow-y-auto bg-ink-50">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-ink-400">
              Analysis complete · {deepMode ? 'Sonnet' : 'Haiku'} · {summary?.dateRange}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(insightsText)}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-50 transition"
            >
              Copy text
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-50 transition"
            >
              New analysis
            </button>
          </div>
        </div>

        {/* Section cards */}
        <div className="space-y-4">
          {sections.map((section) => {
            const color = SECTION_COLORS[section.title] ?? '#7C3AED';
            return (
              <div
                key={section.title}
                className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <h3 className="text-sm font-bold text-ink-900">{section.title}</h3>
                </div>
                {renderContent(section.content)}
              </div>
            );
          })}
        </div>

        {/* If parsing failed — fallback to raw */}
        {!sections.length && (
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700 leading-relaxed">
              {insightsText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
