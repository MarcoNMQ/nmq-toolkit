import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { buildPlanSummary } from '@/lib/mediaplan/aiContext';
import { marketBudget } from '@/lib/mediaplan/budgets';
import { MARKET_LABELS } from '@/lib/mediaplan/constants';
import type { AiChatKind, ChatMessage, PlanConfig, Scenario } from '@/lib/mediaplan/types';

// Direct port of the three chat_input handlers in media_plan.py — first
// user turn carries the full plan-context system block prepended, every
// turn after that is plain (the API call still receives full history
// either way, since Anthropic's API is stateless per-call).
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });

  const { kind, scenario, plan, history, userInput } = await req.json() as {
    kind: AiChatKind; scenario: Scenario; plan: PlanConfig; history: ChatMessage[]; userInput: string;
  };

  const summary = buildPlanSummary(scenario, plan);
  const channelsInUse = [...new Set(scenario.markets.flatMap((m) => m.goals.flatMap((g) => g.channels.map((c) => c.channel))))];

  let systemCtx = '';
  if (kind === 'insights') {
    systemCtx = `You are a senior paid media strategist advising a ${plan.audience} client in the ${plan.industry || 'general'} sector. Here is the full media plan:\n\n${summary}\n\nAnswer in 80–150 words. Be direct, reference actual numbers from the plan, frame everything for ${plan.audience} ${plan.industry}. No bullet points.`;
  } else if (kind === 'recs') {
    const mktList = scenario.markets.map((m) => `- ${MARKET_LABELS[m.market] ?? m.market}: ${m.pct.toFixed(1)}% (€${marketBudget(scenario, m).toLocaleString(undefined, { maximumFractionDigits: 0 })})`).join('\n');
    systemCtx = `You are a senior paid media strategist advising a ${plan.audience} client in the ${plan.industry || 'general'} sector. Here is the full media plan:\n\n${summary}\n\nCurrent market split:\n${mktList}\n\nChannels in use: ${channelsInUse.join(', ') || 'various'}. Answer in 80–150 words. Be direct, reference actual numbers, frame for ${plan.audience} ${plan.industry}. No bullet points.`;
  } else {
    const benchLines: string[] = [];
    scenario.markets.forEach((m) => m.goals.forEach((g) => g.channels.forEach((c) => {
      const b = c.benchmark;
      benchLines.push(c.channel === 'Search'
        ? `${MARKET_LABELS[m.market] ?? m.market} / Search (${g.goal}): CPC €${(b.cpc ?? 0).toFixed(2)}, CTR ${((b.ctr ?? 0) * 100).toFixed(1)}%`
        : `${MARKET_LABELS[m.market] ?? m.market} / ${c.channel} (${g.goal}): CPM €${(b.cpm ?? 0).toFixed(2)}, CTR ${((b.ctr ?? 0) * 100).toFixed(2)}%`);
    })));
    systemCtx = `You are a senior paid media strategist advising a ${plan.audience} client in the ${plan.industry || 'general'} sector. The plan uses these channels: ${channelsInUse.join(', ') || 'various digital channels'}. Benchmarks in use:\n${benchLines.join('\n')}\n\nAnswer in 80–150 words. Be direct, reference actual numbers, frame for ${plan.audience} ${plan.industry}. No bullet points.`;
  }

  const apiMessages: MessageParam[] = history.map((m, i) => (
    i === 0 && m.role === 'user' ? { role: 'user', content: `${systemCtx}\n\n---\n\n${m.content}` } : { role: m.role, content: m.content }
  ));
  const firstTurn = history.length === 0;
  apiMessages.push({ role: 'user', content: firstTurn ? `${systemCtx}\n\n---\n\n${userInput}` : userInput });

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 400, messages: apiMessages });
  const text = message.content.find((b) => b.type === 'text');
  return NextResponse.json({ reply: text && text.type === 'text' ? text.text : '' });
}
