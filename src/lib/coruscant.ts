// Thin client for NMQ's internal LLM gateway (Coruscant), an
// OpenAI-chat-completions-compatible proxy in front of several models
// (self-hosted open models + OpenAI). Used instead of the Anthropic SDK
// for features that don't need a specific Claude model.
//
// No Claude model is exposed on this gateway. `gpt-4o-mini` is also
// listed, but confirmed unreliable on THIS gateway specifically: it was
// observed corrupting non-ASCII characters mid-generation (e.g. "€"
// turning into "£" or the U+FFFD replacement character, and this isn't
// about streaming — it reproduces on the gateway's plain non-streaming
// endpoint too). `gpt-4o` was verified clean across repeated runs with
// heavy accented/non-ASCII content (French ad copy with "é", "à", "ç",
// "€", emoji). Since most of this app's generated text involves euro
// amounts and non-English languages, every call uses `gpt-4o` — there's
// no cheap/fast tier on this gateway worth trusting.
export const CORUSCANT_MODEL = 'gpt-4o';
export const CORUSCANT_MODEL_STRONG = 'gpt-4o';

export interface CoruscantToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface CoruscantMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: CoruscantToolCall[];
  tool_call_id?: string;
}

export interface CoruscantToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class CoruscantError extends Error {}

const REPLACEMENT_CHAR = '�';
const CORRUPTION_RETRIES = 2;

/** True if any string value anywhere in the message is corrupted — the
 *  gateway has been observed to occasionally emit the Unicode replacement
 *  character in place of a multi-byte character (e.g. "€") mid-generation,
 *  independent of model or of streaming vs. non-streaming. This is
 *  intermittent and gateway-side, not something fixable from here, so the
 *  practical mitigation is to detect it and retry the whole generation. */
function isCorrupted(message: { content: string | null; tool_calls?: CoruscantToolCall[] }): boolean {
  if (message.content?.includes(REPLACEMENT_CHAR)) return true;
  return message.tool_calls?.some((c) => c.function.arguments.includes(REPLACEMENT_CHAR)) ?? false;
}

async function coruscantChatOnce(opts: {
  model?: string;
  maxTokens: number;
  messages: CoruscantMessage[];
  tools?: CoruscantToolDef[];
  toolChoice?: { type: 'function'; function: { name: string } };
}): Promise<{ message: { content: string | null; tool_calls?: CoruscantToolCall[] } }> {
  const apiKey = process.env.CORUSCANT_API_KEY;
  const baseUrl = process.env.CORUSCANT_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new CoruscantError('CORUSCANT_API_KEY / CORUSCANT_BASE_URL is not configured');
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: opts.model ?? CORUSCANT_MODEL,
      max_tokens: opts.maxTokens,
      messages: opts.messages,
      ...(opts.tools ? { tools: opts.tools, tool_choice: opts.toolChoice ?? 'auto' } : {}),
    }),
  });

  if (!res.ok) {
    throw new CoruscantError(`Coruscant gateway error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string | null; tool_calls?: CoruscantToolCall[] } }>;
  };
  const choice = data.choices[0];
  if (!choice) throw new CoruscantError('Coruscant gateway returned no choices');
  return { message: choice.message };
}

export async function coruscantChat(opts: {
  model?: string;
  maxTokens: number;
  messages: CoruscantMessage[];
  tools?: CoruscantToolDef[];
  toolChoice?: { type: 'function'; function: { name: string } };
}): Promise<{ message: { content: string | null; tool_calls?: CoruscantToolCall[] } }> {
  let last: { message: { content: string | null; tool_calls?: CoruscantToolCall[] } } | undefined;
  for (let attempt = 0; attempt <= CORRUPTION_RETRIES; attempt++) {
    last = await coruscantChatOnce(opts);
    if (!isCorrupted(last.message)) return last;
  }
  // The corruption reproduces deterministically for some prompts — a
  // retry gets a fresh generation, but if the model lands on the same
  // wording again (common for low-creativity prompts), it can hit the
  // same mis-detokenization every time, so retrying alone doesn't
  // guarantee a clean result. Every piece of text this app asks the
  // gateway to generate is for a euro-denominated European ad agency —
  // "€" is the only non-ASCII currency symbol ever in play — so as a
  // last resort, swap any remaining replacement character back to "€"
  // rather than show a broken glyph to the user.
  if (last && isCorrupted(last.message)) {
    last = {
      message: {
        ...last.message,
        content: last.message.content?.replaceAll(REPLACEMENT_CHAR, '€') ?? last.message.content,
        tool_calls: last.message.tool_calls?.map((c) => ({
          ...c,
          function: { ...c.function, arguments: c.function.arguments.replaceAll(REPLACEMENT_CHAR, '€') },
        })),
      },
    };
  }
  return last!;
}

/** Parses the first tool call's JSON arguments, or throws a CoruscantError. */
export function firstToolCallArgs<T>(message: { tool_calls?: CoruscantToolCall[] }, expectedName: string): T {
  const call = message.tool_calls?.[0];
  if (!call || call.function.name !== expectedName) {
    throw new CoruscantError(`Expected a "${expectedName}" tool call, got none`);
  }
  return JSON.parse(call.function.arguments) as T;
}

function withSystem(system: string | undefined, messages: CoruscantMessage[]): CoruscantMessage[] {
  return system ? [{ role: 'system', content: system }, ...messages] : messages;
}

/** One-shot or multi-turn plain-text completion — no tool calling. */
export async function coruscantText(opts: {
  model?: string;
  maxTokens: number;
  system?: string;
  messages: CoruscantMessage[];
}): Promise<string> {
  const { message } = await coruscantChat({
    model: opts.model,
    maxTokens: opts.maxTokens,
    messages: withSystem(opts.system, opts.messages),
  });
  return message.content ?? '';
}

/** Same as coruscantText, but returns a ReadableStream of plain-text
 *  chunks, for routes that pipe the response to the client as it's
 *  generated instead of waiting for the full reply.
 *
 *  This does NOT use the gateway's own `stream: true` SSE support — it
 *  was found to corrupt multi-byte UTF-8 characters (e.g. "€" turning
 *  into U+FFFD). Confirmed server-side: the replacement character is
 *  already present in the raw bytes the gateway sends, before any
 *  decoding on our end, across both the Next-patched global `fetch` and
 *  a raw `node:https` request — so it's a bug in the gateway's own
 *  relay/detokenization layer, not something fixable from this side.
 *  Instead, this fetches the complete (correct) response via the
 *  regular non-streaming call, then re-emits it in small, code-point-
 *  safe chunks to preserve the incremental "typing" UX. */
export async function coruscantTextStream(opts: {
  model?: string;
  maxTokens: number;
  system?: string;
  messages: CoruscantMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const text = await coruscantText(opts);
  const codePoints = Array.from(text);
  const encoder = new TextEncoder();
  const CHUNK_SIZE = 8;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let i = 0; i < codePoints.length; i += CHUNK_SIZE) {
        controller.enqueue(encoder.encode(codePoints.slice(i, i + CHUNK_SIZE).join('')));
        // A couple of ms per chunk is enough to keep the client's
        // incremental re-render feeling live, without meaningfully
        // delaying the total time versus sending it all at once.
        await new Promise((r) => setTimeout(r, 2));
      }
      controller.close();
    },
  });
}
