/**
 * Financial profile data contract.
 *
 * The profile is the product: one structured object built on the user's
 * device from about six months of history. Every other feature reads it.
 * It describes the picture. It does not score the person or label them.
 * There are no orders, price targets, sell signals or other trading fields.
 */

import type { Confidence, Detected, KesRange } from "./types";

/**
 * Shown with every scenario. Education, not a forecast.
 * Bitcoin can lose value.
 */
export const PAST_PERFORMANCE_DISCLAIMER =
  "Past performance does not indicate future results. This is education, not financial advice. Bitcoin can lose value.";

/** How far back the statements cover, and which sources were included. */
export interface ProfileWindow {
  /** ISO date of the earliest transaction included. */
  from: string;
  /** ISO date of the latest transaction included. */
  to: string;
  /** Approximate months of history. Six is the target. */
  monthsCovered: number;
  sources: Array<"mpesa" | "bank" | "crypto">;
}

/** A debt the user told us about. Statements cannot see most of these. */
export interface ReportedDebt {
  label: string;
  /** Outstanding balance in whole KES. */
  balanceKes: number;
  /** Regular repayment, when the user knows it. */
  monthlyPaymentKes?: number;
}

/** A chama the user belongs to. The ledger records membership. It never holds money. */
export interface ChamaMembership {
  name: string;
  monthlyContributionKes: number;
  kind?: "merry_go_round" | "welfare" | "investment" | "other";
}

/**
 * The user's own goal.
 * If they want quick returns or full liquidity, Bitcoin is not the right fit
 * and the app should say so.
 */
export interface UserGoal {
  kind:
    | "emergency_buffer"
    | "everyday_saving"
    | "long_horizon"
    | "quick_returns"
    | "full_liquidity"
    | "other";
  /** How long the user can leave this money alone, in months. */
  horizonMonths?: number;
  notes?: string;
}

/**
 * Answers the statements cannot provide.
 * These outrank inferred values when the two disagree.
 */
export interface OnboardingAnswers {
  debts: ReportedDebt[];
  chamaMemberships: ChamaMembership[];
  goal: UserGoal;
}

/** One detected income source. */
export interface IncomeSource {
  label: string;
  kind: "salary" | "business" | "transfer" | "other";
  /** Monthly amount as a range, in whole KES. */
  monthlyKes: KesRange;
  regularity: "weekly" | "monthly" | "irregular";
}

/** Income across the window: each source, and the combined monthly range. */
export interface IncomeSummary {
  sources: Array<Detected<IncomeSource>>;
  monthlyKes: KesRange;
}

export type CommitmentCategory =
  "rent" | "school_fees" | "utilities" | "loan" | "insurance" | "chama" | "other";

export type Cadence = "weekly" | "monthly" | "termly" | "yearly" | "irregular";

/**
 * A recurring commitment such as rent or school fees.
 * Something that happens once or twice a year carries a confidence level
 * the user can confirm or correct.
 */
export interface Commitment {
  label: string;
  category: CommitmentCategory;
  amountKes: number;
  cadence: Cadence;
  confidence: Confidence;
  observations: number;
  /** Set when the user confirms or corrects an inferred commitment. */
  userConfirmed?: boolean;
}

/** Flexible spending in one category, with how much it jumps around. */
export interface SpendingCategorySummary {
  category: string;
  monthlyKes: KesRange;
  volatility: "low" | "medium" | "high";
}

/** Spending that is not a fixed commitment. */
export interface SpendingSummary {
  byCategory: SpendingCategorySummary[];
  flexibleMonthlyKes: KesRange;
}

/**
 * How many months of expenses the history could cover, and whether
 * short-term borrowing such as Fuliza is part of the picture.
 */
export interface Resilience {
  monthsOfExpensesCovered: number;
  borrowingReliance: "none" | "occasional" | "frequent";
  fulizaObservations: number;
  /**
   * True when the emergency buffer is too thin.
   * Building that buffer comes before any Bitcoin plan.
   */
  bufferFirst: boolean;
}

/**
 * A safe amount to set aside, as a range.
 * `floor` is the worst typical month, not an average of the good months.
 */
export interface Surplus {
  monthlyKes: KesRange;
  bufferFirst: boolean;
}

/** A place the user already holds crypto, and whether they hold the keys. */
export interface CryptoPlatform {
  name: string;
  /** True when the user holds the keys. False for a custodial exchange. */
  userHoldsKeys: boolean;
}

/** One holding from an optional crypto history import. Descriptive only. */
export interface CryptoHolding {
  asset: string;
  /** Units of the asset, not shillings. */
  amount: number;
  valueKes?: number;
  /** Share of the imported holdings, from 0 to 1. */
  share?: number;
}

/**
 * Optional checkup of imported crypto history.
 * It describes platforms, fees and concentration. It does not judge them.
 */
export interface CryptoCheckup {
  platforms: CryptoPlatform[];
  estimatedFeesKes: number;
  holdings: CryptoHolding[];
  /** Plain-language notes, for example concentration in one asset. */
  observations: string[];
}

export type BuyCadence = "weekly" | "monthly";

/**
 * A small scheduled buy the user chose.
 * The amount stays under the surplus floor. If `bufferFirst` is set,
 * this plan should not be offered until a buffer exists.
 */
export interface InvestmentPlan {
  amountKes: number;
  cadence: BuyCadence;
  horizonYears: number;
  /** Lightning address or invoice pasted from a wallet the user controls. */
  destination: string;
  status: "draft" | "active" | "paused";
}

export type WalletEventKind = "purchase" | "receive";

export type WalletEventStatus =
  "pending_approval" | "quoted" | "submitted" | "filled" | "failed" | "cannot_fill";

/**
 * A recorded wallet activity, fed back into the profile.
 * Every purchase requires the user to approve it.
 * PesaSense never holds the funds or the keys.
 */
export interface WalletEvent {
  id: string;
  /** ISO date-time. */
  at: string;
  kind: WalletEventKind;
  amountKes?: number;
  amountSats?: number;
  status: WalletEventStatus;
  /** User-controlled Lightning destination. */
  destination?: string;
  approvedByUser: boolean;
}

/**
 * One historical "what if" result.
 * The outcome is a spread (low, median, high), never a single number.
 */
export interface ScenarioResult {
  id: string;
  years: number;
  cadence: BuyCadence;
  amountKes: number;
  contributedKes: number;
  /** Low outcome, in whole KES. */
  lowKes: number;
  /** Middle outcome, in whole KES. */
  medianKes: number;
  /** High outcome, in whole KES. */
  highKes: number;
  /** Always shown beside the chart. */
  disclaimer: string;
}

export type ProofKind = "nostr_profile" | "nip90_job" | "reliability_badge";

/**
 * A pointer to an encrypted or public Nostr artifact.
 * Raw transactions are never part of a proof.
 */
export interface Proof {
  id: string;
  kind: ProofKind;
  /** Event id or badge reference, when one exists. */
  ref?: string;
  createdAt: string;
}

/**
 * The on-device financial profile.
 * Contract version 1. Bump `version` only when this shape changes.
 */
export interface FinancialProfile {
  version: 1;
  window: ProfileWindow;
  onboarding?: OnboardingAnswers;
  income: IncomeSummary;
  commitments: Commitment[];
  spending: SpendingSummary;
  resilience: Resilience;
  surplus: Surplus;
  cryptoCheckup?: CryptoCheckup;
  investmentPlan?: InvestmentPlan;
  walletEvents: WalletEvent[];
  scenarios: ScenarioResult[];
  proofs: Proof[];
}
