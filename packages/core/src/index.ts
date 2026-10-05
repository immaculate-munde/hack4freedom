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

export { validateImportedProfile } from "./import-quality";

export {
  applyOnboardingToCommitments,
  applyOnboardingToResilience,
  buildProfile,
  computeSurplus,
  type BuildProfileInput,
  type SurplusInput,
} from "./profile";

export { runScenario, type PricePoint, type RunScenarioInput } from "./scenario";

export { DEMO_STATEMENT_FILE, DEMO_STATEMENT_PASSWORD } from "./statement-fixture";

export { demoProfile, demoProfiles, thinDemoProfile } from "./demo-profile";

export {
  assertInvestAmount,
  investAllowance,
  INVEST_MAX_KES,
  INVEST_MIN_KES,
  type InvestAllowance,
} from "./invest-allowance";

export {
  walletEventFromPurchase,
  walletEventStatus,
  type RecordedPurchaseStatus,
} from "./wallet-event";

export {
  profileSourceFromEnv,
  selectProfile,
  type ProfileRequest,
  type ProfileSelection,
  type ProfileSource,
} from "./profile-source";

export {
  LEARN_SOURCES,
  LEARN_TOPICS,
  TELEGRAM_LEARN_DISCLAIMER,
  countLearnBeats,
  formatTelegramBeat,
  formatTelegramChoiceFeedback,
  formatTelegramTopicMenu,
  getLearnTopic,
  learnDisclaimer,
  listLearnTopicsByLevel,
  parseTelegramAnswerChoice,
  parseTelegramTopicChoice,
  sourcesForIds,
  telegramBeatKeyboard,
  telegramLearnEndKeyboard,
  telegramTopicLabel,
  telegramTopicMenuKeyboard,
  type LearnBeat,
  type LearnChoice,
  type LearnImageKey,
  type LearnLevel,
  type LearnSource,
  type LearnTopic,
} from "./learn";
