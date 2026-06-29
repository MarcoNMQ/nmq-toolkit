'use client';
import { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/lib/dashboard/store';
import { defaultMetricsForChannels, type MetricKey } from '@/lib/dashboard/metrics';
import PhaseSection from './PhaseSection';
import TrendChart from './TrendChart';
import BreakdownTable from './BreakdownTable';
import MetricPicker from './MetricPicker';
import AiPanel from './AiPanel';
import DataSourcePicker from './DataSourcePicker';
import ColumnMapper from './ColumnMapper';
import type { DashboardFilters } from '@/lib/dashboard/types';
import type { ColumnMapping } from '@/lib/dashboard/columnDetect';

const PHASE_COLORS = {
  awareness:     '#7F77DD',
  consideration: '#1D9E75',
  conversion:    '#D85A30',
};

const PHASE_LABELS = {
  awareness:     'Awareness',
  consideration: 'Consideration',
  conversion:    'Conversion',
};

export default function DashboardClient() {
  const {
    loadStep, dataSource,
    rawColumns, suggestedMapping, unmappedColumns,
    filters, totals, byFunnelStage, trend, breakdown,
    availableChannels, availableMarkets, availableMetrics,
    loadDemo, setIngestData, confirmMapping, resetToPickStep, setFilters,
  } = useDashboardStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
  const [activeTrendMetric, setActiveTrendMetric] = useState<MetricKey>('impressions');

  const prevChannelsRef = useRef<string>('[]');

  // When new data loads, set channel-appropriate metric defaults
  useEffect(() => {
    if (!availableMetrics.length) return;
    const defaults = defaultMetricsForChannels(filters.channels)
      .filter((m) => availableMetrics.includes(m));
    const effective = defaults.length ? defaults : availableMetrics.slice(0, 5);
    setSelectedMetrics(effective);
    setActiveTrendMetric(effective[0] ?? 'impressions');
    prevChannelsRef.current = JSON.stringify(filters.channels);
  }, [availableMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // When channel filter changes (after load), update defaults
  useEffect(() => {
    const channelsStr = JSON.stringify(filters.channels);
    if (channelsStr === prevChannelsRef.current || !availableMetrics.length) return;
    prevChannelsRef.current = channelsStr;
    const defaults = defaultMetricsForChannels(filters.channels)
      .filter((m) => availableMetrics.includes(m));
    if (defaults.length) {
      setSelectedMetrics(defaults);
      setActiveTrendMetric(defaults[0]);
    }
  }, [filters.channels]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMetricsChange(metrics: MetricKey[]) {
    setSelectedMetrics(metrics);
    if (!metrics.includes(activeTrendMetric) && metrics.length) {
      setActiveTrendMetric(metrics[0]);
    }
  }

  const STAGES = ['awareness', 'consideration', 'conversion'] as const;

  // ── Pick step ──────────────────────────────────────────────────────────────
  if (loadStep === 'pick') {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-extrabold text-ink-900">Performance Dashboard</h1>
            <p className="mt-2 text-sm text-ink-500 max-w-md">
              Upload a CSV or XLSX export, or connect a private Google Sheet. We&apos;ll auto-detect your KPI columns.
            </p>
          </div>
          <DataSourcePicker
            onData={(data) => setIngestData({ columns: data.columns, rows: data.rows })}
          />
          <div className="mt-8">
            <button
              onClick={loadDemo}
              className="text-xs text-ink-400 hover:text-ink-700 underline underline-offset-2"
            >
              or explore with demo data →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Map step ───────────────────────────────────────────────────────────────
  if (loadStep === 'map') {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
          <ColumnMapper
            columns={rawColumns}
            initialMapping={suggestedMapping as ColumnMapping[]}
            unmapped={unmappedColumns}
            onConfirm={confirmMapping}
            onBack={resetToPickStep}
          />
        </div>
      </div>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-ink-50">

      {/* Sub-header */}
      <div className="border-b border-ink-100 bg-white px-6 py-2.5">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            {dataSource === 'demo' && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
                Demo data
              </span>
            )}
          </div>
          <button
            onClick={resetToPickStep}
            className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm hover:bg-ink-50"
          >
            ↑ Load new data
          </button>
        </div>
      </div>

      <div className="w-full px-6 py-5">

        {/* Filters bar */}
        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-400">From</label>
            <input
              type="date" value={filters.dateFrom}
              onChange={(e) => setFilters({ dateFrom: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-400">To</label>
            <input
              type="date" value={filters.dateTo}
              onChange={(e) => setFilters({ dateTo: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>

          {availableMarkets.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-400">Market</label>
              <select
                value={filters.markets[0] ?? ''}
                onChange={(e) => setFilters({ markets: e.target.value ? [e.target.value] : [] })}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="">All markets</option>
                {availableMarkets.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {availableChannels.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-400">Channel</label>
              <select
                value={filters.channels[0] ?? ''}
                onChange={(e) => setFilters({ channels: e.target.value ? [e.target.value] : [] })}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="">All channels</option>
                {availableChannels.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-400">Funnel Stage</label>
            <div className="flex gap-1.5">
              {STAGES.map((stage) => {
                const active = filters.funnelStages.includes(stage);
                return (
                  <button
                    key={stage}
                    onClick={() => {
                      const next = active
                        ? filters.funnelStages.filter((s) => s !== stage)
                        : [...filters.funnelStages, stage];
                      if (next.length) setFilters({ funnelStages: next as DashboardFilters['funnelStages'] });
                    }}
                    className="rounded-full px-3 py-1 text-xs font-semibold transition"
                    style={{
                      backgroundColor: active ? PHASE_COLORS[stage] : '#f3f4f6',
                      color: active ? '#fff' : '#6b7280',
                    }}
                  >
                    {PHASE_LABELS[stage]}
                  </button>
                );
              })}
            </div>
          </div>

          {(filters.markets.length > 0 || filters.channels.length > 0) && (
            <button
              onClick={() => setFilters({ markets: [], channels: [] })}
              className="self-end text-xs text-ink-400 hover:text-ink-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tab nav */}
        {totals && (
          <div className="mb-5 flex gap-1 rounded-xl border border-ink-100 bg-white p-1 shadow-sm w-fit">
            {(['overview', 'ai'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {tab === 'ai' ? 'AI Insights' : 'Overview'}
              </button>
            ))}
          </div>
        )}

        {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'overview' && totals && (
          <div className="space-y-5">

            {/* Funnel stage KPI cards */}
            {STAGES.map((stage) => {
              const stageKpis = byFunnelStage[stage];
              if (!stageKpis || !filters.funnelStages.includes(stage)) return null;
              return (
                <PhaseSection
                  key={stage}
                  phase={stage}
                  label={PHASE_LABELS[stage]}
                  color={PHASE_COLORS[stage]}
                  kpis={stageKpis}
                />
              );
            })}

            {/* Trend + Breakdown — unified panel */}
            <div className="rounded-xl border border-ink-100 bg-white shadow-sm overflow-hidden">

              {/* Panel header: title + metric picker */}
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <h3 className="text-sm font-bold text-ink-900">Trend &amp; Breakdown</h3>
                {availableMetrics.length > 0 && (
                  <MetricPicker
                    available={availableMetrics}
                    selected={selectedMetrics}
                    onChange={handleMetricsChange}
                  />
                )}
              </div>

              {/* Trend section */}
              <div className="px-5 pt-4 pb-2">
                {/* Metric pill selector — picks which metric to chart */}
                {selectedMetrics.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {selectedMetrics.map((m) => (
                      <button
                        key={m}
                        onClick={() => setActiveTrendMetric(m)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          activeTrendMetric === m
                            ? 'bg-ink-900 text-white'
                            : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                        }`}
                      >
                        {m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                )}
                <TrendChart data={trend} metric={activeTrendMetric} color="#4F46E5" />
              </div>

              {/* Breakdown table — separated by a subtle divider */}
              <div className="border-t border-ink-50 px-5 pb-5 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Breakdown
                  </h4>
                  <div className="flex gap-1">
                    {(['channel', 'market', 'category', 'product_family'] as const).map((dim) => (
                      <button
                        key={dim}
                        onClick={() => setFilters({ breakdownDim: dim })}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition ${
                          filters.breakdownDim === dim
                            ? 'bg-ink-900 text-white'
                            : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                        }`}
                      >
                        {dim.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <BreakdownTable
                  rows={breakdown}
                  dimLabel={filters.breakdownDim.replace('_', ' ')}
                  metrics={selectedMetrics.length ? selectedMetrics : ['impressions', 'spend', 'clicks', 'ctr', 'cpm']}
                  accent="#4F46E5"
                />
              </div>
            </div>

          </div>
        )}

        {/* ── AI INSIGHTS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'ai' && totals && (
          <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
            <AiPanel />
          </div>
        )}

      </div>
    </div>
  );
}
