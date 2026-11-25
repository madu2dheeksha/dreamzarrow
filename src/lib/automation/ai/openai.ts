import "server-only";
import { openaiConfig } from "../config";

/** Minimal OpenAI Chat Completions client with tool calling (no SDK needed). */

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export class OpenAIError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "OpenAIError";
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { tools?: ToolDef[]; temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
  attempt = 1,
): Promise<{ content: string | null; toolCalls: ToolCall[] }> {
  const cfg = openaiConfig();
  if (!cfg) throw new OpenAIError("OpenAI is not configured", 503);
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      ...(opts.tools?.length ? { tools: opts.tools, tool_choice: "auto", parallel_tool_calls: true } : {}),
      temperature: opts.temperature ?? 0.4,
      max_completion_tokens: opts.maxTokens ?? 700,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return chatCompletion(messages, opts, attempt + 1);
    }
    throw new OpenAIError(`OpenAI responded ${res.status}: ${body}`, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
  const msg = data.choices?.[0]?.message;
  return { content: msg?.content ?? null, toolCalls: msg?.tool_calls ?? [] };
}
