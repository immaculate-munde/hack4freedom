"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OnboardingAnswers, UserGoal } from "@pesasense/core";
import type { SensiMood } from "../../components/sensi-avatar";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ThemeToggle } from "../../components/theme-toggle";
import { useFormat, useI18n } from "../../contexts/language-context";
import type { TranslateVars } from "../../lib/i18n";

const DRAFT_KEY = "pesasense.onboarding";

type GoalId = "emergency_buffer" | "long_horizon" | "school_fees" | "inflation";

type BitcoinReasonId =
  | "scam_risk"
  | "no_understanding"
  | "capital"
  | "regulation"
  | "returns"
  | "other";

type Draft = {
  hasDebt: boolean | null;
  debtNotes: string;
  debtBalance: string;
  inChama: boolean | null;
  chamaName: string;
  chamaAmount: string;
  chamaCadence: "weekly" | "monthly";
  goalId: GoalId | null;
  goalNotes: string;
  wantsChama: boolean | null;
  hasInvestedBitcoin: boolean | null;
  bitcoinWhere: string;
  bitcoinReasons: BitcoinReasonId[];
  bitcoinOtherReason: string;
};

const EMPTY: Draft = {
  hasDebt: null,
  debtNotes: "",
  debtBalance: "",
  inChama: null,
  chamaName: "",
  chamaAmount: "",
  chamaCadence: "monthly",
  goalId: null,
  goalNotes: "",
  wantsChama: null,
  hasInvestedBitcoin: null,
  bitcoinWhere: "",
  bitcoinReasons: [],
  bitcoinOtherReason: "",
};

const GOAL_IDS: GoalId[] = ["emergency_buffer", "long_horizon", "school_fees", "inflation"];

const BITCOIN_REASON_IDS: BitcoinReasonId[] = [
  "scam_risk",
  "no_understanding",
  "capital",
  "regulation",
  "returns",
  "other",
];

type Translate = (key: string, vars?: TranslateVars) => string;

const TOTAL_STEPS = 5;

function wholeKes(value: string): number | null {
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function toGoal(draft: Draft): UserGoal {
  const notes = draft.goalNotes.trim();
  if (draft.goalId === "emergency_buffer") {
    return { kind: "emergency_buffer", notes: notes || undefined };
  }
  if (draft.goalId === "long_horizon") {
    return { kind: "long_horizon", notes: notes || undefined };
  }
  if (draft.goalId === "school_fees") {
    return {
      kind: "other",
      notes: ["School fees peace of mind", notes].filter(Boolean).join(". "),
    };
  }
  if (draft.goalId === "inflation") {
    return {
      kind: "other",
      notes: ["Protect against inflation", notes].filter(Boolean).join(". "),
    };
  }
  return { kind: "other", notes: notes || undefined };
}

function toAnswers(draft: Draft): OnboardingAnswers {
  const balance = wholeKes(draft.debtBalance);
  const debts =
    draft.hasDebt === true && draft.debtNotes.trim() && balance !== null
      ? [{ label: draft.debtNotes.trim(), balanceKes: balance }]
      : [];

  const contribution = wholeKes(draft.chamaAmount);
  const monthly =
    contribution === null
      ? null
      : draft.chamaCadence === "weekly"
        ? contribution * 4
        : contribution;
  const chamaMemberships =
    draft.inChama === true && draft.chamaName.trim() && monthly !== null
      ? [{ name: draft.chamaName.trim(), monthlyContributionKes: monthly }]
      : [];

  return { debts, chamaMemberships, goal: toGoal(draft) };
}

function isDraft(value: unknown): value is Partial<Draft> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadDraft(): Draft {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed)) return EMPTY;
    const wrapped = parsed as { draft?: unknown };
    const source = isDraft(wrapped.draft) ? wrapped.draft : parsed;
    return { ...EMPTY, ...source };
  } catch {
    return EMPTY;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { kes } = useFormat();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [mood, setMood] = useState<SensiMood>("neutral");
  const [ackKey, setAckKey] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [finale, setFinale] = useState<Draft | null>(null);
  const [beat, setBeat] = useState(0);
  const finaleRef = useRef<Draft | null>(null);

  useEffect(() => {
    setMood("neutral");
    setDraft(loadDraft());
  }, []);

  function saveDraft(nextDraft: Draft) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
    setDraft(nextDraft);
  }

  function complete(nextDraft: Draft) {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        draft: nextDraft,
        answers: toAnswers(nextDraft),
        wantsChama: nextDraft.wantsChama === true,
        bitcoinExperience: {
          hasInvested: nextDraft.hasInvestedBitcoin === true,
          where: nextDraft.bitcoinWhere.trim(),
          reasons: nextDraft.bitcoinReasons,
        },
      }),
    );
    router.push("/onboard");
  }

  function advance(nextDraft: Draft) {
    if (isAdvancing) return;
    saveDraft(nextDraft);
    setIsAdvancing(true);
    setMood("happy");
    setAckKey(ACK_KEYS[step % ACK_KEYS.length] ?? "onboarding.ack.gotIt");
    window.setTimeout(() => {
      setAckKey(null);
      if (step < TOTAL_STEPS - 1) {
        setStep((current) => current + 1);
        setMood("neutral");
        setIsAdvancing(false);
        return;
      }
      startFinale(nextDraft);
    }, 600);
  }

  useEffect(() => {
    if (!isCelebrating || !finale) return;
    const total = summaryLines(finale, t, kes).length;
    const wait = beat < total ? 680 : 1100;
    const timer = window.setTimeout(() => {
      if (beat < total) {
        setBeat((current) => current + 1);
        return;
      }
      const saved = finaleRef.current;
      if (saved) complete(saved);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [isCelebrating, finale, beat, t, kes]);

  function patch(next: Partial<Draft>) {
    saveDraft({ ...draft, ...next });
  }

  function startFinale(nextDraft: Draft) {
    finaleRef.current = nextDraft;
    setFinale(nextDraft);
    setBeat(0);
    setMood("celebrating");
    setIsCelebrating(true);
  }

  function choose(next: Partial<Draft>) {
    advance({ ...draft, ...next });
  }

  function back() {
    if (isAdvancing) return;
    if (step === 0) {
      router.back();
      return;
    }
    setStep((current) => current - 1);
    setMood("neutral");
  }

  function skip() {
    const blanks: Partial<Draft>[] = [
      { hasDebt: null, debtNotes: "", debtBalance: "" },
      { inChama: null, chamaName: "", chamaAmount: "", chamaCadence: "monthly" },
      { wantsChama: null },
      { hasInvestedBitcoin: null, bitcoinWhere: "", bitcoinReasons: [], bitcoinOtherReason: "" },
      { goalId: null, goalNotes: "" },
    ];
    advance({ ...draft, ...(blanks[step] ?? {}) });
  }

  const pose = poseFor(step, mood, isCelebrating);

  if (isCelebrating && finale) {
    const lines = summaryLines(finale, t, kes);
    const shown = Math.min(beat, lines.length);
    const done = shown >= lines.length;
    return (
      <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center gap-6 px-5 py-8 pb-24 sm:px-8 lg:flex-row lg:items-center lg:pb-8">
        <div className="absolute top-5 right-5 z-10 sm:right-8">
          <LanguageSwitcher />
        </div>
        <img
          src={done ? "/sensi-yes.png" : "/sensi-think.png"}
          alt={t("onboarding.sensiAlt")}
          className="pointer-events-none h-72 w-auto object-contain sm:h-96 lg:h-[min(68vh,560px)]"
        />
        <Thought
          title={t("onboarding.finale.title")}
          ask={done ? t("onboarding.finale.askDone") : t("onboarding.finale.askReading")}
          why={done ? t("onboarding.finale.whyDone") : t("onboarding.finale.whyReading")}
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-sand" aria-hidden="true">
            <div
              className="h-full rounded-full bg-brass transition-all duration-500"
              style={{ width: `${lines.length === 0 ? 0 : (shown / lines.length) * 100}%` }}
            />
          </div>
          <ul className="mt-4 flex flex-col gap-2" aria-live="polite">
            {lines.map((line, index) => {
              const ready = index < shown;
              return (
                <li
                  key={line}
                  className={`flex items-start gap-2 text-sm leading-6 ${ready ? "text-ink" : "text-slate/35"}`}
                >
                  <span
                    className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      ready ? "bg-pine text-on-brand" : "border border-sand"
                    }`}
                    aria-hidden="true"
                  >
                    {ready ? "✓" : ""}
                  </span>
                  {line}
                </li>
              );
            })}
          </ul>
        </Thought>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-5 pb-24 sm:px-8 lg:pb-8">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          aria-label={t("onboarding.previousStep")}
          className="btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-paper text-xl text-pine"
        >
          &lt;
        </button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
            {t("onboarding.step", { current: step + 1, total: TOTAL_STEPS })}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 w-7 rounded-full ${index <= step ? "bg-pine" : "bg-sand"}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button type="button" onClick={skip} className="btn text-sm font-semibold text-slate">
            {t("common.skip")}
          </button>
        </div>
      </header>

      <div className="mt-2 grid flex-1 items-center gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-4">
        <div className="flex flex-col items-center">
          <img
            src={pose}
            alt={t("onboarding.sensiAlt")}
            className="pointer-events-none h-64 w-auto object-contain sm:h-80 lg:h-[min(68vh,560px)]"
          />
          <p className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-slate uppercase">
            {t("onboarding.sensiName")}
          </p>
        </div>
        <div>
          <Thought {...promptFor(step, draft, t)}>
            {ackKey ? <p className="text-sm font-semibold text-pine">{t(ackKey)}</p> : null}
            <div className="flex flex-col gap-6">
        {step === 0 ? (
          <DebtStep draft={draft} patch={patch} choose={choose} continueStep={() => advance(draft)} />
        ) : null}
        {step === 1 ? (
          <ChamaStep draft={draft} patch={patch} choose={choose} continueStep={() => advance(draft)} />
        ) : null}
        {step === 2 ? <WantsChamaStep draft={draft} choose={choose} /> : null}

        {step === 3 ? (
          <BitcoinExperienceStep draft={draft} patch={patch} continueStep={() => advance(draft)} />
        ) : null}
        {step === 4 ? (
          <GoalStep draft={draft} patch={patch} continueStep={() => advance(draft)} />
        ) : null}
            </div>
          </Thought>
        </div>
      </div>
    </main>
  );
}

function poseFor(step: number, mood: SensiMood, celebrating: boolean): string {
  if (celebrating || mood === "celebrating" || mood === "happy") return "/sensi-yes.png";
  if (step === 1 || step === 3) return "/sensi-think.png";
  if (step === 2 || step === 4) return "/sensi-ask.png";
  return "/sensi.png";
}

function Thought({
  title,
  ask,
  why,
  children,
}: {
  title: string;
  ask: string;
  why: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="absolute -top-3 left-12 h-3.5 w-3.5 rounded-full bg-paper shadow-card lg:top-auto lg:-left-8 lg:bottom-24 lg:h-4 lg:w-4" />
      <span className="absolute -top-7 left-[4.5rem] h-2 w-2 rounded-full bg-paper shadow-card lg:top-auto lg:-left-14 lg:bottom-16" />
      <div className="rounded-[32px] border border-sand bg-paper px-5 py-5 shadow-card sm:px-7 sm:py-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">{title}</p>
        <p className="mt-2 text-xl leading-8 font-semibold text-pine">{ask}</p>
        <p className="mt-2 text-sm leading-6 text-slate">{why}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

const ACK_KEYS = [
  "onboarding.ack.gotIt",
  "onboarding.ack.nice",
  "onboarding.ack.noted",
  "onboarding.ack.okay",
] as const;

type Prompt = { title: string; ask: string; why: string };

function promptFor(step: number, draft: Draft, t: Translate): Prompt {
  if (step === 0) {
    return {
      title: t("onboarding.debt.title"),
      ask: t("onboarding.debt.ask"),
      why: t("onboarding.debt.why"),
    };
  }
  if (step === 1) {
    return {
      title: t("onboarding.chama.title"),
      ask: t("onboarding.chama.ask"),
      why: t("onboarding.chama.why"),
    };
  }
  if (step === 2) {
    return {
      title: t("onboarding.newChama.title"),
      ask: t("onboarding.newChama.ask"),
      why: t("onboarding.newChama.why"),
    };
  }
  if (step === 3 && draft.hasInvestedBitcoin === false) {
    return {
      title: t("onboarding.bitcoin.title"),
      ask: t("onboarding.bitcoin.askWhyNot"),
      why: t("onboarding.bitcoin.whyReasons"),
    };
  }
  if (step === 3 && draft.hasInvestedBitcoin === true) {
    return {
      title: t("onboarding.bitcoin.title"),
      ask: t("onboarding.bitcoin.askWhere"),
      why: t("onboarding.bitcoin.whyWhere"),
    };
  }
  if (step === 3) {
    return {
      title: t("onboarding.bitcoin.title"),
      ask: t("onboarding.bitcoin.askEver"),
      why: t("onboarding.bitcoin.whyEver"),
    };
  }
  return {
    title: t("onboarding.goal.title"),
    ask: t("onboarding.goal.ask"),
    why: t("onboarding.goal.why"),
  };
}

function summaryLines(draft: Draft, t: Translate, kes: (amount: number) => string): string[] {
  const lines: string[] = [];
  if (draft.hasDebt === true) {
    const name = draft.debtNotes.trim();
    const amount = wholeKes(draft.debtBalance);
    if (name && amount !== null) {
      lines.push(t("onboarding.summary.debtWithBalance", { name, amount: kes(amount) }));
    } else if (name) {
      lines.push(t("onboarding.summary.debtNamed", { name }));
    } else {
      lines.push(t("onboarding.summary.debtYes"));
    }
  } else if (draft.hasDebt === false) {
    lines.push(t("onboarding.summary.debtNo"));
  } else {
    lines.push(t("onboarding.summary.debtSkipped"));
  }

  if (draft.inChama === true) {
    const name = draft.chamaName.trim();
    const amount = wholeKes(draft.chamaAmount);
    const cadence = t(draft.chamaCadence === "weekly" ? "onboarding.summary.perWeek" : "onboarding.summary.perMonth");
    if (name && amount !== null) {
      lines.push(t("onboarding.summary.chamaWithAmount", { name, amount: kes(amount), cadence }));
    } else if (name) {
      lines.push(t("onboarding.summary.chamaNamed", { name }));
    } else {
      lines.push(t("onboarding.summary.chamaYes"));
    }
  } else if (draft.inChama === false) {
    lines.push(t("onboarding.summary.chamaNo"));
  } else {
    lines.push(t("onboarding.summary.chamaSkipped"));
  }

  if (draft.wantsChama === true) lines.push(t("onboarding.summary.wantsChama"));
  else if (draft.wantsChama === false) lines.push(t("onboarding.summary.wantsChamaNo"));
  else lines.push(t("onboarding.summary.wantsChamaSkipped"));

  if (draft.hasInvestedBitcoin === true) {
    const where = draft.bitcoinWhere.trim();
    lines.push(
      where ? t("onboarding.summary.bitcoinWhere", { where }) : t("onboarding.summary.bitcoinYes"),
    );
  } else if (draft.hasInvestedBitcoin === false) {
    const reasonId = draft.bitcoinReasons[0];
    lines.push(
      reasonId
        ? t("onboarding.summary.bitcoinReason", { reason: t(`onboarding.reasons.${reasonId}`) })
        : t("onboarding.summary.bitcoinNo"),
    );
  } else {
    lines.push(t("onboarding.summary.bitcoinSkipped"));
  }

  if (draft.goalId) {
    lines.push(t("onboarding.summary.goal", { goal: t(`onboarding.goals.${draft.goalId}`) }));
  } else {
    lines.push(t("onboarding.summary.goalSkipped"));
  }

  lines.push(t("onboarding.summary.next"));
  return lines;
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-4">
      <button
        type="button"
        aria-pressed={value === true}
        onClick={() => onChange(true)}
        className={`btn flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
          value === true ? "choice-picked" : "choice-idle"
        }`}
      >
        {t("common.yes")}
        {value === true ? <span aria-hidden="true">✓</span> : null}
      </button>
      <button
        type="button"
        aria-pressed={value === false}
        onClick={() => onChange(false)}
        className={`btn flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
          value === false ? "choice-picked" : "choice-idle"
        }`}
      >
        {t("common.no")}
        {value === false ? <span aria-hidden="true">✓</span> : null}
      </button>
    </div>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} className="btn btn-primary mx-auto min-w-40">
      {t("common.continue")}
    </button>
  );
}

function DebtStep({
  draft,
  patch,
  choose,
  continueStep,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  choose: (next: Partial<Draft>) => void;
  continueStep: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <YesNo
        value={draft.hasDebt}
        onChange={(hasDebt) => (hasDebt ? patch({ hasDebt }) : choose({ hasDebt }))}
      />
      {draft.hasDebt ? (
        <div className="space-y-3">
          <label className="block text-sm text-ink">
            {t("common.notes")}
            <input
              className="field mt-1"
              placeholder={t("onboarding.debt.notesPlaceholder")}
              value={draft.debtNotes}
              onChange={(event) => patch({ debtNotes: event.target.value })}
            />
          </label>
          <label className="block text-sm text-ink">
            {t("onboarding.debt.balanceLabel")}
            <span className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate">KES</span>
              <input
                className="field"
                inputMode="numeric"
                placeholder={t("common.wholeShillings")}
                value={draft.debtBalance}
                onChange={(event) => patch({ debtBalance: event.target.value })}
              />
            </span>
          </label>
          {draft.debtNotes.trim() || draft.debtBalance.trim() ? (
            <ContinueButton onClick={continueStep} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChamaStep({
  draft,
  patch,
  choose,
  continueStep,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  choose: (next: Partial<Draft>) => void;
  continueStep: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <YesNo
        value={draft.inChama}
        onChange={(inChama) => (inChama ? patch({ inChama }) : choose({ inChama }))}
      />
      {draft.inChama ? (
        <div className="space-y-3">
          <label className="block text-sm text-ink">
            {t("common.name")}
            <input
              className="field mt-1"
              placeholder={t("onboarding.chama.namePlaceholder")}
              value={draft.chamaName}
              onChange={(event) => patch({ chamaName: event.target.value })}
            />
          </label>
          <label className="block text-sm text-ink">
            {t("onboarding.chama.contribution")}
            <span className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate">KES</span>
              <input
                className="field"
                inputMode="numeric"
                placeholder={t("common.wholeShillings")}
                value={draft.chamaAmount}
                onChange={(event) => patch({ chamaAmount: event.target.value })}
              />
            </span>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3 lg:mt-0">
            <button
              type="button"
              aria-pressed={draft.chamaCadence === "monthly"}
              onClick={() => patch({ chamaCadence: "monthly" })}
              className={`btn min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.chamaCadence === "monthly" ? "choice-picked" : "choice-idle"
              }`}
            >
              {t("common.monthly")}
            </button>
            <button
              type="button"
              aria-pressed={draft.chamaCadence === "weekly"}
              onClick={() => patch({ chamaCadence: "weekly" })}
              className={`btn min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.chamaCadence === "weekly" ? "choice-picked" : "choice-idle"
              }`}
            >
              {t("common.weekly")}
            </button>
          </div>
          {draft.chamaName.trim() || draft.chamaAmount.trim() ? (
            <ContinueButton onClick={continueStep} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GoalStep({
  draft,
  patch,
  continueStep,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  continueStep: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="mt-2 flex flex-col gap-4 lg:mt-0 lg:gap-2">
        {GOAL_IDS.map((goalId) => (
          <button
            key={goalId}
            type="button"
            aria-pressed={draft.goalId === goalId}
            onClick={() => patch({ goalId })}
            className={`btn flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
              draft.goalId === goalId ? "choice-picked" : "choice-idle"
            }`}
          >
            {t(`onboarding.goals.${goalId}`)}
            {draft.goalId === goalId ? <span aria-hidden="true">✓</span> : null}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm text-ink">
        {t("onboarding.goal.anythingElse")}
        <input
          className="field mt-1"
          placeholder={t("onboarding.goal.notesPlaceholder")}
          value={draft.goalNotes}
          onChange={(event) => patch({ goalNotes: event.target.value })}
        />
      </label>
      {draft.goalId ? <ContinueButton onClick={continueStep} /> : null}
    </div>
  );
}

function WantsChamaStep({
  draft,
  choose,
}: {
  draft: Draft;
  choose: (next: Partial<Draft>) => void;
}) {
  return (
    <YesNo value={draft.wantsChama} onChange={(wantsChama) => choose({ wantsChama })} />
  );
}

function BitcoinExperienceStep({
  draft,
  patch,
  continueStep,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  continueStep: () => void;
}) {
  const { t } = useI18n();

  function toggleReason(id: BitcoinReasonId) {
    const current = draft.bitcoinReasons;
    const next = current.includes(id)
      ? current.filter((r) => r !== id)
      : [...current, id];
    patch({ bitcoinReasons: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {draft.hasInvestedBitcoin !== false ? (
        <YesNo
          value={draft.hasInvestedBitcoin}
          onChange={(hasInvestedBitcoin) =>
            patch({ hasInvestedBitcoin, bitcoinWhere: "", bitcoinReasons: [], bitcoinOtherReason: "" })
          }
        />
      ) : null}

      {draft.hasInvestedBitcoin === true && (
        <label className="block text-sm text-ink">
          {t("onboarding.bitcoin.placeLabel")}
          <input
            className="field mt-1"
            placeholder={t("onboarding.bitcoin.placePlaceholder")}
            value={draft.bitcoinWhere}
            onChange={(e) => patch({ bitcoinWhere: e.target.value })}
          />
          {draft.bitcoinWhere.trim() ? <ContinueButton onClick={continueStep} /> : null}
        </label>
      )}

      {draft.hasInvestedBitcoin === false && (
        <div className="mt-2 flex flex-col gap-4 lg:mt-0 lg:gap-2">
          {BITCOIN_REASON_IDS.map((reasonId) => {
            const selected = draft.bitcoinReasons.includes(reasonId);
            return (
              <button
                key={reasonId}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleReason(reasonId)}
                className={`btn flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
                  selected ? "choice-picked" : "choice-idle"
                }`}
              >
                {t(`onboarding.reasons.${reasonId}`)}
                <span aria-hidden="true" className="choice-mark h-4 w-4 shrink-0 rounded-full border" />
              </button>
            );
          })}
          {draft.bitcoinReasons.includes("other") && (
            <label className="block text-sm text-ink">
              {t("onboarding.bitcoin.describe")}
              <input
                className="field mt-1"
                placeholder={t("onboarding.bitcoin.reasonPlaceholder")}
                value={draft.bitcoinOtherReason}
                onChange={(e) => patch({ bitcoinOtherReason: e.target.value })}
              />
            </label>
          )}
          {draft.bitcoinReasons.length > 0 ? <ContinueButton onClick={continueStep} /> : null}
        </div>
      )}
    </div>
  );
}
