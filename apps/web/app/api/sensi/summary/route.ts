import { type SensiFacts } from "../../../../lib/sensi-facts";
import {
  sensiLlmConfigured,
  sensiLlmOverview,
  sensiLlmSpokenSummary,
} from "../../../../lib/sensi-llm-server";

/**
 * Thin LLM summary for Sensi (OpenRouter or OpenAI-compatible).
 * purpose=overview — Overview card + Telegram post-import
 * purpose=spoken — /sensi voice walkthrough
 */

type Body = {
  facts?: SensiFacts;
  pictureConfirmed?: boolean;
  purpose?: "spoken" | "overview";
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

  const purpose = body.purpose === "overview" ? "overview" : "spoken";

  if (purpose === "spoken" && !body.pictureConfirmed) {
    return Response.json(
      { error: "Confirm you can see Sensi's picture before asking for a spoken summary." },
      { status: 400 },
    );
  }

  if (!isFacts(body.facts)) {
    return Response.json(
      { error: "Profile facts are required and must be numbers from the device profile." },
      { status: 400 },
    );
  }

  const summary =
    purpose === "overview"
      ? await sensiLlmOverview(body.facts)
      : await sensiLlmSpokenSummary(body.facts);

  if (!summary) {
    return Response.json(
      { error: "Sensi could not write a summary. Check the API key and try again." },
      { status: 502 },
    );
  }

  return Response.json({ summary, facts: body.facts });
}
