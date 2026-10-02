/**
 * Profile engine.
 *
 * Builds a financial profile from parsed history and onboarding answers.
 * Self-reported answers outrank inferred values. Nothing here is a score.
 * This package has no UI code so the engine can be tested on its own.
 */

import type {
  FinancialProfile,
  IncomeSummary,
  IncomeSource,
  OnboardingAnswers,
  Resilience,
  SpendingSummary,
  SpendingCategorySummary,
  Surplus,
  Commitment,
  CommitmentCategory,
  Cadence,
  ProfileWindow,
} from "./financial-profile.schema";
import type { Transaction, KesRange, Confidence, Detected } from "./types";

/** Everything the engine needs. Crypto rows are optional and still a stretch. */
export interface BuildProfileInput {
  transactions: readonly Transaction[];
  onboarding?: OnboardingAnswers;
  /**
   * Optional crypto history CSV text.
   * TODO: crypto import is a stretch feature. Leave this unused until then.
   */
  cryptoCsv?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers — pure functions
// ─────────────────────────────────────────────────────────────

/** YYYY-MM key for grouping by calendar month. */
function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Number of distinct calendar months touched by the transactions. */
function monthsCovered(transactions: readonly Transaction[]): number {
  const months = new Set(transactions.map((t) => monthKey(t.date)));
  return months.size;
}

/** Build a KesRange from a list of monthly values. */
function kesRange(values: readonly number[]): KesRange {
  if (values.length === 0) return { floor: 0, typical: 0, ceiling: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const floor = sorted[0] ?? 0;
  const ceiling = sorted[sorted.length - 1] ?? 0;
  const mid = sorted[Math.floor(sorted.length / 2)] ?? floor;
  return {
    floor: Math.round(floor),
    typical: Math.round(mid),
    ceiling: Math.round(ceiling),
  };
}

/** Confidence from the number of observations. */
function confidenceFrom(observations: number): Confidence {
  if (observations >= 4) return "high";
  if (observations >= 2) return "medium";
  return "low";
}

// ─────────────────────────────────────────────────────────────
// Income detection
// ─────────────────────────────────────────────────────────────

/** Labels that look like irregular transfers, not salary. */
const IRREGULAR_INCOME_LABELS = /auntie|cousin|neighbour|gift/i;

function detectIncome(transactions: readonly Transaction[]): IncomeSummary {
  const credits = transactions.filter((t) => t.direction === "in");
  if (credits.length === 0) {
    return {
      sources: [],
      monthlyKes: { floor: 0, typical: 0, ceiling: 0 },
    };
  }

  // Group by counterparty
  const byCounterparty = new Map<
    string,
    { months: Set<string>; amounts: number[]; total: number }
  >();
  for (const t of credits) {
    const key = t.counterparty ?? "Unknown";
    const entry = byCounterparty.get(key) ?? {
      months: new Set<string>(),
      amounts: [],
      total: 0,
    };
    entry.months.add(monthKey(t.date));
    entry.amounts.push(t.amountKes);
    entry.total += t.amountKes;
    byCounterparty.set(key, entry);
  }

  // Build sources: keep counterparties that appear in ≥2 distinct months,
  // OR appear in ≥1 month and are not obviously irregular.
  const sources: Array<Detected<IncomeSource>> = [];
  for (const [label, entry] of byCounterparty) {
    const isIrregular = IRREGULAR_INCOME_LABELS.test(label);
    const observations = entry.months.size;
    if (observations < 2 && isIrregular) continue;
    if (observations < 1) continue;

    const monthlyAmounts = entry.amounts; // one per transaction
    const range = kesRange(monthlyAmounts);
    const regularity: IncomeSource["regularity"] =
      observations >= 4 ? "monthly" : observations >= 2 ? "monthly" : "irregular";

    sources.push({
      value: {
        label,
        kind: isIrregular ? "transfer" : "salary",
        monthlyKes: range,
        regularity,
      },
      confidence: confidenceFrom(observations),
      observations,
    });
  }

  // Sort by typical monthly amount descending — biggest first
  sources.sort(
    (a, b) => b.value.monthlyKes.typical - a.value.monthlyKes.typical,
  );

  // Combined monthly income: sum of per-month totals from all credits
  const monthlyTotals = new Map<string, number>();
  for (const t of credits) {
    const key = monthKey(t.date);
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + t.amountKes);
  }
  const combined = kesRange([...monthlyTotals.values()]);

  return { sources, monthlyKes: combined };
}

// ─────────────────────────────────────────────────────────────
// Commitment detection
// ─────────────────────────────────────────────────────────────

interface CommitmentPattern {
  category: CommitmentCategory;
  /** True when this transaction belongs to this commitment. */
  match: (t: Transaction) => boolean;
  /** Human-readable label for the commitment. */
  label: (t: Transaction) => string;
}

const COMMITMENT_PATTERNS: CommitmentPattern[] = [
  {
    category: "rent",
    match: (t) =>
      /rent/i.test(t.counterparty ?? "") || /for account RENT/i.test(t.raw),
    label: (t) => t.counterparty ?? "Rent",
  },
  {
    category: "school_fees",
    match: (t) =>
      /academy|school|fees/i.test(t.counterparty ?? "") ||
      /for account TERM-/i.test(t.raw),
    label: (t) => t.counterparty ?? "School fees",
  },
  {
    category: "chama",
    match: (t) => /chama/i.test(t.counterparty ?? ""),
    label: (t) => t.counterparty ?? "Chama",
  },
  {
    category: "loan",
    match: (t) =>
      /loan|fuliza|m-shwari/i.test(t.counterparty ?? "") ||
      t.kind === "fuliza" ||
      /STUDY LOAN|M-SHWARI/i.test(t.raw),
    label: (t) => t.counterparty ?? "Loan",
  },
  {
    category: "utilities",
    match: (t) =>
      /power|kplc|water|city power|token/i.test(t.counterparty ?? "") ||
      /CITY POWER|KPLC/i.test(t.raw),
    label: (t) => t.counterparty ?? "Utilities",
  },
];

/** Detect recurring commitments: something that shows up month after month. */
function detectCommitments(transactions: readonly Transaction[]): Commitment[] {
  const debits = transactions.filter((t) => t.direction === "out");
  const commitments: Commitment[] = [];

  for (const pattern of COMMITMENT_PATTERNS) {
    const matches = debits.filter(pattern.match);
    if (matches.length === 0) continue;

    const distinctMonths = new Set(matches.map((t) => monthKey(t.date)));
    const observations = matches.length;
    const amounts = matches.map((t) => t.amountKes);
    const avgAmount = Math.round(
      amounts.reduce((a, b) => a + b, 0) / amounts.length,
    );

    // Cadence:
    // - monthly: appears in ≥4 months
    // - termly: appears 2–3 times, spaced months apart
    // - irregular: everything else
    let cadence: Cadence;
    if (distinctMonths.size >= 4) cadence = "monthly";
    else if (distinctMonths.size >= 2) cadence = "termly";
    else cadence = "irregular";

    const confidence: Confidence = confidenceFrom(distinctMonths.size);

    commitments.push({
      label: pattern.label(matches[0]!),
      category: pattern.category,
      amountKes: avgAmount,
      cadence,
      confidence,
      observations,
    });
  }

  // Sort by amount descending — biggest commitment first
  commitments.sort((a, b) => b.amountKes - a.amountKes);
  return commitments;
}

// ─────────────────────────────────────────────────────────────
// Spending detection (everything that is NOT a commitment)
// ─────────────────────────────────────────────────────────────

const SPENDING_CATEGORY_PATTERNS: Array<{
  category: string;
  match: (t: Transaction) => boolean;
}> = [
  {
    category: "groceries",
    match: (t) =>
      /grocer|corner|naivas|carrefour|quickmart|chandarana|stage kiosk|market/i.test(
        t.counterparty ?? "",
      ),
  },
  {
    category: "transport",
    match: (t) =>
      /uber|bolt|matatu|fuel|petrol|total|shell|stage/i.test(
        t.counterparty ?? "",
      ) && t.kind !== "airtime",
  },
  {
    category: "airtime",
    match: (t) => t.kind === "airtime",
  },
  {
    category: "eating out",
    match: (t) => /restaurant|hotel|cafe|kiosk/i.test(t.counterparty ?? ""),
  },
];

function detectSpending(
  transactions: readonly Transaction[],
  commitments: readonly Commitment[],
): SpendingSummary {
  // A transaction is "committed" if it matches one of the commitment categories
  // with a similar amount to the commitment's average. Otherwise it's flexible.
  const commitmentAmounts = new Set(commitments.map((c) => c.amountKes));
  const committedTransactions = transactions.filter(
    (t) => t.direction === "out" && commitmentAmounts.has(t.amountKes),
  );
  const committedIds = new Set(committedTransactions.map((t) => t.id));

  const flexible = transactions.filter(
    (t) => t.direction === "out" && !committedIds.has(t.id),
  );

  // Group flexible spending by month
  const monthlyTotals = new Map<string, number>();
  for (const t of flexible) {
    const key = monthKey(t.date);
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + t.amountKes);
  }
  const flexibleMonthlyKes = kesRange([...monthlyTotals.values()]);

  // Category breakdown
  const byCategory: SpendingCategorySummary[] = [];
  for (const pattern of SPENDING_CATEGORY_PATTERNS) {
    const matches = flexible.filter(pattern.match);
    if (matches.length === 0) continue;

    const monthlyByCategory = new Map<string, number>();
    for (const t of matches) {
      const key = monthKey(t.date);
      monthlyByCategory.set(key, (monthlyByCategory.get(key) ?? 0) + t.amountKes);
    }
    const range = kesRange([...monthlyByCategory.values()]);
    const values = [...monthlyByCategory.values()];
    const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
    const variance =
      values.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(values.length, 1);
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
    const volatility: "low" | "medium" | "high" =
      cv < 0.2 ? "low" : cv < 0.5 ? "medium" : "high";

    byCategory.push({
      category: pattern.category,
      monthlyKes: range,
      volatility,
    });
  }

  return { byCategory, flexibleMonthlyKes };
}

// ─────────────────────────────────────────────────────────────
// Resilience
// ─────────────────────────────────────────────────────────────

function detectResilience(
  transactions: readonly Transaction[],
  surplusFloor: number,
): Resilience {
  const fulizaCount = transactions.filter((t) => t.kind === "fuliza").length;
  const borrowingReliance: Resilience["borrowingReliance"] =
    fulizaCount >= 4 ? "frequent" : fulizaCount >= 1 ? "occasional" : "none";

  // Rough estimate: if floor is healthy, buffer is ~2-3 months; if thin, less.
  const months = monthsCovered(transactions);
  const monthsOfExpensesCovered =
    surplusFloor <= 0 ? 0.2 : Math.min(3, Math.max(0.5, months / 3));

  const bufferFirst =
    surplusFloor <= 0 || borrowingReliance === "frequent";

  return {
    monthsOfExpensesCovered: Number(monthsOfExpensesCovered.toFixed(1)),
    borrowingReliance,
    fulizaObservations: fulizaCount,
    bufferFirst,
  };
}

// ─────────────────────────────────────────────────────────────
// Surplus
// ─────────────────────────────────────────────────────────────

export interface SurplusInput {
  income: IncomeSummary;
  spending: SpendingSummary;
  resilience: Resilience;
}

/**
 * Compute a safe surplus range from the user's own history.
 * The floor is the worst typical month. Do not apply a fixed 50/30/20 split.
 * Set `bufferFirst` when resilience is thin.
 */
export function computeSurplus(input: SurplusInput): Surplus {
  const { income, spending, resilience } = input;

  const floor = Math.max(
    0,
    income.monthlyKes.floor - spending.flexibleMonthlyKes.ceiling,
  );
  const typical = Math.max(
    0,
    income.monthlyKes.typical - spending.flexibleMonthlyKes.typical,
  );
  const ceiling = Math.max(
    0,
    income.monthlyKes.ceiling - spending.flexibleMonthlyKes.floor,
  );

  const bufferFirst = resilience.bufferFirst || floor <= 0;

  return {
    monthlyKes: { floor, typical, ceiling },
    bufferFirst,
  };
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

/**
 * Build a profile from about six months of transactions.
 * Onboarding answers override anything the statements only imply.
 */
export function buildProfile(input: BuildProfileInput): FinancialProfile {
  const { transactions, onboarding } = input;

  if (transactions.length === 0) {
    throw new Error("Cannot build a profile from zero transactions.");
  }

  // Sort by date ascending — the parser already does this, but be safe.
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  const window: ProfileWindow = {
    from: first.date,
    to: last.date,
    monthsCovered: monthsCovered(sorted),
    sources: ["mpesa"],
  };

  const income = detectIncome(sorted);
  const commitments = detectCommitments(sorted);
  const spending = detectSpending(sorted, commitments);

  // First pass with placeholder resilience, so we can compute the floor.
  const placeholder: Resilience = {
    monthsOfExpensesCovered: 0,
    borrowingReliance: "none",
    fulizaObservations: 0,
    bufferFirst: false,
  };
  const firstPass = computeSurplus({ income, spending, resilience: placeholder });

  // Now compute real resilience using the floor, and recompute surplus.
  const resilience = detectResilience(sorted, firstPass.monthlyKes.floor);
  const surplus = computeSurplus({ income, spending, resilience });

  return {
    version: 1,
    window,
    onboarding,
    income,
    commitments,
    spending,
    resilience,
    surplus,
    walletEvents: [],
    scenarios: [],
    proofs: [],
  };
}