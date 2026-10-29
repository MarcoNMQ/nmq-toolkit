import { NextRequest, NextResponse } from 'next/server';
import { CoruscantError, coruscantChat, firstToolCallArgs } from '@/lib/coruscant';
import { BENCH_FIELD_DESC, BENCH_IS_PCT, MARKET_LABELS, PRESET_DESC, benchFieldsFor, channelKeyFor } from '@/lib/mediaplan/constants';
import type { AmazonFormat, BenchmarkField, Channel, Goal, LinkedInFormat } from '@/lib/mediaplan/types';

const TOOL_NAME = 'set_benchmarks';

// Direct port of _apply_bench_preset_ai() in media_plan.py — asks the model
// for audience/industry-calibrated benchmarks instead of the flat preset
// multipliers, since "Conservative for a B2B fintech in DE" and
// "Conservative for B2C retail in RO" should not use the same numbers.
export async function POST(req: NextRequest) {
  const { market, channel, goal, liFormat, amazonFormat, preset, audience, industry } = await req.json() as {
    market: string; channel: Channel; goal: Goal; liFormat?: LinkedInFormat; amazonFormat?: AmazonFormat; preset: string; audience: string; industry: string;
  };

  const key = channelKeyFor(channel, liFormat);
  const resolvedFields = benchFieldsFor(key, goal, amazonFormat);
  const fields: BenchmarkField[] = resolvedFields.length ? resolvedFields : ['cpm', 'ctr'];
  const properties: Record<string, { type: string; description: string }> = {};
  fields.forEach((f) => { properties[f] = { type: 'number', description: BENCH_FIELD_DESC[f] }; });

  const chLabel = channel === 'LinkedIn' && liFormat ? `LinkedIn (${liFormat})`
    : channel === 'Amazon Ads' && amazonFormat ? `Amazon Ads (${amazonFormat})`
    : channel;

  const toolDef = {
    type: 'function' as const,
    function: {
      name: TOOL_NAME,
      description: 'Return calibrated benchmark values for the specified channel/goal/audience/industry combination.',
      parameters: { type: 'object' as const, properties, required: fields },
    },
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

  try {
    const { message } = await coruscantChat({
      maxTokens: 256,
      tools: [toolDef],
      toolChoice: { type: 'function', function: { name: TOOL_NAME } },
      messages: [{ role: 'user', content: prompt }],
    });

    const input = firstToolCallArgs<Record<string, number>>(message, TOOL_NAME);
    const result: Record<string, number> = {};
    fields.forEach((f: BenchmarkField) => {
      if (!(f in input)) return;
      const v = Number(input[f]);
      if (f === 'frequency') result[f] = Math.round(v * 10) / 10;
      else if (BENCH_IS_PCT.has(f)) result[f] = Math.round(v * 1000) / 1000;
      else result[f] = Math.round(v * 100) / 100;
    });

    return NextResponse.json(result);
  } catch (err) {
    const errMessage = err instanceof CoruscantError
      ? err.message
      : err instanceof Error
        ? err.message
        : 'Unknown error calling the Coruscant gateway';
    return NextResponse.json({ error: errMessage }, { status: 502 });
  }
}
