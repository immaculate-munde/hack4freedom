/**
 * Public entry for the profile engine, parser and scenarios.
 * Keep this package free of UI imports so other apps can reuse it.
 */

export type {
  Confidence,
  Detected,
  KesRange,
  Transaction,
  TransactionKind,
} from "./types";

export {
  PAST_PERFORMANCE_DISCLAIMER,
  type BuyCadence,
  type Cadence,
  type ChamaMembership,
  type Commitment,
  type CommitmentCategory,
  type CryptoCheckup,
  type CryptoHolding,
  type CryptoPlatform,
  type FinancialProfile,
  type IncomeSource,
  type IncomeSummary,
  type InvestmentPlan,
  type OnboardingAnswers,
  type ProfileWindow,
  type Proof,
  type ProofKind,
  type ReportedDebt,
  type Resilience,
  type ScenarioResult,
  type SpendingCategorySummary,
  type SpendingSummary,
  type Surplus,
  type UserGoal,
  type WalletEvent,
  type WalletEventKind,
  type WalletEventStatus,
} from "./financial-profile.schema";

export { parseSmsBatch, parseStatement, type ParseStatementInput } from "./parse";

export {
  buildProfile,
  computeSurplus,
  type BuildProfileInput,
  type SurplusInput,
} from "./profile";

export { runScenario, type PricePoint, type RunScenarioInput } from "./scenario";

export { DEMO_STATEMENT_FILE, DEMO_STATEMENT_PASSWORD } from "./statement-fixture";

export { demoProfile } from "./demo-profile";
