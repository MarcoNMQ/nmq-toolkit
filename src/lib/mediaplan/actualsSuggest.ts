// Plan vs Actuals — suggesting benchmark assumptions for a new plan from
// historical actuals. Fully local and deterministic: no AI call, no data
// leaves the browser. Matches strictly on client + channel (always known)
// and, where the historical row has them, goal/format/market — a row
// with a KNOWN, DIFFERENT value for any of those is excluded outright,
// never blended in. A row simply missing a dimension is treated as
// unknown, not a mismatch, and doesn't block the match but also doesn't
// strengthen it.
import { benchFieldsFor, channelKeyFor } from './constants';
import type { ActualsDataset, ActualsMetricKey, ActualsRow, AmazonFormat, BenchmarkField, Channel, Goal, LinkedInFormat } from './types';

export type MatchStrength = 'low' | 'medium' | 'high';

export interface MatchedCampaign {
  campaignName?: string;
  market?: string;
  dateRange: string;
  spend: number;
}

export interface BenchmarkSuggestion {
  field: BenchmarkField;
  label: string;
  value: number;
}

export interface SuggestionTarget {
  clientName: string;
  channel: Channel;
  goal: Goal;
  liFormat?: LinkedInFormat;
  amazonFormat?: AmazonFormat;
  market?: string;
}

export interface SuggestionResult {
  suggestions: BenchmarkSuggestion[];
  matchStrength: MatchStrength;
  matchedRowCount: number;
  matchedCampaigns: MatchedCampaign[];
}

type Derivation = { num: ActualsMetricKey | 'spend'; den: ActualsMetricKey | 'spend'; scale?: number; label: string };

// Only benchmark fields whose rate is a direct ratio of two things an
// actuals row can report — never the deeper funnel-stage rates
// (click_to_session, conv_rate, lead_to_mql, mql_to_sql, frequency, ...),
// since those would need data actuals exports don't reliably carry, and
// guessing them from thin, indirect signals would be exactly the kind of
// overclaimed precision this feature is explicitly asked not to produce.
//
// Channel/format-specific, not a flat key→ratio table: the SAME benchmark
// field name means a different thing per funnel. `cpm` is cost-per-1000-
// impressions everywhere EXCEPT LinkedIn Sponsored Message/Conversation
// Ad, where it's cost-per-send (that funnel has no impressions concept at
// all); `ctr` is clicks/impressions everywhere except Sponsored Message/
// Conversation Ad (CTA clicks/opens) and never applies the same way to
// Document Ad/Lead Gen Form's own form_completion_rate. Using the wrong
// pair here wouldn't error, it would just silently produce a plausible-
// looking but meaningless number — exactly what this feature must not do.
function derivableFieldsFor(channel: Channel, liFormat?: LinkedInFormat): Partial<Record<BenchmarkField, Derivation>> {
  if (channel === 'LinkedIn' && (liFormat === 'Sponsored Message / Conversational Ad' || liFormat === 'Conversation Ad')) {
    return {
      cpm: { num: 'spend', den: 'sends', label: 'Cost per send (€)' },
      open_rate: { num: 'opens', den: 'sends', label: 'Open rate' },
      ctr: { num: 'cta_clicks', den: 'opens', label: 'CTA click rate' },
    };
  }
  if (channel === 'LinkedIn' && (liFormat === 'Document Ad' || liFormat === 'Lead Gen Form')) {
    return {
      cpm: { num: 'spend', den: 'impressions', scale: 1000, label: 'CPM (€)' },
      ctr: { num: 'clicks', den: 'impressions', label: 'CTR' },
      form_completion_rate: { num: 'form_completions', den: 'clicks', label: 'Form completion rate' },
    };
  }
  if (channel === 'LinkedIn' && liFormat === 'Video') {
    return {
      cpv: { num: 'spend', den: 'views', label: 'CPV (€)' },
      view_rate: { num: 'views', den: 'impressions', label: 'View rate' },
      ctr: { num: 'clicks', den: 'impressions', label: 'CTR' },
    };
  }
  // Generic impression/click-based funnel — YouTube, Display, Search,
  // LinkedIn Static/Carousel, Amazon Ads. The ratio math is the same
  // regardless of which side calc.ts treats as the forward-calculated
  // one (e.g. Search derives impressions FROM clicks, but cpc = spend /
  // clicks and ctr = clicks / impressions hold either way).
  return {
    cpm: { num: 'spend', den: 'impressions', scale: 1000, label: 'CPM (€)' },
    cpc: { num: 'spend', den: 'clicks', label: 'CPC (€)' },
    ctr: { num: 'clicks', den: 'impressions', label: 'CTR' },
  };
}

function rowValue(row: ActualsRow, key: ActualsMetricKey | 'spend'): number | undefined {
  return key === 'spend' ? row.spend : row.metrics[key];
}

// A row is eligible when every dimension it actually HAS agrees with the
// target. A dimension the row doesn't have is neutral, not disqualifying.
function isEligible(row: ActualsRow, target: SuggestionTarget): boolean {
  if (row.channel !== target.channel) return false;
  if (row.goal && row.goal !== target.goal) return false;
  if (target.channel === 'LinkedIn' && row.liFormat && target.liFormat && row.liFormat !== target.liFormat) return false;
  if (target.channel === 'LinkedIn' && row.liFormat && !target.liFormat) return false;
  if (target.channel === 'Amazon Ads' && row.amazonFormat && target.amazonFormat && row.amazonFormat !== target.amazonFormat) return false;
  if (target.channel === 'Amazon Ads' && row.amazonFormat && !target.amazonFormat) return false;
  if (row.market && target.market && row.market !== target.market) return false;
  return true;
}

function matchStrengthFor(matched: ActualsRow[], target: SuggestionTarget): MatchStrength {
  const n = matched.length;
  if (n === 0) return 'low';
  const fullyConfirmed = matched.filter((r) => r.goal === target.goal
    && (!target.market || r.market === target.market)
    && (target.channel !== 'LinkedIn' || !target.liFormat || r.liFormat === target.liFormat)
    && (target.channel !== 'Amazon Ads' || !target.amazonFormat || r.amazonFormat === target.amazonFormat)).length;
  const confirmedShare = fullyConfirmed / n;
  if (n >= 5 && confirmedShare >= 0.6) return 'high';
  if (n >= 2 && confirmedShare >= 0.3) return 'medium';
  if (n >= 5) return 'medium';
  return 'low';
}

/** Returns null when nothing matches at all — the UI shows "no historical
 *  data for this combination" rather than a zero-row result object. */
export function suggestBenchmarks(datasets: ActualsDataset[], target: SuggestionTarget): SuggestionResult | null {
  const candidateRows = datasets
    .filter((d) => d.clientName === target.clientName)
    .flatMap((d) => d.rows);
  const matched = candidateRows.filter((r) => isEligible(r, target));
  if (matched.length === 0) return null;

  const key = channelKeyFor(target.channel, target.liFormat);
  const relevantFields = benchFieldsFor(key, target.goal, target.amazonFormat);
  const derivableFields = derivableFieldsFor(target.channel, target.liFormat);

  const suggestions: BenchmarkSuggestion[] = [];
  relevantFields.forEach((field) => {
    const derivation = derivableFields[field];
    if (!derivation) return;
    let numSum = 0;
    let denSum = 0;
    matched.forEach((r) => {
      const num = rowValue(r, derivation.num);
      const den = rowValue(r, derivation.den);
      if (num === undefined || den === undefined || den <= 0) return;
      numSum += num;
      denSum += den;
    });
    if (denSum <= 0) return;
    suggestions.push({ field, label: derivation.label, value: (numSum / denSum) * (derivation.scale ?? 1) });
  });

  const seen = new Set<string>();
  const matchedCampaigns: MatchedCampaign[] = [];
  matched.forEach((r) => {
    const dateRange = r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`;
    const dedupeKey = `${r.campaignName ?? ''}|${r.marketRaw}|${dateRange}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    matchedCampaigns.push({ campaignName: r.campaignName, market: r.market ?? r.marketRaw, dateRange, spend: r.spend });
  });

  return {
    suggestions,
    matchStrength: matchStrengthFor(matched, target),
    matchedRowCount: matched.length,
    matchedCampaigns,
  };
}
