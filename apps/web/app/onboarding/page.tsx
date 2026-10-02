"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OnboardingAnswers, UserGoal } from "@pesasense/core";
import { Sensi } from "../../components/sensi";

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

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  function patch(next: Partial<Draft>) {
    setDraft((current) => {
      const updated = { ...current, ...next };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function advance(nextDraft: Draft) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
    setDraft(nextDraft);
    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
      return;
    }
    
    setIsCelebrating(true);
    setTimeout(() => {
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
    }, 1500);
  }

  function next() {
    advance(draft);
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

  const isLastStep = step === TOTAL_STEPS - 1;

  if (isCelebrating) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in duration-500">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-teal mb-5">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.5">
            <polyline strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-ink">You're all set</h2>
        <p className="mt-2 text-sm text-slate">Saving your answers…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
        <button type="button" onClick={skip} className="btn text-sm font-semibold text-slate">
          Skip for now
        </button>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-card">
          <Sensi className="h-11 w-11" />
        </span>
        <div className="rounded-[18px] bg-white px-4 py-3 shadow-card">
          <p className="text-[11px] font-semibold tracking-wide text-teal uppercase">Sensi</p>
          <p className="mt-1 text-sm leading-5 text-ink">
            A few quick questions, so the picture stays honest. One at a time.
          </p>
        </div>
      </div>

      {step === 0 ? <DebtStep draft={draft} patch={patch} /> : null}
      {step === 1 ? <ChamaStep draft={draft} patch={patch} /> : null}
      {step === 2 ? <WantsChamaStep draft={draft} patch={patch} /> : null}
      {step === 3 ? <BitcoinExperienceStep draft={draft} patch={patch} /> : null}
      {step === 4 ? <GoalStep draft={draft} patch={patch} /> : null}

      <div className="mt-8 flex flex-col gap-2">
        <button type="button" onClick={next} className="btn btn-primary w-full text-base">
          {isLastStep ? "Continue to M-Pesa history" : "Next"}
        </button>
      </div>
      <p className="mt-6 text-center text-xs leading-5 text-slate">
        Stored on this phone for this visit. Your statements never leave your phone.
      </p>
    </main>
  );
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
        className={`btn min-h-12 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          value === true
            ? "border-teal bg-teal text-on-primary"
            : "border-line bg-white text-ink"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        aria-pressed={value === false}
        onClick={() => onChange(false)}
        className={`btn min-h-12 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          value === false
            ? "border-teal bg-teal text-on-primary"
            : "border-line bg-white text-ink"
        }`}
      >
        No
      </button>
    </div>
  );
}

function DebtStep({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  return (
    <section className="mt-6 rounded-[20px] bg-white p-5 shadow-card">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
        Question 01
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Any loans or debts?</h2>
      <p className="mt-1 text-sm leading-6 text-slate">
        No judgment. Statements miss most of these, so your answer is used first.
      </p>
      <YesNo value={draft.hasDebt} onChange={(hasDebt) => patch({ hasDebt })} />
      {draft.hasDebt ? (
        <div className="mt-4 space-y-3">
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
        </div>
      ) : null}
    </section>
  );
}

function ChamaStep({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  return (
    <section className="mt-6 rounded-[20px] bg-white p-5 shadow-card">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
        Question 02
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Are you in a chama?</h2>
      <p className="mt-1 text-sm leading-6 text-slate">
        This records the contribution. It never holds the money.
      </p>
      <YesNo value={draft.inChama} onChange={(inChama) => patch({ inChama })} />
      {draft.inChama ? (
        <div className="mt-4 space-y-3">
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
        </div>
      ) : null}
    </section>
  );
}

function GoalStep({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  return (
    <section className="mt-6 rounded-[20px] bg-white p-5 shadow-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
        Question 05
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink">
        What would you like your money to do?
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            aria-pressed={draft.goalId === goal.id}
            onClick={() => patch({ goalId: goal.id })}
            className={`btn min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
              draft.goalId === goal.id
                ? "border-teal bg-mint text-ink"
                : "border-line bg-white text-ink"
            }`}
          >
            {goal.label}
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
    </section>
  );
}

function WantsChamaStep({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  return (
    <section className="mt-6 rounded-[20px] bg-white p-5 shadow-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
        Question 03
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Do you want a Chama?</h2>
      <p className="mt-1 text-sm leading-6 text-slate">
        We can show you a Chama tab to track group savings.
      </p>
      <YesNo
        value={draft.wantsChama}
        onChange={(wantsChama) => patch({ wantsChama })}
      />
    </section>
  );
}

function BitcoinExperienceStep({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  function toggleReason(id: BitcoinReasonId) {
    const current = draft.bitcoinReasons;
    const next = current.includes(id)
      ? current.filter((r) => r !== id)
      : [...current, id];
    patch({ bitcoinReasons: next });
  }

  return (
    <section className="mt-6 rounded-[20px] bg-white p-5 shadow-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
        Question 04
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink">
        Have you been investing in Bitcoin?
      </h2>
      <YesNo
        value={draft.hasInvestedBitcoin}
        onChange={(hasInvestedBitcoin) =>
          patch({ hasInvestedBitcoin, bitcoinWhere: "", bitcoinReasons: [], bitcoinOtherReason: "" })
        }
      />

      {draft.hasInvestedBitcoin === true && (
        <label className="mt-4 block text-sm text-ink">
          Where do you currently invest?
          <input
            className="field mt-1"
            placeholder="e.g. Coinbase, Paxful, Binance…"
            value={draft.bitcoinWhere}
            onChange={(e) => patch({ bitcoinWhere: e.target.value })}
          />
        </label>
      )}

      {draft.hasInvestedBitcoin === false && (
        <div className="mt-4 flex flex-col gap-2">
          {BITCOIN_REASONS.map((reason) => {
            const selected = draft.bitcoinReasons.includes(reason.id);
            return (
              <button
                key={reason.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleReason(reason.id)}
                className={`btn flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
                  selected ? "border-teal bg-mint text-ink" : "border-line bg-white text-ink"
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
            <label className="mt-1 block text-sm text-ink">
              Please describe
              <input
                className="field mt-1"
                placeholder="Your reason"
                value={draft.bitcoinOtherReason}
                onChange={(e) => patch({ bitcoinOtherReason: e.target.value })}
              />
            </label>
          )}
        </div>
      )}
    </section>
  );
}
