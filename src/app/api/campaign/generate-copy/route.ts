import { NextRequest, NextResponse } from 'next/server';
import { CoruscantError, coruscantChat, firstToolCallArgs, type CoruscantMessage } from '@/lib/coruscant';

const TOOL_NAME = 'submit_ad_copy';
const MAX_RETRIES = 2;

const TOOL_DEF = {
  type: 'function' as const,
  function: {
    name: TOOL_NAME,
    description: 'Submit generated Google Demand Gen ad copy.',
    parameters: {
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
  const { videoTitle, productCategory, productPromoted, language } = await req.json();
  const lang: string = language || 'English';

  const messages: CoruscantMessage[] = [
    {
      role: 'user',
      content: `Write Google Demand Gen video ad copy.
Video title: "${videoTitle}"
Product category: ${productCategory || 'n/a'}
Product promoted: ${productPromoted || 'n/a'}
Language: ${lang} — write every single string in ${lang}. Do not use English unless ${lang} IS English.

Generate exactly 15 headlines, 5 long headlines, and 5 descriptions. Keep tone direct and benefit-led. Avoid clickbait — no exaggerated claims, no "You won't believe…" or "This will change your life" style phrasing, no false urgency. Copy must be honest and accurate to the product so it does not get flagged by Google Ads policies.

Character limits are STRICT and HARD — count every character including spaces and punctuation:
- Headlines: 30 characters maximum, no exceptions.
- Long headlines: 90 characters maximum, no exceptions.
- Descriptions: 90 characters maximum, no exceptions.

These limits apply equally in all languages. ${lang !== 'English' ? `${lang} words are often longer than English — write shorter, punchier phrases and avoid compound nouns that exceed the limit on their own. ` : ''}Before submitting, count the length of every single string yourself. If a sentence doesn't fit, rewrite it shorter — do not submit anything over the limit and rely on it being cut off later. A complete shorter sentence is always better than a longer one that gets truncated.`,
    },
  ];

  let result: CopyResult | null = null;

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { message } = await coruscantChat({
        maxTokens: 1536,
        tools: [TOOL_DEF],
        toolChoice: { type: 'function', function: { name: TOOL_NAME } },
        messages,
      });

      const toolCall = message.tool_calls?.[0];
      if (!toolCall) {
        return NextResponse.json({ error: 'No copy generated' }, { status: 502 });
      }

      result = firstToolCallArgs<CopyResult>(message, TOOL_NAME);
      const problems = findOverLimit(result);
      if (problems.length === 0) break;

      if (attempt < MAX_RETRIES) {
        // Feed the violation back and ask the model to fix just those —
        // this is the "AI finds a solution" path, not a blind truncation.
        messages.push(
          { role: 'assistant', content: message.content ?? null, tool_calls: message.tool_calls },
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `These entries are over the character limit:\n${problems.join('\n')}\n\nRewrite ONLY these to fit within their limit by shortening the wording (don't just cut letters off the end — write a shorter complete sentence). Return the full corrected set of 15 headlines, 5 long headlines, and 5 descriptions again, with everything else unchanged.`,
          },
        );
      }
    }
  } catch (err) {
    const message = err instanceof CoruscantError
      ? err.message
      : err instanceof Error
        ? err.message
        : 'Unknown error calling the Coruscant gateway';
    return NextResponse.json({ error: message }, { status: 502 });
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
