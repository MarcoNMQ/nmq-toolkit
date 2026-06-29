import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior paid media strategist at NMQ Digital. You receive a structured summary of paid media campaign data and write a sharp, specific analysis.

Your output must follow this exact structure (use ## headers exactly as shown):

## Executive Summary
2-3 sentences covering the overall health of the campaign. Include total spend, main performance signal, and one headline finding.

## Awareness Performance
(Only include if awareness/impression data is present.)
Key findings on reach, CPM, video performance. Reference specific numbers.

## Consideration Performance
(Only include if click/CTR/CPC data is present.)
Key findings on traffic quality, CTR vs benchmark, CPC efficiency. Reference specific numbers.

## Conversion Performance
(Only include if conversion/ROAS data is present.)
Key findings on conversion volume, ROAS, CVR. Reference specific numbers.

## Top Opportunities
3 bullet points. Each must start with an action verb (Increase, Shift, Test, Reduce, Reallocate). Each must reference a specific metric or channel.

## Watch Points
2-3 bullet points on risks, underperformers, or trends that need attention. Be direct — no vague language.

Rules:
- Every point must reference a specific number from the data.
- No generic statements like "performance is good" without a number attached.
- Skip any section where the data is absent.
- Write like a strategist briefing a client, not like a report generator.`;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { context, deepMode } = await req.json() as { context: string; deepMode?: boolean };

  const model = deepMode ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  const stream = anthropic.messages.stream({
    model,
    max_tokens: 1800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: context }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
