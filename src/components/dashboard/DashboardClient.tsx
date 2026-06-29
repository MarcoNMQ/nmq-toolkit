'use client';
import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/lib/dashboard/store';
import { CLIENT_CONFIGS } from '@/lib/dashboard/clients';
import PhaseSection from './PhaseSection';
import TrendChart from './TrendChart';
import BreakdownTable from './BreakdownTable';
import AiPanel from './AiPanel';
import type { DashboardFilters } from '@/lib/dashboard/types';

const TREND_METRICS: Array<{ key: DashboardFilters['breakdownDim'] | 'impressions' | 'clicks' | 'spend' | 'cpm' | 'ctr'; label: string }> = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'spend', label: 'Spend' },
  { key: 'cpm', label: 'CPM' },
  { key: 'ctr', label: 'CTR' },
];

type TrendMetric = 'impressions' | 'clicks' | 'spend' | 'cpm' | 'ctr';

export default function DashboardClient() {
  const {
    clientId, filters, totals, byFunnelStage, trend, breakdown,
    availableChannels, availableMarkets, loading, error, refreshedAt,
    setClient, setFilters, fetchData,
  } = useDashboardStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'ai'>('overview');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('impressions');

  const client = CLIENT_CONFIGS[clientId];

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const STAGES = ['awareness', 'consideration', 'conversion'] as const;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="border-b border-ink-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold text-ink-900">Performance Dashboard</h1>
            {refreshedAt && (
              <span className="hidden rounded-full bg-ink-50 px-2 py-0.5 text-[11px] text-ink-400 sm:inline">
                Updated {new Date(refreshedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Client selector */}
            <select
              value={clientId}
              onChange={(e) => setClient(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 shadow-sm focus:outline-none"
            >
              {Object.values(CLIENT_CONFIGS).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-600 shadow-sm hover:bg-ink-50 disabled:opacity-40"
            >
              {loading ? '⟳' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-6 py-6">
        {/* Filters bar */}
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-400">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ dateFrom: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-400">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ dateTo: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>

          {availableMarkets.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-400">Market</label>
              <select
                multiple
                value={filters.markets}
                onChange={(e) =>
                  setFilters({ markets: Array.from(e.target.selectedOptions, (o) => o.value) })
                }
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
                size={1}
              >
                {availableMarkets.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {availableChannels.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-400">Channel</label>
              <select
                multiple
                value={filters.channels}
                onChange={(e) =>
                  setFilters({ channels: Array.from(e.target.selectedOptions, (o) => o.value) })
                }
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:outline-none"
                size={1}
              >
                {availableChannels.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Funnel stage toggles */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-400">Funnel Stage</label>
            <div className="flex gap-1.5">
              {STAGES.map((stage) => {
                const cfg = client?.phases[stage];
                const active = filters.funnelStages.includes(stage);
                return (
                  <button
                    key={stage}
                    onClick={() => {
                      const next = active
                        ? filters.funnelStages.filter((s) => s !== stage)
                        : [...filters.funnelStages, stage];
                      if (next.length) setFilters({ funnelStages: next });
                    }}
                    className="rounded-full px-3 py-1 text-xs font-semibold transition"
                    style={{
                      backgroundColor: active ? cfg?.color : '#f3f4f6',
                      color: active ? '#fff' : '#6b7280',
                    }}
                  >
                    {cfg?.label ?? stage}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear */}
          {(filters.markets.length > 0 || filters.channels.length > 0) && (
            <button
              onClick={() => setFilters({ markets: [], channels: [] })}
              className="self-end text-xs text-ink-400 hover:text-ink-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !totals && (
          <div className="flex h-48 items-center justify-center text-sm text-ink-400">
            Loading data…
          </div>
        )}

        {totals && (
          <>
            {/* Tab nav */}
            <div className="mb-6 flex gap-1 rounded-xl border border-ink-100 bg-white p-1 shadow-sm w-fit">
              {(['overview', 'breakdown', 'ai'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? 'bg-ink-900 text-white shadow-sm'
                      : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {tab === 'ai' ? 'AI Insights' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {STAGES.map((stage) => {
                  const stageKpis = byFunnelStage[stage];
                  if (!stageKpis || !filters.funnelStages.includes(stage)) return null;
                  const phaseCfg = client?.phases[stage];
                  return (
                    <PhaseSection
                      key={stage}
                      phase={stage}
                      label={phaseCfg?.label ?? stage}
                      color={phaseCfg?.color ?? '#888'}
                      kpis={stageKpis}
                    />
                  );
                })}

                {/* Trend */}
                <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-ink-900">Trend Over Time</h3>
                    <div className="flex gap-1">
                      {TREND_METRICS.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setTrendMetric(m.key as TrendMetric)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            trendMetric === m.key
                              ? 'bg-ink-900 text-white'
                              : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrendChart
                    data={trend}
                    metric={trendMetric}
                    color={client?.accentColor ?? '#4F46E5'}
                  />
                </div>
              </div>
            )}

            {/* Breakdown tab */}
            {activeTab === 'breakdown' && (
              <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink-900">
                    Breakdown by {client?.breakdownDimLabel ?? 'Dimension'}
                  </h3>
                  <div className="flex gap-1">
                    {(['category', 'channel', 'market', 'product_family'] as const).map((dim) => (
                      <button
                        key={dim}
                        onClick={() => setFilters({ breakdownDim: dim })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
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
                  dimLabel={client?.breakdownDimLabel ?? 'Dimension'}
                  accent={client?.accentColor ?? '#4F46E5'}
                />
              </div>
            )}

            {/* AI tab */}
            {activeTab === 'ai' && (
              <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
                <AiPanel />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
