import { describe, expect, it } from 'vitest';
import { suggestBenchmarks } from '../actualsSuggest';
import type { ActualsDataset, ActualsRow } from '../types';

function row(overrides: Partial<ActualsRow>): ActualsRow {
  return {
    id: Math.random().toString(36),
    marketRaw: 'UK',
    market: 'UK',
    channel: 'Search',
    goal: 'Traffic',
    startDate: '2027-01-01',
    endDate: '2027-01-07',
    spend: 100,
    metrics: {},
    ...overrides,
  };
}

function dataset(clientName: string, rows: ActualsRow[]): ActualsDataset {
  return { id: Math.random().toString(36), name: 'ds', clientName, createdAt: '', updatedAt: '', rows };
}

const target = { clientName: 'Acme', channel: 'Search' as const, goal: 'Traffic' as const, market: 'UK' };

describe('suggestBenchmarks', () => {
  it('returns null when nothing matches', () => {
    const result = suggestBenchmarks([dataset('Acme', [row({ goal: 'Conversion' })])], target);
    expect(result).toBeNull();
  });

  it('derives CPC and CTR as spend/volume-weighted aggregates, not an average of ratios', () => {
    const rows = [
      row({ spend: 100, metrics: { impressions: 10000, clicks: 300 } }),
      row({ spend: 200, metrics: { impressions: 15000, clicks: 450 } }),
    ];
    const result = suggestBenchmarks([dataset('Acme', rows)], target)!;
    const cpc = result.suggestions.find((s) => s.field === 'cpc')!;
    const ctr = result.suggestions.find((s) => s.field === 'ctr')!;
    expect(cpc.value).toBeCloseTo(300 / 750); // total spend / total clicks
    expect(ctr.value).toBeCloseTo(750 / 25000); // total clicks / total impressions
    // click_to_session is a relevant Search|Traffic field but not derivable
    // from actuals data — must never be guessed.
    expect(result.suggestions.find((s) => s.field === 'click_to_session')).toBeUndefined();
  });

  it('never includes a row with a known, different goal', () => {
    const rows = [
      row({ goal: 'Traffic', metrics: { impressions: 1000, clicks: 30 } }),
      row({ goal: 'Conversion', metrics: { impressions: 1000, clicks: 30 } }),
    ];
    const result = suggestBenchmarks([dataset('Acme', rows)], target)!;
    expect(result.matchedRowCount).toBe(1);
  });

  it('includes a row with no goal set at all — unknown is neutral, not a mismatch', () => {
    const rows = [row({ goal: undefined, metrics: { impressions: 1000, clicks: 30 } })];
    const result = suggestBenchmarks([dataset('Acme', rows)], target)!;
    expect(result.matchedRowCount).toBe(1);
  });

  it('never includes a row with a known, different market', () => {
    const rows = [
      row({ market: 'UK', metrics: { impressions: 1000, clicks: 30 } }),
      row({ market: 'DE', metrics: { impressions: 1000, clicks: 30 } }),
    ];
    const result = suggestBenchmarks([dataset('Acme', rows)], target)!;
    expect(result.matchedRowCount).toBe(1);
  });

  it('never pulls rows from a different client', () => {
    const rows = [row({ metrics: { impressions: 1000, clicks: 30 } })];
    const result = suggestBenchmarks([dataset('Other Client', rows)], target);
    expect(result).toBeNull();
  });

  it('reports a higher match strength with more, more-confirmed rows', () => {
    const fewRows = [row({ metrics: { impressions: 1000, clicks: 30 } })];
    const low = suggestBenchmarks([dataset('Acme', fewRows)], target)!;
    expect(low.matchStrength).toBe('low');

    const manyConfirmedRows = Array.from({ length: 6 }, () => row({ goal: 'Traffic', market: 'UK', metrics: { impressions: 1000, clicks: 30 } }));
    const high = suggestBenchmarks([dataset('Acme', manyConfirmedRows)], target)!;
    expect(high.matchStrength).toBe('high');
  });

  it('derives Sponsored Message/Conversation Ad fields from sends/opens/cta_clicks, never from impressions/clicks', () => {
    const smTarget = {
      clientName: 'Acme', channel: 'LinkedIn' as const, goal: 'Conversion' as const,
      liFormat: 'Sponsored Message / Conversational Ad' as const, market: 'UK',
    };
    const rows = [
      row({ channel: 'LinkedIn', liFormat: 'Sponsored Message / Conversational Ad', goal: 'Conversion', spend: 500, metrics: { sends: 1000, opens: 400, cta_clicks: 80 } }),
    ];
    const result = suggestBenchmarks([dataset('Acme', rows)], smTarget)!;
    const costPerSend = result.suggestions.find((s) => s.field === 'cpm')!;
    const openRate = result.suggestions.find((s) => s.field === 'open_rate')!;
    const ctaCtr = result.suggestions.find((s) => s.field === 'ctr')!;
    expect(costPerSend.value).toBeCloseTo(500 / 1000); // cost per send, NOT spend/impressions
    expect(openRate.value).toBeCloseTo(400 / 1000);
    expect(ctaCtr.value).toBeCloseTo(80 / 400); // CTA clicks / opens, NOT clicks/impressions
  });

  it('derives Lead Gen Form fields from impressions/clicks/form_completions', () => {
    const lgfTarget = {
      clientName: 'Acme', channel: 'LinkedIn' as const, goal: 'Conversion' as const,
      liFormat: 'Lead Gen Form' as const, market: 'UK',
    };
    const rows = [
      row({ channel: 'LinkedIn', liFormat: 'Lead Gen Form', goal: 'Conversion', spend: 800, metrics: { impressions: 50000, clicks: 400, form_completions: 60 } }),
    ];
    const result = suggestBenchmarks([dataset('Acme', rows)], lgfTarget)!;
    const formRate = result.suggestions.find((s) => s.field === 'form_completion_rate')!;
    expect(formRate.value).toBeCloseTo(60 / 400);
  });

  it('lists matched campaigns for transparency, deduplicated', () => {
    const rows = [
      row({ campaignName: 'Q1 Launch', metrics: { impressions: 1000, clicks: 30 } }),
      row({ campaignName: 'Q1 Launch', metrics: { impressions: 1000, clicks: 30 } }),
      row({ campaignName: 'Q2 Push', startDate: '2027-02-01', endDate: '2027-02-07', metrics: { impressions: 1000, clicks: 30 } }),
    ];
    const result = suggestBenchmarks([dataset('Acme', rows)], target)!;
    expect(result.matchedCampaigns.map((c) => c.campaignName).sort()).toEqual(['Q1 Launch', 'Q2 Push']);
  });
});
