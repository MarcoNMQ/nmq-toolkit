// Industry benchmarks built on top of the media plan's BENCH values.
// Each industry entry has multipliers for CPM, CTR, CPC, VTR relative to
// the market-level base from constants.ts. The dashboard uses these to show
// "your value vs industry benchmark" deltas on KPI cards.

import { BENCH } from '@/lib/mediaplan/constants';
import type { Channel } from '@/lib/mediaplan/types';

export interface IndustryMultipliers {
  cpm: number;
  ctr: number;
  cpc: number;
  vtr: number;
  cvr: number;
}

export interface Industry {
  id: string;
  label: string;
  multipliers: IndustryMultipliers;
}

export const INDUSTRIES: Industry[] = [
  { id: 'general',      label: 'General (no industry)',   multipliers: { cpm: 1.00, ctr: 1.00, cpc: 1.00, vtr: 1.00, cvr: 1.00 } },
  { id: 'ecommerce',    label: 'E-commerce / Retail',      multipliers: { cpm: 1.10, ctr: 1.20, cpc: 0.90, vtr: 0.95, cvr: 1.30 } },
  { id: 'b2b_saas',     label: 'B2B / SaaS',               multipliers: { cpm: 1.40, ctr: 0.70, cpc: 1.50, vtr: 0.80, cvr: 0.70 } },
  { id: 'automotive',   label: 'Automotive',               multipliers: { cpm: 1.30, ctr: 0.80, cpc: 1.20, vtr: 1.10, cvr: 0.60 } },
  { id: 'finserv',      label: 'Financial Services',       multipliers: { cpm: 1.50, ctr: 0.90, cpc: 1.80, vtr: 0.85, cvr: 0.80 } },
  { id: 'outdoor',      label: 'Outdoor & Sporting Goods', multipliers: { cpm: 0.90, ctr: 1.10, cpc: 0.95, vtr: 1.15, cvr: 1.10 } },
  { id: 'travel',       label: 'Travel & Hospitality',     multipliers: { cpm: 1.20, ctr: 1.00, cpc: 1.10, vtr: 1.05, cvr: 0.90 } },
  { id: 'healthcare',   label: 'Healthcare',               multipliers: { cpm: 1.30, ctr: 0.85, cpc: 1.60, vtr: 0.90, cvr: 0.85 } },
  { id: 'fmcg',         label: 'FMCG / Consumer Goods',   multipliers: { cpm: 1.00, ctr: 1.10, cpc: 0.85, vtr: 1.00, cvr: 1.00 } },
];

export function getIndustry(id: string): Industry {
  return INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[0];
}

// Returns benchmark values for a given market + channel + industry.
// Falls back to EU averages if the market isn't in BENCH.
export function getBenchmark(
  market: string,
  channel: Channel,
  industryId: string
): { cpm?: number; ctr?: number; cpc?: number; vtr?: number; cvr?: number } {
  const mkt = market.toUpperCase();
  const benchMarket = BENCH[mkt] ?? BENCH['DE']; // DE as EU fallback
  const benchChannel = benchMarket?.[channel];
  if (!benchChannel) return {};

  const mult = getIndustry(industryId).multipliers;

  return {
    cpm: benchChannel.cpm   != null ? benchChannel.cpm   * mult.cpm  : undefined,
    ctr: benchChannel.ctr   != null ? benchChannel.ctr   * mult.ctr  : undefined,
    cpc: benchChannel.cpc   != null ? benchChannel.cpc   * mult.cpc  : undefined,
    vtr: benchChannel.view_rate != null ? benchChannel.view_rate * mult.vtr : undefined,
    cvr: benchChannel.conv_rate != null ? benchChannel.conv_rate * mult.cvr : undefined,
  };
}

// Returns a blended benchmark across all channels in the actual data rows,
// weighted by impressions. Used when there's no single channel selected.
export function getBlendedBenchmark(
  markets: string[],
  channels: string[],
  industryId: string
): { cpm?: number; ctr?: number; cpc?: number } {
  if (!markets.length || !channels.length) return {};

  const allChannels: Channel[] = ['YouTube', 'LinkedIn', 'Search', 'Display'];
  const validChannels = channels.filter((c) => allChannels.includes(c as Channel)) as Channel[];
  if (!validChannels.length) return {};

  const mkt = markets[0]?.toUpperCase() ?? 'DE';
  const benchMarket = BENCH[mkt] ?? BENCH['DE'];
  const mult = getIndustry(industryId).multipliers;

  let cpmSum = 0, ctrSum = 0, cpcCount = 0, cpcSum = 0, count = 0;
  for (const ch of validChannels) {
    const b = benchMarket?.[ch];
    if (!b) continue;
    if (b.cpm != null) { cpmSum += b.cpm * mult.cpm; count++; }
    if (b.ctr != null) { ctrSum += b.ctr * mult.ctr; }
    if (b.cpc != null) { cpcSum += b.cpc * mult.cpc; cpcCount++; }
  }

  return {
    cpm: count > 0 ? cpmSum / count : undefined,
    ctr: count > 0 ? ctrSum / count : undefined,
    cpc: cpcCount > 0 ? cpcSum / cpcCount : undefined,
  };
}
