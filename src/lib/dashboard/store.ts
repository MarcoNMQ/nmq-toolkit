'use client';
import { create } from 'zustand';
import type { DashboardFilters, KpiBlock, TrendPoint, BreakdownRow, AdRow } from './types';
import type { ColumnMapping } from './columnDetect';
import { applyMapping, detectColumns } from './columnDetect';
import { aggregateKpis, aggregateByFunnelStage, buildTrend, buildBreakdown, applyFilters } from './aggregate';
import { getDummyRows } from './dummyData';

export type DataSource = 'demo' | 'upload' | 'sheet';
export type LoadStep = 'pick' | 'map' | 'ready';

interface DashboardState {
  // Source & step
  dataSource: DataSource;
  loadStep: LoadStep;
  // Raw ingest data (before mapping confirmed)
  rawColumns: string[];
  rawRows: Record<string, string>[];
  suggestedMapping: ColumnMapping[];
  unmappedColumns: string[];
  // Processed rows
  allRows: AdRow[];
  // Filters
  filters: DashboardFilters;
  // Aggregated outputs
  totals: KpiBlock | null;
  byFunnelStage: Record<string, KpiBlock>;
  trend: TrendPoint[];
  breakdown: BreakdownRow[];
  availableChannels: string[];
  availableMarkets: string[];
  // UI state
  loading: boolean;
  error: string | null;
  // AI
  insightsText: string;
  recommendationsText: string;
  aiLoading: boolean;

  // Actions
  loadDemo: () => void;
  setIngestData: (raw: { columns: string[]; rows: Record<string, string>[] }) => void;
  confirmMapping: (mapping: ColumnMapping[]) => void;
  resetToPickStep: () => void;
  setFilters: (patch: Partial<DashboardFilters>) => void;
  fetchAi: (mode: 'insights' | 'recommendations') => Promise<void>;
}

function defaultFilters(): DashboardFilters {
  const now = new Date();
  return {
    dateFrom: `${now.getFullYear()}-01-01`,
    dateTo: now.toISOString().slice(0, 10),
    platforms: ['meta', 'google_ads'],
    channels: [],
    markets: [],
    funnelStages: ['awareness', 'consideration', 'conversion'],
    breakdownDim: 'category',
  };
}

function deriveAggregates(allRows: AdRow[], filters: DashboardFilters) {
  const filtered = applyFilters(allRows, filters);
  return {
    totals: aggregateKpis(filtered),
    byFunnelStage: aggregateByFunnelStage(filtered),
    trend: buildTrend(filtered),
    breakdown: buildBreakdown(filtered, filters.breakdownDim),
    availableChannels: [...new Set(allRows.map((r) => r.channel).filter(Boolean) as string[])].sort(),
    availableMarkets: [...new Set(allRows.map((r) => r.market).filter(Boolean) as string[])].sort(),
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dataSource: 'demo',
  loadStep: 'pick',
  rawColumns: [],
  rawRows: [],
  suggestedMapping: [],
  unmappedColumns: [],
  allRows: [],
  filters: defaultFilters(),
  totals: null,
  byFunnelStage: {},
  trend: [],
  breakdown: [],
  availableChannels: [],
  availableMarkets: [],
  loading: false,
  error: null,
  insightsText: '',
  recommendationsText: '',
  aiLoading: false,

  loadDemo: () => {
    const allRows = getDummyRows();
    const filters = defaultFilters();
    set({
      dataSource: 'demo',
      loadStep: 'ready',
      allRows,
      filters,
      insightsText: '',
      recommendationsText: '',
      ...deriveAggregates(allRows, filters),
    });
  },

  setIngestData: ({ columns, rows }) => {
    const { mapped, unmapped } = detectColumns(columns);
    set({
      rawColumns: columns,
      rawRows: rows,
      suggestedMapping: mapped,
      unmappedColumns: unmapped,
      loadStep: 'map',
    });
  },

  confirmMapping: (mapping) => {
    const { rawRows, filters } = get();
    const allRows = applyMapping(rawRows, mapping);
    set({
      loadStep: 'ready',
      allRows,
      insightsText: '',
      recommendationsText: '',
      ...deriveAggregates(allRows, filters),
    });
  },

  resetToPickStep: () => {
    set({ loadStep: 'pick', rawColumns: [], rawRows: [], suggestedMapping: [], unmappedColumns: [], error: null });
  },

  setFilters: (patch) => {
    const { allRows } = get();
    const filters = { ...get().filters, ...patch };
    set({ filters, ...deriveAggregates(allRows, filters) });
  },

  fetchAi: async (mode) => {
    const { filters, totals, byFunnelStage } = get();
    if (!totals) return;
    set({ aiLoading: true });
    try {
      const res = await fetch('/api/dashboard/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          client: 'custom',
          kpis: totals,
          byStage: byFunnelStage,
          dateRange: `${filters.dateFrom} to ${filters.dateTo}`,
        }),
      });
      const data = await res.json();
      if (mode === 'insights') set({ insightsText: data.text ?? '' });
      else set({ recommendationsText: data.text ?? '' });
    } finally {
      set({ aiLoading: false });
    }
  },
}));
