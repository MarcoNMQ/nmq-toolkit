// Thin client for NMQ's internal LLM gateway (Coruscant), an
// OpenAI-chat-completions-compatible proxy in front of several models
// (self-hosted open models + OpenAI). Used instead of the Anthropic SDK
// for features that don't need a specific Claude model.
export const CORUSCANT_MODEL = 'gpt-4o-mini';

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

export async function coruscantChat(opts: {
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

/** Parses the first tool call's JSON arguments, or throws a CoruscantError. */
export function firstToolCallArgs<T>(message: { tool_calls?: CoruscantToolCall[] }, expectedName: string): T {
  const call = message.tool_calls?.[0];
  if (!call || call.function.name !== expectedName) {
    throw new CoruscantError(`Expected a "${expectedName}" tool call, got none`);
  }
  return JSON.parse(call.function.arguments) as T;
}
