export type OnboardingChama = {
  name: string;
  amountKes: number;
  cadence: "weekly" | "monthly";
};

type DraftLike = {
  inChama?: unknown;
  chamaName?: unknown;
  chamaAmount?: unknown;
  chamaCadence?: unknown;
};

type AnswersLike = {
  chamaMemberships?: Array<{ name?: unknown; monthlyContributionKes?: unknown }>;
};

/**
 * Reads the chama name and amount the user entered in onboarding.
 * Returns null when that session has no name and amount. Does not invent a circle.
 */
export function readOnboardingChama(raw: string | null): OnboardingChama | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { draft?: unknown; answers?: AnswersLike };
    const draftSource =
      record.draft && typeof record.draft === "object" ? record.draft : parsed;
    const draft = draftSource as DraftLike;
    const membership = record.answers?.chamaMemberships?.[0];
    const fromDraft = typeof draft.chamaName === "string" ? draft.chamaName.trim() : "";
    const fromAnswers =
      typeof membership?.name === "string" ? membership.name.trim() : "";
    const name = fromDraft || fromAnswers;
    if (!name) return null;

    const toldUs =
      draft.inChama === true ||
      (typeof membership?.monthlyContributionKes === "number" &&
        membership.monthlyContributionKes > 0);
    if (!toldUs) return null;

    const cadence = draft.chamaCadence === "weekly" ? "weekly" : "monthly";
    if (typeof draft.chamaAmount === "string" || typeof draft.chamaAmount === "number") {
      const parsedAmount = Number(String(draft.chamaAmount).replace(/,/g, "").trim());
      if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
        return { name, amountKes: Math.round(parsedAmount), cadence };
      }
    }

    if (
      typeof membership?.name === "string" &&
      membership.name.trim() &&
      typeof membership.monthlyContributionKes === "number" &&
      membership.monthlyContributionKes > 0
    ) {
      return {
        name: membership.name.trim(),
        amountKes: Math.round(membership.monthlyContributionKes),
        cadence: "monthly",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function readStoredOnboardingChama(): OnboardingChama | null {
  try {
    const fromSession = readOnboardingChama(sessionStorage.getItem("pesasense.onboarding"));
    if (fromSession) return fromSession;
  } catch {
    // Fall through to the durable snapshot.
  }
  try {
    const raw = localStorage.getItem("pesasense.chama.onboarding");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { name?: unknown; amountKes?: unknown; cadence?: unknown };
    if (typeof record.name !== "string" || !record.name.trim()) return null;
    if (typeof record.amountKes !== "number" || !(record.amountKes > 0)) return null;
    return {
      name: record.name.trim(),
      amountKes: Math.round(record.amountKes),
      cadence: record.cadence === "weekly" ? "weekly" : "monthly",
    };
  } catch {
    return null;
  }
}
