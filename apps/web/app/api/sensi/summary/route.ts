import { factsPromptBlock, type SensiFacts } from "../../../../lib/sensi-facts";

/**
 * Thin Qwen ("Quinn") summary for Sensi voice.
 * Env (first match): QWEN_API_KEY, DASHSCOPE_API_KEY, or ALIBABA_CLOUD_API_KEY.
 * Optional: QWEN_BASE_URL (OpenAI-compatible), QWEN_MODEL (default qwen-plus).
 * Never invent numbers — client sends profile facts; the prompt forbids new figures.
 */

type Body = {
  facts?: SensiFacts;
  pictureConfirmed?: boolean;
};

function apiKey(): string | null {
  return (
    process.env.QWEN_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.ALIBABA_CLOUD_API_KEY?.trim() ||
    null
  );
}

function baseUrl(): string {
  return (
    process.env.QWEN_BASE_URL?.trim() ||
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
  );
}

function model(): string {
  return process.env.QWEN_MODEL?.trim() || "qwen-plus";
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

export async function POST(req: Request) {
  const key = apiKey();
  if (!key) {
    return Response.json(
      {
        error:
          "Qwen API key missing. Set QWEN_API_KEY or DASHSCOPE_API_KEY in apps/web/.env.local (never commit keys).",
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
      { error: "Confirm you can see Sensi's picture before asking for a spoken summary." },
      { status: 400 },
    );
  }

  if (!isFacts(body.facts)) {
    return Response.json({ error: "Profile facts are required and must be numbers from the device profile." }, { status: 400 });
  }

  const system = [
    "You are Sensi (voice name Quinn), a calm Kenyan money education guide in PesaSense.",
    "Education only — not financial advice. Bitcoin can lose value.",
    "Use ONLY the numbers in the PROFILE FACTS block. Never invent, estimate, or round to new amounts.",
    "Speak in short plain English (or mix light Kiswahili greetings). Max 120 words.",
    "Remind the listener they approve each purchase; nothing is sent on its own.",
  ].join(" ");

  const user = `PROFILE FACTS:\n${factsPromptBlock(body.facts)}\n\nGive a short spoken breakdown of this picture.`;

  try {
    const res = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model(),
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Qwen summary failed", res.status, detail.slice(0, 200));
      return Response.json(
        { error: "Qwen could not write a summary. Check the API key and try again." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      return Response.json({ error: "Qwen returned an empty summary." }, { status: 502 });
    }

    return Response.json({ summary, facts: body.facts });
  } catch (error) {
    console.error("Qwen summary error", error);
    return Response.json({ error: "Could not reach Qwen. Try again shortly." }, { status: 502 });
  }
}
