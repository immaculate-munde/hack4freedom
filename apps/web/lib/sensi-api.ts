import type { SensiFacts } from "./sensi-facts";

export type SensiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApiErrorBody = { error?: string };

function readError(data: ApiErrorBody, fallback: string): string {
  const message = data.error?.trim();
  if (!message) return fallback;
  if (/API key missing|OPENROUTER/i.test(message)) {
    return "Sensi is offline right now — the coach key is not set on this server.";
  }
  return message;
}

export async function fetchSensiChat(input: {
  facts: SensiFacts;
  messages: SensiChatMessage[];
  pictureConfirmed?: boolean;
}): Promise<{ reply: string } | { error: string }> {
  try {
    const res = await fetch("/api/sensi/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pictureConfirmed: input.pictureConfirmed ?? true,
        facts: input.facts,
        messages: input.messages,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody & { reply?: string };
    if (!res.ok) {
      return { error: readError(data, "Could not get a reply from Sensi.") };
    }
    const reply = data.reply?.trim();
    if (!reply) return { error: "Sensi returned an empty reply." };
    return { reply };
  } catch {
    return { error: "Could not reach Sensi. Check your connection and try again." };
  }
}

export async function fetchSensiSummary(input: {
  facts: SensiFacts;
  purpose?: "spoken" | "overview";
  pictureConfirmed?: boolean;
}): Promise<{ summary: string } | { error: string }> {
  try {
    const res = await fetch("/api/sensi/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pictureConfirmed: input.pictureConfirmed ?? true,
        facts: input.facts,
        purpose: input.purpose ?? "spoken",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiErrorBody & { summary?: string };
    if (!res.ok) {
      return { error: readError(data, "Could not get a summary from Sensi.") };
    }
    const summary = data.summary?.trim();
    if (!summary) return { error: "Sensi returned an empty summary." };
    return { summary };
  } catch {
    return { error: "Could not reach Sensi. Check your connection and try again." };
  }
}

export function factsCacheKey(facts: SensiFacts): string {
  return [
    facts.surplusFloorKes,
    facts.surplusTypicalKes,
    facts.surplusCeilingKes,
    facts.habitKes ?? "x",
    facts.habitCadence ?? "x",
    facts.incomeTypicalKes,
    facts.commitmentCount,
    facts.monthsCovered,
  ].join(":");
}
