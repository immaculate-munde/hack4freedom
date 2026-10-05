import {
  readOnboardingChama,
  type OnboardingChama,
} from "./onboarding-chama";

/** Explicit join/use intent for Chama. Survives after onboarding draft is cleared. */
export const CHAMA_OPT_IN_KEY = "pesasense.chama.optIn";

/** Snapshot of chama details from onboarding (name/amount), kept after draft clear. */
export const CHAMA_ONBOARDING_SNAPSHOT_KEY = "pesasense.chama.onboarding";

const CHAMA_CIRCLE_KEY = "pesasense.chama.v1";
const ONBOARDING_DRAFT_KEY = "pesasense.onboarding";

/**
 * Whether Chama should appear in nav and be fully openable.
 * True when the user opted in (onboarding or soft gate), already said they are
 * in a chama, or has a saved circle from before this flag existed.
 */
export function readChamaOptIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const flag = localStorage.getItem(CHAMA_OPT_IN_KEY);
    if (flag === "true") return true;
    if (flag === "false") return false;
    if (localStorage.getItem(CHAMA_CIRCLE_KEY)) return true;
    return readOnboardingChamaIntent(sessionStorage.getItem(ONBOARDING_DRAFT_KEY)) === true;
  } catch {
    return false;
  }
}

export function writeChamaOptIn(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAMA_OPT_IN_KEY, value ? "true" : "false");
    window.dispatchEvent(new Event("pesasense.chama.optIn"));
  } catch {
    // Intent still applies for this visit via in-memory UI state.
  }
}

/**
 * Reads join intent from an onboarding session payload.
 * - true: wantsChama or already in a chama
 * - false: explicitly declined both
 * - null: skipped / unknown
 */
export function readOnboardingChamaIntent(raw: string | null): boolean | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as {
      wantsChama?: unknown;
      draft?: { wantsChama?: unknown; inChama?: unknown };
      answers?: { chamaMemberships?: unknown[] };
    };
    const draft = record.draft && typeof record.draft === "object" ? record.draft : null;
    const wants =
      record.wantsChama === true ||
      draft?.wantsChama === true ||
      draft?.inChama === true ||
      (Array.isArray(record.answers?.chamaMemberships) &&
        record.answers.chamaMemberships.length > 0);
    if (wants) return true;

    const declined =
      (record.wantsChama === false || draft?.wantsChama === false) &&
      (draft?.inChama === false || draft?.inChama == null) &&
      (!Array.isArray(record.answers?.chamaMemberships) ||
        record.answers.chamaMemberships.length === 0);
    if (declined && (record.wantsChama === false || draft?.wantsChama === false)) {
      return false;
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist opt-in (and onboarding chama snapshot) from the current onboarding draft. */
export function persistChamaOptInFromOnboarding(raw: string | null): void {
  const intent = readOnboardingChamaIntent(raw);
  if (intent === true) writeChamaOptIn(true);
  else if (intent === false) writeChamaOptIn(false);

  const snapshot = readOnboardingChama(raw);
  if (snapshot) writeOnboardingChamaSnapshot(snapshot);
}

export function writeOnboardingChamaSnapshot(chama: OnboardingChama): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAMA_ONBOARDING_SNAPSHOT_KEY, JSON.stringify(chama));
  } catch {
    // Best-effort; circle flow still works without the name.
  }
}

export function readOnboardingChamaSnapshot(): OnboardingChama | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHAMA_ONBOARDING_SNAPSHOT_KEY);
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
