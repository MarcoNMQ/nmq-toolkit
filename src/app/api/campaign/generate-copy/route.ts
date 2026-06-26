import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

const TOOL_NAME = 'submit_ad_copy';
const MAX_RETRIES = 2;

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description: 'Submit generated Google Demand Gen ad copy.',
  input_schema: {
    type: 'object' as const,
    properties: {
      headlines: {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 15,
        maxItems: 15,
        description: 'STRICT HARD LIMIT: 30 characters or fewer per string, counting every letter, space and punctuation mark. Count each one before submitting.',
      },
      longHeadlines: {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 5,
        maxItems: 5,
        description: 'STRICT HARD LIMIT: 90 characters or fewer per string, counting every letter, space and punctuation mark. Count each one before submitting.',
      },
      descriptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 5,
        maxItems: 5,
        description: 'STRICT HARD LIMIT: 90 characters or fewer per string, counting every letter, space and punctuation mark. Count each one before submitting.',
      },
    },
    required: ['headlines', 'longHeadlines', 'descriptions'],
  },
};

interface CopyResult {
  headlines: string[];
  longHeadlines: string[];
  descriptions: string[];
}

/** Trim to fit a max length without cutting a word in half — back up to the
 *  last space before the limit. Only used as a last resort if the model
 *  still violates the limit after being asked to fix it. */
function trimToWordBoundary(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim();
}

function findOverLimit(result: CopyResult): string[] {
  const problems: string[] = [];
  result.headlines.forEach((h, i) => {
    if (h.length > 30) problems.push(`headlines[${i}] is ${h.length} chars (max 30): "${h}"`);
  });
  result.longHeadlines.forEach((h, i) => {
    if (h.length > 90) problems.push(`longHeadlines[${i}] is ${h.length} chars (max 90): "${h}"`);
  });
  result.descriptions.forEach((d, i) => {
    if (d.length > 90) problems.push(`descriptions[${i}] is ${d.length} chars (max 90): "${d}"`);
  });
  return problems;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  const { videoTitle, productCategory, productPromoted } = await req.json();
  const client = new Anthropic({ apiKey });

  const messages: MessageParam[] = [
    {
      role: 'user',
      content: `Write Google Demand Gen video ad copy.
Video title: "${videoTitle}"
Product category: ${productCategory || 'n/a'}
Product promoted: ${productPromoted || 'n/a'}

Generate exactly 15 headlines, 5 long headlines, and 5 descriptions. Keep tone direct and benefit-led.

Character limits are STRICT and HARD — count every character including spaces and punctuation:
- Headlines: 30 characters maximum, no exceptions.
- Long headlines: 90 characters maximum, no exceptions.
- Descriptions: 90 characters maximum, no exceptions.

Before submitting, count the length of every single string yourself. If a sentence doesn't fit, rewrite it shorter — do not submit anything over the limit and rely on it being cut off later. A complete shorter sentence is always better than a longer one that gets truncated.`,
    },
  ];

  let result: CopyResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1536,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages,
    });

    const toolUse = message.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'No copy generated' }, { status: 502 });
    }

    result = toolUse.input as CopyResult;
    const problems = findOverLimit(result);
    if (problems.length === 0) break;

    if (attempt < MAX_RETRIES) {
      // Feed the violation back and ask the model to fix just those —
      // this is the "AI finds a solution" path, not a blind truncation.
      messages.push(
        { role: 'assistant', content: message.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `These entries are over the character limit:\n${problems.join('\n')}\n\nRewrite ONLY these to fit within their limit by shortening the wording (don't just cut letters off the end — write a shorter complete sentence). Return the full corrected set of 15 headlines, 5 long headlines, and 5 descriptions again, with everything else unchanged.`,
            },
          ],
        },
      );
    }
  }

  if (!result) {
    return NextResponse.json({ error: 'No copy generated' }, { status: 502 });
  }

  // Last-resort safety net only — after MAX_RETRIES, anything still over
  // the limit gets trimmed at a word boundary instead of mid-word.
  return NextResponse.json({
    headlines: result.headlines.map((h) => trimToWordBoundary(h, 30)),
    longHeadlines: result.longHeadlines.map((h) => trimToWordBoundary(h, 90)),
    descriptions: result.descriptions.map((d) => trimToWordBoundary(d, 90)),
  });
}
