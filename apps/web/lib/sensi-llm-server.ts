import { factsPromptBlock, type SensiFacts } from "./sensi-facts";

/**
 * Shared Sensi LLM calls for web API routes and the Telegram webhook.
 * Same keys / model as /api/sensi/chat and /api/sensi/summary.
 */

export type SensiLlmMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function apiKey(): string | null {
  return (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.QWEN_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.ALIBABA_CLOUD_API_KEY?.trim() ||
    null
  );
}

function usesOpenRouter(key: string): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim()) || key.startsWith("sk-or-");
}

function baseUrl(key: string): string {
  const explicit =
    process.env.OPENROUTER_BASE_URL?.trim() ||
    process.env.QWEN_BASE_URL?.trim() ||
    process.env.MODELSCOPE_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (usesOpenRouter(key)) return "https://openrouter.ai/api/v1";
  return "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
}

function model(key: string): string {
  return (
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.QWEN_MODEL?.trim() ||
    (usesOpenRouter(key) ? "openai/gpt-4o-mini" : "qwen-plus")
  );
}

function authHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (usesOpenRouter(key)) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000";
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME?.trim() || "PesaSense Sensi";
  }
  return headers;
}

async function complete(input: {
  messages: SensiLlmMessage[];
  temperature: number;
  label: string;
}): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;

  try {
    const res = await fetch(`${baseUrl(key)}/chat/completions`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({
        model: model(key),
        temperature: input.temperature,
        messages: input.messages,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Sensi ${input.label} failed`, res.status, detail.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error(`Sensi ${input.label} error`, error);
    return null;
  }
}

export function sensiLlmConfigured(): boolean {
  return Boolean(apiKey());
}

/** Short on-screen / Telegram overview of the surplus picture. */
export async function sensiLlmOverview(facts: SensiFacts): Promise<string | null> {
  const system = [
    "You are Sensi, a kind Kenyan money coach in PesaSense — warm and easy to read in Telegram or on a phone screen.",
    "Education only — not financial advice. Bitcoin can go up or down; never promise returns.",
    "Use ONLY the numbers in the PROFILE FACTS block. Never invent, guess, or round to new amounts.",
    "Write 2–4 short sentences. Light Kiswahili greetings are fine; keep the rest clear English.",
    "Say “money left after bills” before any word like surplus. End with one clear next step (habit, buffer, or wait).",
    "Max 70 words. No bullet lists.",
  ].join(" ");

  return complete({
    label: "overview",
    temperature: 0.5,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `PROFILE FACTS:\n${factsPromptBlock(facts)}\n\nWrite a short summary of this money picture.`,
      },
    ],
  });
}

/** Spoken walkthrough (web /sensi voice path). */
export async function sensiLlmSpokenSummary(facts: SensiFacts): Promise<string | null> {
  const system = [
    "You are Sensi, a kind Kenyan money coach in PesaSense — warm, patient, and easy to follow out loud.",
    "Education only — not financial advice. Bitcoin can go up or down; never promise returns.",
    "Use ONLY the numbers in the PROFILE FACTS block. Never invent, guess, or round to new amounts.",
    "Speak in short everyday English for listening. Light Kiswahili or Sheng greetings are fine; keep explanations clear.",
    "Avoid jargon. Say “money left after bills” before any word like surplus. Be encouraging, not formal. Max 120 words.",
    "Remind the listener they approve each purchase; nothing is sent on its own.",
  ].join(" ");

  return complete({
    label: "spoken",
    temperature: 0.5,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `PROFILE FACTS:\n${factsPromptBlock(facts)}\n\nGive a short spoken walkthrough of this money picture in kind, simple words.`,
      },
    ],
  });
}

/** Multi-turn coach reply grounded in profile facts. */
export async function sensiLlmChat(
  facts: SensiFacts,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string | null> {
  if (messages.length === 0 || messages.length > 24) return null;
  if (messages[messages.length - 1]?.role !== "user") return null;

  const system = [
    "You are Sensi, a kind Kenyan money coach in PesaSense — like a patient friend who explains things simply.",
    "Education only — not financial advice. Bitcoin can go up or down; never promise returns.",
    "Use ONLY the numbers in the PROFILE FACTS block. Never invent, guess, or round to new amounts.",
    "Speak in short, everyday English a teenager could follow. Light Kiswahili or Sheng greetings (habari, poa, sawa) are welcome; keep the rest clear English.",
    "Avoid bank jargon. If you must use a word like surplus, buffer, or commitment, say the plain meaning first (e.g. “money left after bills”).",
    "Be warm, encouraging, and calm — never lecturing or formal. Max 90 words. Prefer short sentences.",
    "Remind them they approve each purchase; nothing is sent on its own.",
    "If they ask something outside these facts, say honestly what you can and cannot see from this phone profile.",
  ].join(" ");

  return complete({
    label: "chat",
    temperature: 0.55,
    messages: [
      { role: "system", content: system },
      { role: "system", content: `PROFILE FACTS:\n${factsPromptBlock(facts)}` },
      ...messages,
    ],
  });
}
