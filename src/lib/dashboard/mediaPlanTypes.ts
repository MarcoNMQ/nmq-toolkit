// Flat representation of one planned channel/phase/market entry
export interface MediaPlanEntry {
  channel: string;        // normalized key: 'youtube' | 'search' | 'display' | 'linkedin' | etc.
  channelLabel: string;   // display name
  phase: string;          // 'awareness' | 'consideration' | 'conversion'
  market: string;         // market code ('DE', 'FR', …) or 'All'
  spend: number;
  impressions?: number;
  clicks?: number;
  views?: number;
}

// Entry that also carries a date period (for trend comparison)
export interface PeriodEntry extends MediaPlanEntry {
  periodLabel: string;
  periodStart: string;  // YYYY-MM-DD
  periodEnd: string;    // YYYY-MM-DD
}

export interface ParsedMediaPlan {
  source: 'toolkit' | 'external';
  scenarioName: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  breakdown?: string;
  entries: MediaPlanEntry[];
  periodEntries: PeriodEntry[];
  hasPeriods: boolean;
}

// One row in the comparison output
export interface CompareRow {
  key: string;
  channel: string;
  channelLabel: string;
  phase: string;
  market: string;
  plannedSpend: number;
  actualSpend: number;
  pacing: number;             // 0-n, e.g. 0.71 = 71%
  plannedImpressions?: number;
  actualImpressions?: number;
  plannedClicks?: number;
  actualClicks?: number;
}

// One point in the spend trend (planned vs actual over time)
export interface CompareTrendPoint {
  period: string;
  planned: number;
  actual: number;
}

export interface CompareResult {
  rows: CompareRow[];
  trendPoints: CompareTrendPoint[];
  totalPlanned: number;
  totalActual: number;
  pacing: number;
}
