'use client';
import { create } from 'zustand';
import type { DashboardFilters, KpiBlock, TrendPoint, BreakdownRow } from './types';
import { CLIENT_CONFIGS, DEFAULT_CLIENT } from './clients';

interface DashboardState {
  clientId: string;
  filters: DashboardFilters;
  // Remote data
  totals: KpiBlock | null;
  byFunnelStage: Record<string, KpiBlock>;
  trend: TrendPoint[];
  breakdown: BreakdownRow[];
  availableChannels: string[];
  availableMarkets: string[];
  refreshedAt: string;
  loading: boolean;
  error: string | null;
  // AI
  insightsText: string;
  recommendationsText: string;
  aiLoading: boolean;
  // Actions
  setClient: (id: string) => void;
  setFilters: (patch: Partial<DashboardFilters>) => void;
  fetchData: () => Promise<void>;
  fetchAi: (mode: 'insights' | 'recommendations') => Promise<void>;
}

function defaultFilters(clientId: string): DashboardFilters {
  const cfg = CLIENT_CONFIGS[clientId];
  // Default: year to date
  const now = new Date();
  const dateFrom = `${now.getFullYear()}-01-01`;
  const dateTo = now.toISOString().slice(0, 10);
  return {
    dateFrom,
    dateTo,
    platforms: ['meta', 'google_ads'],
    channels: [],
    markets: [],
    funnelStages: ['awareness', 'consideration', 'conversion'],
    breakdownDim: cfg?.defaultBreakdownDim ?? 'category',
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  clientId: DEFAULT_CLIENT,
  filters: defaultFilters(DEFAULT_CLIENT),
  totals: null,
  byFunnelStage: {},
  trend: [],
  breakdown: [],
  availableChannels: [],
  availableMarkets: [],
  refreshedAt: '',
  loading: false,
  error: null,
  insightsText: '',
  recommendationsText: '',
  aiLoading: false,

  setClient: (id) => {
    set({ clientId: id, filters: defaultFilters(id), totals: null, trend: [], breakdown: [] });
    get().fetchData();
  },

  setFilters: (patch) => {
    set((s) => ({ filters: { ...s.filters, ...patch } }));
    get().fetchData();
  },

  fetchData: async () => {
    const { clientId, filters } = get();
    set({ loading: true, error: null });

    const params = new URLSearchParams({ client: clientId });
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.platforms.length) params.set('platforms', filters.platforms.join(','));
    if (filters.channels.length) params.set('channels', filters.channels.join(','));
    if (filters.markets.length) params.set('markets', filters.markets.join(','));
    if (filters.funnelStages.length) params.set('stages', filters.funnelStages.join(','));
    params.set('breakdown', filters.breakdownDim);

    try {
      const res = await fetch(`/api/dashboard/data?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set({
        totals: data.totals,
        byFunnelStage: data.byFunnelStage,
        trend: data.trend,
        breakdown: data.breakdown,
        availableChannels: data.availableChannels ?? [],
        availableMarkets: data.availableMarkets ?? [],
        refreshedAt: data.refreshedAt,
        loading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load data', loading: false });
    }
  },

  fetchAi: async (mode) => {
    const { clientId, filters, totals, byFunnelStage } = get();
    if (!totals) return;
    set({ aiLoading: true });
    try {
      const res = await fetch('/api/dashboard/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          client: clientId,
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
