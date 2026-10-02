"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OnboardingAnswers, UserGoal } from "@pesasense/core";
import { SensiAvatar, type SensiMood } from "../../components/sensi-avatar";
import { SensiBubble } from "../../components/sensi-bubble";

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

const GOALS: { id: GoalId; label: string }[] = [
  { id: "emergency_buffer", label: "Build emergency buffer" },
  { id: "long_horizon", label: "Long-term patient savings" },
  { id: "school_fees", label: "School fees peace of mind" },
  { id: "inflation", label: "Protect against inflation" },
];

const BITCOIN_REASONS: { id: BitcoinReasonId; label: string }[] = [
  { id: "scam_risk", label: "Scam Risk" },
  { id: "no_understanding", label: "I do not understand how it works" },
  { id: "capital", label: "It requires too much capital" },
  { id: "regulation", label: "There are no regulations surrounding bitcoin in Kenya" },
  { id: "returns", label: "I prefer investments with quicker returns" },
  { id: "other", label: "Other" },
];

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
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [mood, setMood] = useState<SensiMood>("neutral");
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

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
    setAcknowledgment(ACKNOWLEDGMENTS[step % ACKNOWLEDGMENTS.length] ?? "Got it.");
    window.setTimeout(() => {
      setAcknowledgment(null);
      if (step < TOTAL_STEPS - 1) {
        setStep((current) => current + 1);
        setMood("neutral");
        setIsAdvancing(false);
        return;
      }
      setMood("celebrating");
      setIsCelebrating(true);
      window.setTimeout(() => {
        complete(nextDraft);
      }, 900);
    }, 600);
  }

  function patch(next: Partial<Draft>) {
    saveDraft({ ...draft, ...next });
    setMood("happy");
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

  if (isCelebrating) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 py-16 px-4 text-center">
        <SensiAvatar size="xl" mood="celebrating" />
        <h2 className="text-2xl font-bold tracking-tight text-pine">You&apos;re all set</h2>
        <p className="text-sm text-slate">Saving your answers…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 py-10 px-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          aria-label="Go to previous step"
          className="btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-paper text-xl text-pine"
        >
          &lt;
        </button>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
        <button type="button" onClick={skip} className="btn text-sm font-semibold text-slate">
          Skip
        </button>
      </header>

      <div className="flex flex-col items-center gap-5 text-center">
        <SensiAvatar size="xl" mood={mood} />
        <SensiBubble tailPosition="top">
          <p className="text-xl leading-8 font-semibold text-pine">{questionForStep(step)}</p>
        </SensiBubble>
        {acknowledgment ? <p className="text-sm font-semibold text-teal">{acknowledgment}</p> : null}
      </div>

      <div className="flex flex-col gap-3">
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

    </main>
  );
}

const ACKNOWLEDGMENTS = ["Got it.", "Nice.", "Noted.", "Okay!"];

function questionForStep(step: number): string {
  const questions = [
    "Habari! Let's get to know your money. Do you have any debts you pay monthly?",
    "What monthly commitments should we keep in view, like a loan or a chama contribution?",
    "Chamas are a big part of saving in Kenya. Would you like to join one?",
    "Have you tried investing in Bitcoin before?",
    "What would you like your money to help you feel ready for?",
  ];
  return questions[step] ?? questions[0] ?? "";
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button
        type="button"
        aria-pressed={value === true}
        onClick={() => onChange(true)}
        className={`btn flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
          value === true
            ? "border-teal bg-teal text-on-primary"
            : "border-line bg-paper text-ink hover:-translate-y-0.5"
        }`}
      >
        Yes
        {value === true ? <span aria-hidden="true">✓</span> : null}
      </button>
      <button
        type="button"
        aria-pressed={value === false}
        onClick={() => onChange(false)}
        className={`btn flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
          value === false
            ? "border-teal bg-teal text-on-primary"
            : "border-line bg-paper text-ink hover:-translate-y-0.5"
        }`}
      >
        No
        {value === false ? <span aria-hidden="true">✓</span> : null}
      </button>
    </div>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-primary mx-auto min-w-40">
      Continue
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
  return (
    <div className="flex flex-col gap-4">
      <YesNo
        value={draft.hasDebt}
        onChange={(hasDebt) => (hasDebt ? patch({ hasDebt }) : choose({ hasDebt }))}
      />
      {draft.hasDebt ? (
        <div className="space-y-3">
          <label className="block text-sm text-ink">
            Notes
            <input
              className="field mt-1"
              placeholder="What the debt is for"
              value={draft.debtNotes}
              onChange={(event) => patch({ debtNotes: event.target.value })}
            />
          </label>
          <label className="block text-sm text-ink">
            Balance, if you know it
            <span className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-ink/50">KES</span>
              <input
                className="field"
                inputMode="numeric"
                placeholder="Whole shillings"
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
  return (
    <div className="flex flex-col gap-4">
      <YesNo
        value={draft.inChama}
        onChange={(inChama) => (inChama ? patch({ inChama }) : choose({ inChama }))}
      />
      {draft.inChama ? (
        <div className="space-y-3">
          <label className="block text-sm text-ink">
            Name
            <input
              className="field mt-1"
              placeholder="Chama name"
              value={draft.chamaName}
              onChange={(event) => patch({ chamaName: event.target.value })}
            />
          </label>
          <label className="block text-sm text-ink">
            Contribution
            <span className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-ink/50">KES</span>
              <input
                className="field"
                inputMode="numeric"
                placeholder="Whole shillings"
                value={draft.chamaAmount}
                onChange={(event) => patch({ chamaAmount: event.target.value })}
              />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={draft.chamaCadence === "monthly"}
              onClick={() => patch({ chamaCadence: "monthly" })}
              className={`btn min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.chamaCadence === "monthly"
                  ? "border-teal bg-teal text-on-primary"
                  : "border-line bg-white text-ink"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={draft.chamaCadence === "weekly"}
              onClick={() => patch({ chamaCadence: "weekly" })}
              className={`btn min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.chamaCadence === "weekly"
                  ? "border-teal bg-teal text-on-primary"
                  : "border-line bg-white text-ink"
              }`}
            >
              Weekly
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            aria-pressed={draft.goalId === goal.id}
            onClick={() => patch({ goalId: goal.id })}
            className={`btn min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
              draft.goalId === goal.id
                ? "border-teal bg-teal text-on-primary"
                : "border-line bg-paper text-ink"
            }`}
          >
            {goal.label}
            {draft.goalId === goal.id ? <span aria-hidden="true">✓</span> : null}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm text-ink">
        Anything else
        <input
          className="field mt-1"
          placeholder="In your own words"
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
  function toggleReason(id: BitcoinReasonId) {
    const current = draft.bitcoinReasons;
    const next = current.includes(id)
      ? current.filter((r) => r !== id)
      : [...current, id];
    patch({ bitcoinReasons: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <YesNo
        value={draft.hasInvestedBitcoin}
        onChange={(hasInvestedBitcoin) =>
          patch({ hasInvestedBitcoin, bitcoinWhere: "", bitcoinReasons: [], bitcoinOtherReason: "" })
        }
      />

      {draft.hasInvestedBitcoin === true && (
        <label className="block text-sm text-ink">
          Where do you currently invest?
          <input
            className="field mt-1"
            placeholder="e.g. Coinbase, Paxful, Binance…"
            value={draft.bitcoinWhere}
            onChange={(e) => patch({ bitcoinWhere: e.target.value })}
          />
          {draft.bitcoinWhere.trim() ? <ContinueButton onClick={continueStep} /> : null}
        </label>
      )}

      {draft.hasInvestedBitcoin === false && (
        <div className="flex flex-col gap-2">
          {BITCOIN_REASONS.map((reason) => {
            const selected = draft.bitcoinReasons.includes(reason.id);
            return (
              <button
                key={reason.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleReason(reason.id)}
                className={`btn flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
                  selected ? "border-teal bg-teal text-on-primary" : "border-line bg-paper text-ink"
                }`}
              >
                {reason.label}
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 rounded-full border ${
                    selected ? "border-teal bg-teal" : "border-line"
                  }`}
                />
              </button>
            );
          })}
          {draft.bitcoinReasons.includes("other") && (
            <label className="block text-sm text-ink">
              Please describe
              <input
                className="field mt-1"
                placeholder="Your reason"
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
