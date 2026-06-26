'use client';

import { CH_COLORS } from '@/lib/mediaplan/constants';
import type { Channel, Goal, KpiRow, LinkedInFormat } from '@/lib/mediaplan/types';

/** Direct port of make_funnel()'s stage selection in media_plan.py, just
 *  rendered as CSS bars instead of a Plotly funnel chart (no charting
 *  dependency needed for the same value+percent-of-first-stage display). */
function stagesFor(channel: Channel, goal: Goal, liFormat?: LinkedInFormat): [string, keyof KpiRow][] {
  if (channel === 'Search') {
    if (goal === 'Awareness') return [['Impressions', 'impressions'], ['Clicks', 'clicks']];
    if (goal === 'Traffic') return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Sessions', 'sessions']];
    return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Sessions', 'sessions'], ['Conversions', 'conversions']];
  }
  if (channel === 'YouTube') {
    if (goal === 'Awareness') return [['Impressions', 'impressions'], ['Reach', 'reach'], ['Views', 'views'], ['Clicks', 'clicks']];
    if (goal === 'Traffic') return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Sessions', 'sessions']];
    return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Sessions', 'sessions'], ['Conversions', 'conversions']];
  }
  if (channel === 'LinkedIn' && (liFormat === 'Sponsored Message / Conversational Ad' || liFormat === 'Conversation Ad')) {
    if (goal === 'Conversion') return [['Sends', 'sends'], ['Opens', 'opens'], ['CTA Clicks', 'cta_clicks'], ['Leads', 'conversions'], ['MQLs', 'mql'], ['SQLs', 'sql']];
    return [['Sends', 'sends'], ['Opens', 'opens'], ['CTA Clicks', 'cta_clicks']];
  }
  if (channel === 'LinkedIn' && (liFormat === 'Document Ad' || liFormat === 'Lead Gen Form')) {
    if (goal === 'Conversion') return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Form Completions', 'form_completions'], ['MQLs', 'mql'], ['SQLs', 'sql']];
    return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Form Completions', 'form_completions']];
  }
  // LinkedIn Standard (Static/Video/Carousel) / Display
  if (goal === 'Awareness') return [['Impressions', 'impressions'], ['Reach', 'reach'], ['Clicks', 'clicks']];
  if (goal === 'Traffic') return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Sessions', 'sessions']];
  return [['Impressions', 'impressions'], ['Clicks', 'clicks'], ['Sessions', 'sessions'], ['Conversions', 'conversions']];
}

export function Funnel({ totalRow, channel, goal, liFormat, title }: { totalRow: KpiRow; channel: Channel; goal: Goal; liFormat?: LinkedInFormat; title?: string }) {
  const stages = stagesFor(channel, goal, liFormat);
  const colors = CH_COLORS[channel];
  const values = stages.map(([, key]) => (totalRow[key] as number | undefined) ?? 0);
  const first = values[0] || 1;

  return (
    <div className="rounded-md border border-ink-100 p-3">
      {title && <p className="mb-2 text-center text-xs font-bold" style={{ color: '#1F497D' }}>{title}</p>}
      <div className="space-y-1.5">
        {stages.map(([label], i) => {
          const value = values[i];
          const pct = first > 0 ? (value / first) * 100 : 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-ink-600">{label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-sm bg-ink-100">
                <div
                  className="h-5 rounded-sm"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: colors[Math.min(i, colors.length - 1)] }}
                />
              </div>
              {/* Value/% sit outside the bar, not inside it — a near-zero-width
                  bar can't legibly contain white label text, so the original's
                  in-bar Plotly labels don't translate directly to CSS bars. */}
              <span className="w-20 shrink-0 text-right text-[11px] font-bold text-ink-900">{Math.round(value).toLocaleString()}</span>
              <span className="w-10 shrink-0 text-right text-[10px] text-ink-400">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
