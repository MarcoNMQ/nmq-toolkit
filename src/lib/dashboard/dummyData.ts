import type { AdRow } from './types';

const CHANNELS = ['YouTube', 'Search', 'Facebook', 'Instagram', 'LinkedIn'];
const MARKETS = ['DE', 'NL', 'BE', 'FR', 'UK'];
const CATEGORIES = ['Brand Awareness', 'Product Launch', 'Retargeting', 'Prospecting'];

const CHANNEL_STAGE: Record<string, AdRow['funnel_stage']> = {
  YouTube: 'awareness',
  Facebook: 'awareness',
  Instagram: 'awareness',
  Search: 'consideration',
  LinkedIn: 'consideration',
};

const BASE_METRICS: Record<string, { impr: number; cpm: number; ctr: number; cvr: number }> = {
  YouTube:   { impr: 85000,  cpm: 4.2,  ctr: 0.003, cvr: 0 },
  Facebook:  { impr: 70000,  cpm: 5.1,  ctr: 0.012, cvr: 0 },
  Instagram: { impr: 60000,  cpm: 6.0,  ctr: 0.015, cvr: 0 },
  Search:    { impr: 18000,  cpm: 22.0, ctr: 0.06,  cvr: 0.04 },
  LinkedIn:  { impr: 22000,  cpm: 28.0, ctr: 0.008, cvr: 0.02 },
};

function jitter(base: number, pct = 0.25): number {
  return base * (1 + (Math.random() - 0.5) * pct);
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function generateDummyRows(): AdRow[] {
  const rows: AdRow[] = [];
  // Weekly sampling — one row per channel x market x week to keep size manageable
  const dates = dateRange('2026-01-05', '2026-06-22').filter((_, i) => i % 7 === 0);

  for (const date of dates) {
    for (const channel of CHANNELS) {
      for (const market of MARKETS.slice(0, 3)) { // DE, NL, BE only to keep volume sane
        const base = BASE_METRICS[channel];
        const mktMultiplier = market === 'DE' ? 1.4 : market === 'NL' ? 1.0 : 0.7;
        // Slight growth trend over the year
        const weekIdx = dates.indexOf(date);
        const trendMultiplier = 1 + weekIdx * 0.008;

        const impressions = Math.round(jitter(base.impr * mktMultiplier * trendMultiplier));
        const spend = Math.round(impressions * base.cpm / 1000 * 100) / 100;
        const clicks = Math.round(impressions * jitter(base.ctr));
        const conversions = base.cvr > 0 ? Math.round(clicks * jitter(base.cvr)) : 0;
        const video_plays = ['YouTube', 'Facebook', 'Instagram'].includes(channel)
          ? Math.round(impressions * jitter(0.45))
          : 0;
        const video_100 = video_plays ? Math.round(video_plays * jitter(0.35)) : 0;

        rows.push({
          date,
          campaign_name: `${market}_${channel.toUpperCase().replace(' ', '_')}_Q${Math.ceil((dates.indexOf(date) + 1) / 13)}`,
          platform: ['YouTube', 'Search', 'LinkedIn'].includes(channel) ? 'google_ads' : 'meta',
          channel,
          market,
          category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
          funnel_stage: CHANNEL_STAGE[channel] ?? 'awareness',
          spend,
          impressions,
          clicks,
          conversions: conversions || undefined,
          video_plays: video_plays || undefined,
          video_100: video_100 || undefined,
          ctr: clicks / impressions,
          cpc: clicks > 0 ? spend / clicks : 0,
          cpm: spend / impressions * 1000,
          cvr: conversions && clicks > 0 ? conversions / clicks : undefined,
          vtr: video_100 && impressions > 0 ? video_100 / impressions : undefined,
        });
      }
    }
  }

  return rows;
}

// Cached so it's stable within a server lifecycle
let _cached: AdRow[] | null = null;
export function getDummyRows(): AdRow[] {
  if (!_cached) _cached = generateDummyRows();
  return _cached;
}
