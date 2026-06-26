import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BENCHMARK_SOURCES, buildPlanSummary } from '@/lib/mediaplan/aiContext';
import { marketBudget } from '@/lib/mediaplan/budgets';
import { MARKET_LABELS } from '@/lib/mediaplan/constants';
import type { AiChatKind, PlanConfig, Scenario } from '@/lib/mediaplan/types';

// Direct port of the "Generate Plan Insights" / "Generate Market
// Recommendations" / "Generate Benchmark Explanations" buttons in
// media_plan.py — one-shot prompts (not chat), each framed for the
// plan's actual audience/industry/numbers.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });

  const { kind, scenario, plan } = await req.json() as { kind: AiChatKind; scenario: Scenario; plan: PlanConfig };
  const summary = buildPlanSummary(scenario, plan);
  const channelsInUse = [...new Set(scenario.markets.flatMap((m) => m.goals.flatMap((g) => g.channels.map((c) => c.channel))))];

  let prompt = '';
  let maxTokens = 600;

  if (kind === 'insights') {
    prompt = `You are a senior paid media strategist reviewing a digital media plan for a ${plan.audience} brand in the ${plan.industry || 'general'} sector.

${summary}

Write a concise but sharp analysis (150–200 words). Cover:
1. Overall scale and reach potential given the budget and markets — frame this for ${plan.audience} ${plan.industry} audiences specifically
2. Channel mix strengths or gaps for the selected goals — comment on what works for ${plan.audience} in this sector
3. Any markets where the allocation looks strong or under-invested for this industry
4. One clear watch-out or risk relevant to ${plan.audience} ${plan.industry} campaigns

Be direct. No headers. No bullet points. Write in plain paragraphs like a strategist talking to a client.

After the analysis, add a 'Sources' section listing 2–4 of the most relevant URLs from the reference list below that support your specific points. Copy the URLs exactly as written — do not modify or invent any URL.

Reference sources:
${BENCHMARK_SOURCES}`;
  } else if (kind === 'recs') {
    maxTokens = 700;
    const mktList = scenario.markets.map((m) => `- ${MARKET_LABELS[m.market] ?? m.market}: ${m.pct.toFixed(1)}% (€${marketBudget(scenario, m).toLocaleString(undefined, { maximumFractionDigits: 0 })})`).join('\n');
    prompt = `You are a senior paid media strategist advising a ${plan.audience} brand in the ${plan.industry || 'general'} sector on market budget allocation across ${channelsInUse.join(', ') || 'digital channels'}.

${summary}

Current market split:
${mktList || 'No data.'}

Write exactly 3 recommendation sections, each starting with its label on its own line:

CURRENT ALLOCATION:
[50–60 words assessing whether the current market split makes sense for a ${plan.audience} ${plan.industry} brand — consider CPM efficiency vs audience quality for this sector and whether the channels in use (${channelsInUse.join(', ') || 'the selected channels'}) justify the current weights]

REBALANCING OPTION:
[50–60 words suggesting one concrete rebalancing move — e.g. shift 10% from X to Y — grounded in what works for ${plan.audience} audiences in ${plan.industry} and the channel mix being used]

BEST ALLOCATION:
[50–60 words giving a direct final recommendation on the optimal split, framed specifically for a ${plan.audience} ${plan.industry} brand running ${channelsInUse.join(', ') || 'these channels'}]

SOURCES:
[List 2–3 of the most relevant URLs from the reference list below, copied exactly — do not modify or invent any URL]

Be direct. No bullet points within sections.

Reference sources:
${BENCHMARK_SOURCES}`;
  } else {
    const benchLines: string[] = [];
    scenario.markets.forEach((m) => m.goals.forEach((g) => g.channels.forEach((c) => {
      const b = c.benchmark;
      if (c.channel === 'Search') {
        benchLines.push(`${MARKET_LABELS[m.market] ?? m.market} / Search (${g.goal}): CPC €${(b.cpc ?? 0).toFixed(2)}, CTR ${((b.ctr ?? 0) * 100).toFixed(1)}%, Click→Session ${((b.click_to_session ?? 0.85) * 100).toFixed(0)}%`);
      } else {
        let line = `${MARKET_LABELS[m.market] ?? m.market} / ${c.channel} (${g.goal}): CPM €${(b.cpm ?? 0).toFixed(2)}, CTR ${((b.ctr ?? 0) * 100).toFixed(2)}%, Freq ${(b.frequency ?? 3).toFixed(1)}`;
        if (c.channel === 'YouTube') line += `, View Rate ${((b.view_rate ?? 0.31) * 100).toFixed(0)}%`;
        benchLines.push(line);
      }
    })));
    prompt = `You are a senior paid media strategist explaining benchmark values to a ${plan.audience} client in the ${plan.industry || 'general'} sector.

The plan uses these channels: ${channelsInUse.join(', ') || 'various digital channels'}.

Benchmarks in use:
${benchLines.join('\n')}

Write a short explanation (150–180 words) covering:
- What CPM / CPC levels mean in the context of ${plan.audience} ${plan.industry} campaigns — why some markets cost more and whether that premium makes sense for this sector
- Why CTR and View Rate vary between markets and channels — relate this to ${plan.audience} audience behaviour (e.g. professional vs consumer mindset, intent signals)
- What Frequency means for brand recall in ${plan.industry}, and how it should be managed differently depending on whether the goal is awareness or conversion

Write in plain English. No jargon. One paragraph per topic. Frame everything for someone who understands the ${plan.industry} business, not a media buyer.

After the explanation, add a 'Sources' section listing 2–4 of the most relevant URLs from the reference list below, copied exactly — do not modify or invent any URL.

Reference sources:
${BENCHMARK_SOURCES}`;
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = message.content.find((b) => b.type === 'text');
  return NextResponse.json({ text: text && text.type === 'text' ? text.text : '' });
}
