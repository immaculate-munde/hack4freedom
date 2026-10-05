import { type SensiFacts } from "../../../../lib/sensi-facts";
import { sensiLlmChat, sensiLlmConfigured } from "../../../../lib/sensi-llm-server";

/**
 * Multi-turn Sensi chat for the voice page and floating guide.
 * Same model as Telegram coach (OpenRouter preferred).
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
  if (!sensiLlmConfigured()) {
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

  const reply = await sensiLlmChat(body.facts, messages);
  if (!reply) {
    return Response.json(
      { error: "Sensi could not answer. Check the API key and try again." },
      { status: 502 },
    );
  }

  return Response.json({ reply });
}
