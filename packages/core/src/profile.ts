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
const IRREGULAR_INCOME_LABELS = /auntie|cousin|neighbour|gift|friend/i;
/** Tiny credits (airtime refunds, 1–shilling tests) must not set the income floor. */
const MIN_INCOME_CREDIT_KES = 200;

function detectIncome(transactions: readonly Transaction[]): IncomeSummary {
  const credits = transactions.filter(
    (t) => t.direction === "in" && t.amountKes >= MIN_INCOME_CREDIT_KES,
  );
  if (credits.length === 0) {
    return {
      sources: [],
      monthlyKes: { floor: 0, typical: 0, ceiling: 0 },
    };
  }

  // Group by counterparty → monthly totals (not raw txn sizes).
  const byCounterparty = new Map<
    string,
    { monthTotals: Map<string, number>; total: number }
  >();
  for (const t of credits) {
    const key = t.counterparty ?? "Unknown";
    const entry = byCounterparty.get(key) ?? {
      monthTotals: new Map<string, number>(),
      total: 0,
    };
    const mk = monthKey(t.date);
    entry.monthTotals.set(mk, (entry.monthTotals.get(mk) ?? 0) + t.amountKes);
    entry.total += t.amountKes;
    byCounterparty.set(key, entry);
  }

  // Combined household income: sum of meaningful credits per calendar month.
  const householdByMonth = new Map<string, number>();
  for (const t of credits) {
    const mk = monthKey(t.date);
    householdByMonth.set(mk, (householdByMonth.get(mk) ?? 0) + t.amountKes);
  }
  const combined = kesRange([...householdByMonth.values()]);

  const sources: Array<Detected<IncomeSource>> = [];
  for (const [label, entry] of byCounterparty) {
    const isIrregular = IRREGULAR_INCOME_LABELS.test(label);
    const monthValues = [...entry.monthTotals.values()].filter((v) => v >= MIN_INCOME_CREDIT_KES);
    const observations = monthValues.length;
    if (observations < 2 && isIrregular) continue;
    if (observations < 1) continue;

    const range = kesRange(monthValues);
    // Skip noise sources that never clear a meaningful monthly total.
    if (range.typical < MIN_INCOME_CREDIT_KES) continue;

    const regularity: IncomeSource["regularity"] =
      observations >= 2 ? "monthly" : "irregular";
    const looksBusiness = /till|paybill|business|shop|kiosk|sales/i.test(label);

    sources.push({
      value: {
        label,
        kind: isIrregular ? "transfer" : looksBusiness ? "business" : "salary",
        monthlyKes: range,
        regularity,
      },
      confidence: confidenceFrom(observations),
      observations,
    });
  }

  sources.sort(
    (a, b) => b.value.monthlyKes.typical - a.value.monthlyKes.typical,
  );

  // Prefer household monthly totals so a KES 200 refund cannot drag the floor to zero.
  // If history is a single thin month, fall back to the strongest recurring source.
  const primary = sources.find((s) => s.observations >= 2);
  const monthlyKes =
    combined.typical >= MIN_INCOME_CREDIT_KES
      ? combined
      : primary
        ? primary.value.monthlyKes
        : combined;

  return { sources, monthlyKes };
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
      /rent|landlord|house|apartment|flat|estate|greenview/i.test(t.counterparty ?? "") ||
      /for account RENT/i.test(t.raw),
    label: (t) => t.counterparty ?? "Rent",
  },
  {
    category: "school_fees",
    match: (t) =>
      /academy|school|fees|college|university|kindergarten|creche/i.test(t.counterparty ?? "") ||
      /for account TERM-/i.test(t.raw),
    label: (t) => t.counterparty ?? "School fees",
  },
  {
    category: "chama",
    match: (t) => /chama|merry.?go|table.?banking|sacco/i.test(t.counterparty ?? ""),
    label: (t) => t.counterparty ?? "Chama",
  },
  {
    // Loan category is for actual loans (STUDY LOAN, M-SHWARI).
    // Fuliza is a separate signal tracked in resilience, not a commitment.
    category: "loan",
    match: (t) =>
      /study loan|m-shwari|loan desk|fuliza.*repay|fuliza repayment/i.test(t.raw) ||
      (/loan|fuliza/i.test(t.counterparty ?? "") && t.kind !== "fuliza"),
    label: (t) => t.counterparty ?? "Loan",
  },
  {
    category: "utilities",
    match: (t) =>
      /power|kplc|water|city power|token|nairobi water|nwasco|zuku|dstv|gotv|startimes|safaricom post|faiba|jamii/i.test(
        t.counterparty ?? "",
      ) || /CITY POWER|KPLC|DSTV|ZUKU/i.test(t.raw),
    label: (t) => t.counterparty ?? "Utilities",
  },
  {
    category: "insurance",
    match: (t) =>
      /nhif|sha |insurance|britam|jubilee|apa |cic |madison/i.test(t.counterparty ?? "") ||
      /NHIF|SHA /i.test(t.raw),
    label: (t) => t.counterparty ?? "Insurance",
  },
];

const MIN_COMMITMENT_KES = 200;

function commitmentCadence(observations: number, distinctMonths: number): Cadence {
  if (observations >= 3 || distinctMonths >= 3) return "monthly";
  if (observations >= 2 || distinctMonths >= 2) return "termly";
  return "irregular";
}

/** Detect recurring commitments: something that shows up month after month. */
function detectCommitments(transactions: readonly Transaction[]): Commitment[] {
  const debits = transactions.filter((t) => t.direction === "out");
  const commitments: Commitment[] = [];
  const claimedIds = new Set<string>();

  for (const pattern of COMMITMENT_PATTERNS) {
    const matches = debits.filter(
      (t) => !claimedIds.has(t.id) && pattern.match(t) && t.amountKes >= MIN_COMMITMENT_KES,
    );
    if (matches.length === 0) continue;

    const distinctMonths = new Set(matches.map((t) => monthKey(t.date)));
    const observations = matches.length;
    const amounts = matches.map((t) => t.amountKes);
    const avgAmount = Math.round(
      amounts.reduce((a, b) => a + b, 0) / amounts.length,
    );

    for (const m of matches) claimedIds.add(m.id);

    commitments.push({
      label: pattern.label(matches[0]!),
      category: pattern.category,
      amountKes: avgAmount,
      cadence: commitmentCadence(observations, distinctMonths.size),
      confidence: confidenceFrom(distinctMonths.size),
      observations,
    });
  }

  // Recurring same-counterparty debits the keyword list missed (e.g. landlord name only).
  const byCounterparty = new Map<string, Transaction[]>();
  for (const t of debits) {
    if (claimedIds.has(t.id) || t.amountKes < MIN_COMMITMENT_KES) continue;
    if (t.kind === "airtime" || t.kind === "fuliza") continue;
    const key = (t.counterparty ?? "").trim();
    if (!key || key.length < 3) continue;
    const list = byCounterparty.get(key) ?? [];
    list.push(t);
    byCounterparty.set(key, list);
  }

  for (const [label, matches] of byCounterparty) {
    const monthTotals = new Map<string, number>();
    for (const t of matches) {
      const mk = monthKey(t.date);
      monthTotals.set(mk, (monthTotals.get(mk) ?? 0) + t.amountKes);
    }
    if (monthTotals.size < 2) continue;
    const monthlyValues = [...monthTotals.values()];
    const avgAmount = Math.round(
      monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length,
    );
    // Similar size each month → looks like a bill, not groceries.
    const min = Math.min(...monthlyValues);
    const max = Math.max(...monthlyValues);
    if (max > 0 && min / max < 0.45) continue;

    for (const m of matches) claimedIds.add(m.id);
    commitments.push({
      label,
      category: "other",
      amountKes: avgAmount,
      cadence: commitmentCadence(matches.length, monthTotals.size),
      confidence: confidenceFrom(monthTotals.size),
      observations: matches.length,
    });
  }

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
      /grocer|corner|naivas|carrefour|quickmart|chandarana|tuskys|clean shelf|stage kiosk|market|duka/i.test(
        t.counterparty ?? "",
      ),
  },
  {
    category: "transport",
    match: (t) =>
      /uber|bolt|matatu|fuel|petrol|total|shell|rubis|oil|boda|little cab|stage/i.test(
        t.counterparty ?? "",
      ) && t.kind !== "airtime",
  },
  {
    category: "airtime",
    match: (t) =>
      t.kind === "airtime" || /airtime|bundles|data bundle/i.test(t.counterparty ?? ""),
  },
  {
    category: "eating out",
    match: (t) =>
      /restaurant|hotel|cafe|kiosk|java|artcaffe|chicken|chips|nyama/i.test(t.counterparty ?? ""),
  },
  {
    category: "health",
    match: (t) =>
      /pharmacy|chemist|hospital|clinic|doctor|lab |goodlife|meds/i.test(t.counterparty ?? ""),
  },
];

/**
 * Cash M-Pesa cannot see (kiosks, matatus, market). Scaled to income —
 * never force a KES 11k floor on a KES 12k earner (that zeroed real surplus).
 */
const FLEX_BASELINE_AT_40K: KesRange = {
  floor: 11000,
  typical: 12000,
  ceiling: 16500,
};

function blendFlexibleSpend(
  detected: KesRange,
  incomeTypicalKes: number,
  months: number,
): KesRange {
  const cashUplift = Math.round(
    Math.min(4_000, Math.max(0, incomeTypicalKes) * 0.12),
  );

  // Enough history → trust the statement; add a small cash uplift only.
  if (months >= 3 && detected.typical > 0) {
    return {
      floor: detected.floor + Math.round(cashUplift * 0.65),
      typical: detected.typical + cashUplift,
      ceiling: detected.ceiling + Math.round(cashUplift * 1.25),
    };
  }

  // Sparse history → scale the household baseline to this person's income.
  const scale =
    incomeTypicalKes > 0 ? Math.min(1.15, Math.max(0.2, incomeTypicalKes / 40_000)) : 0.45;
  return {
    floor: Math.max(detected.floor, Math.round(FLEX_BASELINE_AT_40K.floor * scale)),
    typical: Math.max(detected.typical, Math.round(FLEX_BASELINE_AT_40K.typical * scale)),
    ceiling: Math.max(detected.ceiling, Math.round(FLEX_BASELINE_AT_40K.ceiling * scale)),
  };
}

function isCommitmentTxn(t: Transaction, commitments: readonly Commitment[]): boolean {
  if (t.direction !== "out") return false;
  if (COMMITMENT_PATTERNS.some((p) => p.match(t))) return true;
  const label = (t.counterparty ?? "").trim().toLowerCase();
  if (!label) return false;
  return commitments.some((c) => c.label.trim().toLowerCase() === label);
}

function detectSpending(
  transactions: readonly Transaction[],
  commitments: readonly Commitment[],
  incomeTypicalKes: number,
): SpendingSummary {
  const flexible = transactions.filter((t) => !isCommitmentTxn(t, commitments));

  const monthlyTotals = new Map<string, number>();
  for (const t of flexible) {
    if (t.direction !== "out") continue;
    const key = monthKey(t.date);
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + t.amountKes);
  }
  const detectedFlexible = kesRange([...monthlyTotals.values()]);
  const months = monthlyTotals.size || monthsCovered(transactions);

  const byCategory: SpendingCategorySummary[] = [];
  for (const pattern of SPENDING_CATEGORY_PATTERNS) {
    const matches = flexible.filter((t) => t.direction === "out" && pattern.match(t));
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

  byCategory.sort((a, b) => b.monthlyKes.typical - a.monthlyKes.typical);

  return {
    byCategory,
    flexibleMonthlyKes: blendFlexibleSpend(detectedFlexible, incomeTypicalKes, months),
  };
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

  const bufferFirst = surplusFloor <= 0 || borrowingReliance === "frequent";

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

/** The slices of a profile that the surplus calculation reads. */
export interface SurplusInput {
  income: IncomeSummary;
  spending: SpendingSummary;
  resilience: Resilience;
}

/**
 * Compute a safe surplus range from the user's own history.
 * The floor is the worst typical month. Do not apply a fixed 50/30/20 split.
 * Set `bufferFirst` when resilience is thin.
 *
 * `income` is expected to be already net of fixed commitments
 * (see buildProfile — it subtracts monthly commitments before calling).
 */
export function computeSurplus(input: SurplusInput): Surplus {
  const { income, spending, resilience } = input;

  // Worst typical month: lowest income, highest flexible spending
  const floor = Math.max(
    0,
    income.monthlyKes.floor - spending.flexibleMonthlyKes.ceiling,
  );
  // Typical month: typical income, typical flexible spending
  const typical = Math.max(
    0,
    income.monthlyKes.typical - spending.flexibleMonthlyKes.typical,
  );
  // Best typical month: highest income, lowest flexible spending
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

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function labelsMatch(a: string, b: string): boolean {
  const left = normalizeLabel(a);
  const right = normalizeLabel(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/**
 * Self-reported chama contributions and debt repayments outrank statement inference.
 * They become fixed commitments so surplus leaves room for them.
 */
export function applyOnboardingToCommitments(
  detected: Commitment[],
  onboarding?: OnboardingAnswers,
): Commitment[] {
  if (!onboarding) return detected;
  const next = [...detected];

  for (const chama of onboarding.chamaMemberships) {
    const amountKes = Math.round(chama.monthlyContributionKes);
    if (!(amountKes > 0) || !chama.name.trim()) continue;
    const index = next.findIndex(
      (row) => row.category === "chama" && labelsMatch(row.label, chama.name),
    );
    const merged: Commitment = {
      label: chama.name.trim(),
      category: "chama",
      amountKes,
      cadence: "monthly",
      confidence: "high",
      observations: index >= 0 ? Math.max(next[index]!.observations, 1) : 1,
      userConfirmed: true,
    };
    if (index >= 0) next[index] = merged;
    else next.push(merged);
  }

  for (const debt of onboarding.debts) {
    const amountKes = Math.round(debt.monthlyPaymentKes ?? 0);
    if (!(amountKes > 0) || !debt.label.trim()) continue;
    const index = next.findIndex(
      (row) => row.category === "loan" && labelsMatch(row.label, debt.label),
    );
    const merged: Commitment = {
      label: debt.label.trim(),
      category: "loan",
      amountKes,
      cadence: "monthly",
      confidence: "high",
      observations: index >= 0 ? Math.max(next[index]!.observations, 1) : 1,
      userConfirmed: true,
    };
    if (index >= 0) next[index] = merged;
    else next.push(merged);
  }

  next.sort((a, b) => b.amountKes - a.amountKes);
  return next;
}

/**
 * Goals and unpaid balances (no repayment schedule) shape whether Bitcoin waits.
 */
export function applyOnboardingToResilience(
  resilience: Resilience,
  onboarding: OnboardingAnswers | undefined,
  incomeTypicalKes: number,
): Resilience {
  if (!onboarding) return resilience;

  let bufferFirst = resilience.bufferFirst;
  let monthsOfExpensesCovered = resilience.monthsOfExpensesCovered;

  const overhangKes = onboarding.debts
    .filter((debt) => !(debt.monthlyPaymentKes && debt.monthlyPaymentKes > 0))
    .reduce((sum, debt) => sum + Math.max(0, debt.balanceKes), 0);
  // A balance with no monthly repayment still blocks a habit when it is large.
  if (overhangKes > 0 && incomeTypicalKes > 0 && overhangKes >= incomeTypicalKes) {
    bufferFirst = true;
    monthsOfExpensesCovered = Math.min(monthsOfExpensesCovered, 1);
  }

  if (onboarding.goal.kind === "emergency_buffer" && monthsOfExpensesCovered < 3) {
    bufferFirst = true;
  }
  if (
    onboarding.goal.kind === "quick_returns" ||
    onboarding.goal.kind === "full_liquidity"
  ) {
    bufferFirst = true;
  }

  return {
    ...resilience,
    bufferFirst,
    monthsOfExpensesCovered,
  };
}

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
  const detectedCommitments = detectCommitments(sorted);
  const commitments = applyOnboardingToCommitments(detectedCommitments, onboarding);
  const spending = detectSpending(sorted, commitments, income.monthlyKes.typical);

  // Fixed commitments reduce the income the surplus formula sees.
  // Include every detected commitment: monthly and termly both count,
  // because termly fees (school fees) are still obligations across the year.
  // User-confirmed onboarding rows always count, even with one observation.
  const monthlyCommitmentsTotal = commitments
    .filter((c) => c.userConfirmed || c.observations >= 1)
    .reduce((sum, c) => sum + c.amountKes, 0);

  const netIncome: IncomeSummary = {
    sources: income.sources,
    monthlyKes: {
      floor: Math.max(0, income.monthlyKes.floor - monthlyCommitmentsTotal),
      typical: Math.max(0, income.monthlyKes.typical - monthlyCommitmentsTotal),
      ceiling: Math.max(0, income.monthlyKes.ceiling - monthlyCommitmentsTotal),
    },
  };

  // First pass with placeholder resilience, so we can compute the floor.
  const placeholder: Resilience = {
    monthsOfExpensesCovered: 0,
    borrowingReliance: "none",
    fulizaObservations: 0,
    bufferFirst: false,
  };
  const firstPass = computeSurplus({
    income: netIncome,
    spending,
    resilience: placeholder,
  });

  // Now compute real resilience using the floor, fold in goals/debts, recompute surplus.
  const baseResilience = detectResilience(sorted, firstPass.monthlyKes.floor);
  const resilience = applyOnboardingToResilience(
    baseResilience,
    onboarding,
    income.monthlyKes.typical,
  );
  const surplus = computeSurplus({ income: netIncome, spending, resilience });

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