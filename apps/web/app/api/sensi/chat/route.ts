import { factsPromptBlock, type SensiFacts } from "../../../../lib/sensi-facts";

/**
 * Multi-turn Sensi chat for the voice page.
 * Same key resolution as /api/sensi/summary (OpenRouter preferred).
 * Grounded in device profile facts — no invented amounts.
 */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Body = {
  facts?: SensiFacts;
  pictureConfirmed?: boolean;
  messages?: ChatMessage[];
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

function isFacts(value: unknown): value is SensiFacts {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<SensiFacts>;
  return (
    typeof row.surplusFloorKes === "number" &&
    typeof row.surplusTypicalKes === "number" &&
    typeof row.surplusCeilingKes === "number" &&
    typeof row.incomeTypicalKes === "number" &&
    typeof row.commitmentCount === "number" &&
    typeof row.monthsCovered === "number" &&
    (row.habitKes === null || typeof row.habitKes === "number") &&
    (row.habitCadence === null ||
      row.habitCadence === "weekly" ||
      row.habitCadence === "monthly")
  );
}

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 24) return null;
  const out: ChatMessage[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const role = (row as { role?: unknown }).role;
    const content = (row as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > 1200) return null;
    out.push({ role, content: text });
  }
  if (out[out.length - 1]?.role !== "user") return null;
  return out;
}

export async function POST(req: Request) {
  const key = apiKey();
  if (!key) {
    return Response.json(
      {
        error:
          "LLM API key missing. Set OPENROUTER_API_KEY in apps/web/.env.local (never commit keys).",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.pictureConfirmed) {
    return Response.json(
      { error: "Confirm you can see Sensi's picture before talking about your numbers." },
      { status: 400 },
    );
  }

  if (!isFacts(body.facts)) {
    return Response.json(
      { error: "Profile facts are required and must be numbers from the device profile." },
      { status: 400 },
    );
  }

  const messages = normalizeMessages(body.messages);
  if (!messages) {
    return Response.json(
      { error: "Send 1–24 chat messages ending with your latest question." },
      { status: 400 },
    );
  }

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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (usesOpenRouter(key)) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000";
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME?.trim() || "PesaSense Sensi";
  }

  try {
    const res = await fetch(`${baseUrl(key)}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model(key),
        temperature: 0.55,
        messages: [
          { role: "system", content: system },
          {
            role: "system",
            content: `PROFILE FACTS:\n${factsPromptBlock(body.facts)}`,
          },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Sensi chat failed", res.status, detail.slice(0, 200));
      return Response.json(
        { error: "Sensi could not answer. Check the API key and try again." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return Response.json({ error: "Sensi returned an empty reply." }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Sensi chat error", error);
    return Response.json({ error: "Could not reach the language model. Try again shortly." }, { status: 502 });
  }
}
