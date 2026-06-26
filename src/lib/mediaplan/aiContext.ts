import { aggregateScenarioMetrics } from './calc';
import { goalBudget, marketBudget } from './budgets';
import { ADDITIVE, COL_FMT, MARKET_LABELS } from './constants';
import type { PlanConfig, Scenario } from './types';

// Direct port of build_plan_summary() in media_plan.py — a plain-text
// digest of the scenario's actual configured budgets/benchmarks, fed to
// every AI prompt (insights, recommendations, benchmark explanations,
// and all three chats) so Claude reasons from this plan's real numbers,
// not generic advice.
export function buildPlanSummary(scenario: Scenario, plan: PlanConfig): string {
  const days = Math.max(
    Math.round((new Date(`${plan.endDate}T00:00:00`).getTime() - new Date(`${plan.startDate}T00:00:00`).getTime()) / 86400000) + 1,
    1,
  );
  const lines: string[] = [
    `Campaign: ${plan.campaignName}  (${scenario.name})`,
    `Audience: ${plan.audience}  |  Industry: ${plan.industry || 'n/a'}`,
    `Flight: ${plan.startDate} – ${plan.endDate} (${days} days)`,
    `Total budget: €${scenario.totalBudget.toLocaleString()}`,
    '',
    'Market budgets:',
  ];

  scenario.markets.forEach((market) => {
    const mktBud = marketBudget(scenario, market);
    lines.push(`  ${MARKET_LABELS[market.market] ?? market.market}: €${mktBud.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${market.pct.toFixed(1)}%)`);
    if (market.goals.length > 1) {
      market.goals.forEach((goal) => {
        const gbud = goalBudget(scenario, market, goal);
        lines.push(`    → ${goal.goal}: €${gbud.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${goal.goalPct.toFixed(0)}%)`);
      });
    }
  });
  lines.push('');

  const goalsSeen = new Set(scenario.markets.flatMap((m) => m.goals.map((g) => g.goal)));
  goalsSeen.forEach((goalName) => {
    const channelsForGoal = new Set(scenario.markets.flatMap((m) => m.goals.filter((g) => g.goal === goalName).flatMap((g) => g.channels.map((c) => c.channel))));
    lines.push(`Goal: ${goalName}  |  Channels: ${[...channelsForGoal].join(', ')}`);

    channelsForGoal.forEach((chName) => {
      // First market using this channel/goal — used as the "reference"
      // benchmark, same simplification the Python source makes.
      let ref: { cpm?: number; cpc?: number; ctr?: number; frequency?: number; view_rate?: number } | undefined;
      scenario.markets.some((m) => {
        const g = m.goals.find((gg) => gg.goal === goalName);
        const c = g?.channels.find((cc) => cc.channel === chName);
        if (c) { ref = c.benchmark; return true; }
        return false;
      });
      if (ref) {
        const parts: string[] = [];
        if (chName === 'Search') {
          if (ref.cpc) parts.push(`CPC €${ref.cpc.toFixed(2)}`);
          if (ref.ctr) parts.push(`CTR ${(ref.ctr * 100).toFixed(1)}%`);
        } else {
          if (ref.cpm) parts.push(`CPM €${ref.cpm.toFixed(2)}`);
          if (ref.ctr) parts.push(`CTR ${(ref.ctr * 100).toFixed(2)}%`);
          if (ref.frequency) parts.push(`Frequency ${ref.frequency.toFixed(1)}`);
          if (chName === 'YouTube' && ref.view_rate) parts.push(`View Rate ${(ref.view_rate * 100).toFixed(0)}%`);
        }
        if (parts.length) lines.push(`  ${chName} benchmarks (first market as reference): ${parts.join(', ')}`);
      }
    });
    lines.push('');
  });

  const agg = aggregateScenarioMetrics(scenario);
  lines.push('Aggregated KPIs:');
  ADDITIVE.forEach((c) => {
    if ((agg[c] ?? 0) > 0) lines.push(`  ${COL_FMT[c].label}: ${COL_FMT[c].fmt(agg[c])}`);
  });

  return lines.join('\n');
}

export const BENCHMARK_SOURCES = `
YOUTUBE
- WordStream Google Ads Benchmarks 2025: https://www.wordstream.com/blog/2025-google-ads-benchmarks
- YouTube CPM Europe by Country 2026: https://fluxnote.io/guides/youtube-cpm-europe-by-country-2026
- YouTube Ad Benchmarks (CPV, CPM, CTR): https://megadigital.ai/en/blog/youtube-ad-benchmarks/
- YouTube Ads Benchmarks by Industry: https://www.storegrowers.com/youtube-ads-benchmarks/
- YouTube CPM by Country Global Comparison 2026: https://upgrowth.in/youtube-cpm-by-country-global-comparison-2026/
- YouTube CPM by Niche 2026: https://upgrowth.in/youtube-cpm-overview-highest-paying-niches-2026/

LINKEDIN
- LinkedIn Marketing Solutions Blog (official): https://business.linkedin.com/marketing-solutions/blog
- Dreamdata LinkedIn Ads B2B Benchmarks: https://dreamdata.io/linkedin-ads-b2b-benchmarks

SEARCH & DISPLAY
- WordStream Google Ads Benchmarks 2025: https://www.wordstream.com/blog/2025-google-ads-benchmarks
- HubSpot Marketing Statistics 2026: https://www.hubspot.com/marketing-statistics

B2B & GENERAL
- B2B Paid Awareness Benchmarks Q1 2026: https://refinelabs.com/article/b2b-paid-awareness-benchmarks-q1-2026
- Paid Social Advertising Costs UK 2026: https://www.mediaperformance.co.uk/paid-social-advertising-costs-uk-2026/
- Hootsuite Social Media Benchmarks 2026: https://blog.hootsuite.com/social-media-benchmarks/
`;
