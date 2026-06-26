import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BENCH_FIELD_DESC, BENCH_FIELDS, BENCH_IS_PCT, MARKET_LABELS, PRESET_DESC, channelKeyFor } from '@/lib/mediaplan/constants';
import type { BenchmarkField, Channel, Goal, LinkedInFormat } from '@/lib/mediaplan/types';

// Direct port of _apply_bench_preset_ai() in media_plan.py — asks Claude
// for audience/industry-calibrated benchmarks instead of the flat preset
// multipliers, since "Conservative for a B2B fintech in DE" and
// "Conservative for B2C retail in RO" should not use the same numbers.
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  const { market, channel, goal, liFormat, preset, audience, industry } = await req.json() as {
    market: string; channel: Channel; goal: Goal; liFormat?: LinkedInFormat; preset: string; audience: string; industry: string;
  };

  const key = channelKeyFor(channel, liFormat);
  const fields = BENCH_FIELDS[`${key}|${goal}`] ?? ['cpm', 'ctr'];
  const properties: Record<string, { type: string; description: string }> = {};
  fields.forEach((f) => { properties[f] = { type: 'number', description: BENCH_FIELD_DESC[f] }; });

  const chLabel = channel === 'LinkedIn' && liFormat ? `LinkedIn (${liFormat})` : channel;

  const toolDef = {
    name: 'set_benchmarks',
    description: 'Return calibrated benchmark values for the specified channel/goal/audience/industry combination.',
    input_schema: { type: 'object' as const, properties, required: fields },
  };

  const prompt = `You are a digital advertising benchmark expert specialising in European paid media.
Provide **${preset}** benchmark values for:
- Channel: ${chLabel}
- Phase / Goal: ${goal}
- Audience: ${audience || 'n/a'}
- Industry: ${industry || 'n/a'}
- Market: ${MARKET_LABELS[market] ?? market}

${preset} means: ${PRESET_DESC[preset] ?? ''}.

Base your answer on 2025-2026 European digital advertising benchmarks specific to this audience type and industry. Adjust for the market — Western EU (DE, UK, FR, NL) costs more than Eastern EU (PL, RO, BG). Use the set_benchmarks tool to return the values. All rate fields must be decimal proportions, NOT percentages.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    tools: [toolDef],
    tool_choice: { type: 'tool', name: 'set_benchmarks' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'No benchmarks generated' }, { status: 502 });
  }

  const input = toolUse.input as Record<string, number>;
  const result: Record<string, number> = {};
  fields.forEach((f: BenchmarkField) => {
    if (!(f in input)) return;
    const v = Number(input[f]);
    if (f === 'frequency') result[f] = Math.round(v * 10) / 10;
    else if (BENCH_IS_PCT.has(f)) result[f] = Math.round(v * 1000) / 1000;
    else result[f] = Math.round(v * 100) / 100;
  });

  return NextResponse.json(result);
}
