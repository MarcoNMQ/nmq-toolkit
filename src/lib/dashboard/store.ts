'use client';
import { create } from 'zustand';
import type { DashboardFilters, KpiBlock, TrendPoint, BreakdownRow, AdRow } from './types';
import type { ColumnMapping } from './columnDetect';
import { applyMapping, detectColumns } from './columnDetect';
import { aggregateKpis, aggregateByFunnelStage, buildTrend, buildBreakdown, applyFilters, getAvailableMetrics } from './aggregate';
import type { MetricKey } from './metrics';
import { getDummyRows } from './dummyData';
import { buildPeriodComparison, type CompareMode, type DateRange, type PeriodComparisonResult } from './periodCompare';

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
  // The mapping the user actually confirmed (not just the auto-suggested
  // one, which may have been overridden in the mapper UI) — kept around
  // after reaching 'ready' so an auditable record of "which column became
  // which KPI" survives, e.g. for the Data Notes export slide. null for
  // demo data, which has no raw file to map.
  confirmedMapping: ColumnMapping[] | null;
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
  availableMetrics: MetricKey[];
  // UI state
  loading: boolean;
  error: string | null;
  // AI
  insightsText: string;
  recommendationsText: string;
  aiLoading: boolean;
  compareContext: string | null;

  // Period-over-period comparison ("Previous period" / "Previous year" /
  // "Custom") — separate from the media-plan-vs-actuals Compare tab above.
  periodCompareEnabled: boolean;
  periodCompareMode: CompareMode;
  customCompareFrom: string;
  customCompareTo: string;
  periodComparison: PeriodComparisonResult | null;

  // Actions
  loadDemo: () => void;
  setIngestData: (raw: { columns: string[]; rows: Record<string, string>[] }) => void;
  confirmMapping: (mapping: ColumnMapping[]) => void;
  resetToPickStep: () => void;
  setFilters: (patch: Partial<DashboardFilters>) => void;
  setCompareContext: (ctx: string | null) => void;
  fetchAi: (mode: 'insights' | 'recommendations') => Promise<void>;
  setPeriodCompareEnabled: (enabled: boolean) => void;
  setPeriodCompareMode: (mode: CompareMode) => void;
  setCustomCompareRange: (range: DateRange) => void;
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

function derivePeriodComparison(
  allRows: AdRow[], filters: DashboardFilters, enabled: boolean, mode: CompareMode, customFrom: string, customTo: string,
): PeriodComparisonResult | null {
  if (!enabled) return null;
  const custom = mode === 'custom' ? { from: customFrom, to: customTo } : undefined;
  return buildPeriodComparison(allRows, filters, mode, custom);
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
    availableMetrics: getAvailableMetrics(filtered),
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dataSource: 'demo',
  loadStep: 'pick',
  rawColumns: [],
  rawRows: [],
  suggestedMapping: [],
  unmappedColumns: [],
  confirmedMapping: null,
  allRows: [],
  filters: defaultFilters(),
  totals: null,
  byFunnelStage: {},
  trend: [],
  breakdown: [],
  availableChannels: [],
  availableMarkets: [],
  availableMetrics: [],
  loading: false,
  error: null,
  insightsText: '',
  recommendationsText: '',
  aiLoading: false,
  compareContext: null,

  periodCompareEnabled: false,
  periodCompareMode: 'previous_period',
  customCompareFrom: '',
  customCompareTo: '',
  periodComparison: null,

  loadDemo: () => {
    const allRows = getDummyRows();
    const filters = defaultFilters();
    const { periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo } = get();
    set({
      dataSource: 'demo',
      loadStep: 'ready',
      allRows,
      filters,
      insightsText: '',
      recommendationsText: '',
      ...deriveAggregates(allRows, filters),
      periodComparison: derivePeriodComparison(allRows, filters, periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo),
      confirmedMapping: null,
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
    const { rawRows, filters, periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo } = get();
    const allRows = applyMapping(rawRows, mapping);
    set({
      loadStep: 'ready',
      allRows,
      confirmedMapping: mapping,
      insightsText: '',
      recommendationsText: '',
      ...deriveAggregates(allRows, filters),
      periodComparison: derivePeriodComparison(allRows, filters, periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo),
    });
  },

  resetToPickStep: () => {
    set({ loadStep: 'pick', rawColumns: [], rawRows: [], suggestedMapping: [], unmappedColumns: [], confirmedMapping: null, error: null });
  },

  setFilters: (patch) => {
    const { allRows, periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo } = get();
    const filters = { ...get().filters, ...patch };
    set({
      filters,
      ...deriveAggregates(allRows, filters),
      periodComparison: derivePeriodComparison(allRows, filters, periodCompareEnabled, periodCompareMode, customCompareFrom, customCompareTo),
    });
  },

  setCompareContext: (ctx) => set({ compareContext: ctx }),

  setPeriodCompareEnabled: (enabled) => {
    const { allRows, filters, periodCompareMode, customCompareFrom, customCompareTo } = get();
    set({
      periodCompareEnabled: enabled,
      periodComparison: derivePeriodComparison(allRows, filters, enabled, periodCompareMode, customCompareFrom, customCompareTo),
    });
  },

  setPeriodCompareMode: (mode) => {
    const { allRows, filters, periodCompareEnabled, customCompareFrom, customCompareTo } = get();
    set({
      periodCompareMode: mode,
      periodComparison: derivePeriodComparison(allRows, filters, periodCompareEnabled, mode, customCompareFrom, customCompareTo),
    });
  },

  setCustomCompareRange: (range) => {
    const { allRows, filters, periodCompareEnabled, periodCompareMode } = get();
    set({
      customCompareFrom: range.from,
      customCompareTo: range.to,
      periodComparison: derivePeriodComparison(allRows, filters, periodCompareEnabled, periodCompareMode, range.from, range.to),
    });
  },

  fetchAi: async (mode) => {
    const { filters, totals, byFunnelStage, compareContext } = get();
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
          compareContext: compareContext ?? undefined,
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
