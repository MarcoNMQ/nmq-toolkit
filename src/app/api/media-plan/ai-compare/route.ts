import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { aggregateScenarioMetrics } from '@/lib/mediaplan/calc';
import { ADDITIVE, COL_FMT, MARKET_LABELS } from '@/lib/mediaplan/constants';
import type { PlanConfig, Scenario } from '@/lib/mediaplan/types';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });

  const { scenarios, plan } = await req.json() as { scenarios: Scenario[]; plan: PlanConfig };

  function scenarioBlock(s: Scenario): string {
    const agg = aggregateScenarioMetrics(s);
    const lines = [`Scenario: ${s.name}`];
    lines.push(`  Total budget: €${s.totalBudget.toLocaleString()}`);
    lines.push(`  Markets (${s.markets.length}): ${s.markets.map((m) => MARKET_LABELS[m.market] ?? m.market).join(', ')}`);
    const goalsSeen = new Set(s.markets.flatMap((m) => m.goals.map((g) => g.goal)));
    goalsSeen.forEach((goalName) => {
      const channels = new Set(s.markets.flatMap((m) => m.goals.filter((g) => g.goal === goalName).flatMap((g) => g.channels.map((c) => c.channel))));
      lines.push(`  Goal: ${goalName} | Channels: ${[...channels].join(', ')}`);
    });
    lines.push('  Aggregated KPIs:');
    ADDITIVE.forEach((c) => { if ((agg[c] ?? 0) > 0) lines.push(`    ${COL_FMT[c].label}: ${COL_FMT[c].fmt(agg[c])}`); });
    return lines.join('\n');
  }

  const scenariosText = scenarios.map(scenarioBlock).join('\n\n');
  const prompt = `You are a senior paid media strategist comparing ${scenarios.length} media plan scenarios for a ${plan.audience} brand in the ${plan.industry || 'general'} sector.

${scenariosText}

For each scenario write a clearly labelled block using exactly this format (one block per scenario):

SCENARIO: [name]
STRENGTHS: [60–80 words — what this scenario does well for a ${plan.audience} ${plan.industry} brand: market coverage, channel fit, which KPIs it leads on and why that matters for this industry]
WEAKNESSES: [60–80 words — where this scenario underperforms: KPIs it loses on, missing markets, channel imbalance, or poor fit with ${plan.audience} buyer journeys in ${plan.industry}]
VERDICT: [25–35 words — one direct sentence on the single best use case for this scenario]

After all scenario blocks, write these two final sections:

BEST FOR BUDGET EFFICIENCY:
[50–60 words — which scenario delivers the most value per euro spent, referencing the actual KPI numbers. Frame this for a ${plan.audience} ${plan.industry} brand where budget scrutiny is typical.]

BEST FOR KPI PERFORMANCE:
[50–60 words — which scenario wins on raw KPI delivery per funnel stage (awareness → traffic → conversion), and what that means for a ${plan.audience} ${plan.industry} campaign objective.]

No bullet points. Write like a strategist presenting to a client.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1100, messages: [{ role: 'user', content: prompt }] });
  const text = message.content.find((b) => b.type === 'text');
  return NextResponse.json({ text: text && text.type === 'text' ? text.text : '' });
}
