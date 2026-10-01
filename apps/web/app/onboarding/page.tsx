/**
 * A few questions.
 *
 * One card at a time. Placeholder text only. Answers are a draft in
 * sessionStorage until the encrypted on-device store exists. They are not
 * the financial profile, and they are not kept in localStorage.
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OnboardingAnswers, UserGoal } from "@pesasense/core";

const DRAFT_KEY = "pesasense.onboarding";

type GoalId = "emergency_buffer" | "long_horizon" | "school_fees" | "inflation";

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
};

const GOALS: { id: GoalId; label: string }[] = [
  { id: "emergency_buffer", label: "Build emergency buffer" },
  { id: "long_horizon", label: "Long-term patient savings" },
  { id: "school_fees", label: "School fees peace of mind" },
  { id: "inflation", label: "Protect against inflation" },
];

function wholeKes(value: string): number | null {
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

/** Map the chips onto the profile goal. School fees and inflation have no own kind. */
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

/** Turn the draft into onboarding answers. Incomplete yes-answers are left out. */
function toAnswers(draft: Draft): OnboardingAnswers {
  const balance = wholeKes(draft.debtBalance);
  const debts =
    draft.hasDebt === true && draft.debtNotes.trim() && balance !== null
      ? [{ label: draft.debtNotes.trim(), balanceKes: balance }]
      : [];

  const contribution = wholeKes(draft.chamaAmount);
  // The profile stores a monthly figure. A weekly amount is four contributions.
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

/** Three questions. Skip leaves that answer blank and moves on. */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);

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
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ draft: nextDraft, answers: toAnswers(nextDraft) }),
    );
    router.push("/");
  }

  function next() {
    advance(draft);
  }

  function skip() {
    if (step === 0) {
      advance({ ...draft, hasDebt: null, debtNotes: "", debtBalance: "" });
      return;
    }
    if (step === 1) {
      advance({
        ...draft,
        inChama: null,
        chamaName: "",
        chamaAmount: "",
        chamaCadence: "monthly",
      });
      return;
    }
    advance({ ...draft, goalId: null, goalNotes: "" });
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col">
      <p className="text-xs font-semibold tracking-widest text-moss uppercase">
        Step {step + 1} of 3
      </p>
      <h1 className="mt-2 font-serif text-3xl text-pine">A few questions</h1>

      {step === 0 ? <DebtStep draft={draft} patch={patch} /> : null}
      {step === 1 ? <ChamaStep draft={draft} patch={patch} /> : null}
      {step === 2 ? <GoalStep draft={draft} patch={patch} /> : null}

      <div className="mt-8 flex flex-col gap-3">
        <button type="button" onClick={next} className="btn btn-primary w-full py-4">
          {step === 2 ? "Continue" : "Next"}
        </button>
        <button
          type="button"
          onClick={skip}
          className="btn btn-ghost w-full py-2 text-sm"
        >
          Skip for now
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-ink/55">Stored on your phone only.</p>
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
            ? "border-pine bg-pine text-paper"
            : "border-sand bg-white/70 text-ink"
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
            ? "border-pine bg-pine text-paper"
            : "border-sand bg-white/70 text-ink"
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
    <section className="card mt-6">
      <h2 className="text-lg font-semibold text-ink">Any loans or debts?</h2>
      <p className="mt-1 text-sm leading-6 text-ink/70">
        Statements miss most of these. Your answer is used first.
      </p>
      <YesNo value={draft.hasDebt} onChange={(hasDebt) => patch({ hasDebt })} />
      {draft.hasDebt ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-ink/80">
            Notes
            <input
              className="field mt-1"
              placeholder="What the debt is for"
              value={draft.debtNotes}
              onChange={(event) => patch({ debtNotes: event.target.value })}
            />
          </label>
          <label className="block text-sm text-ink/80">
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
    <section className="card mt-6">
      <h2 className="text-lg font-semibold text-ink">Are you in a chama?</h2>
      <p className="mt-1 text-sm leading-6 text-ink/70">
        This records the contribution. It never holds the money.
      </p>
      <YesNo value={draft.inChama} onChange={(inChama) => patch({ inChama })} />
      {draft.inChama ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-ink/80">
            Name
            <input
              className="field mt-1"
              placeholder="Chama name"
              value={draft.chamaName}
              onChange={(event) => patch({ chamaName: event.target.value })}
            />
          </label>
          <label className="block text-sm text-ink/80">
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
                  ? "border-pine bg-pine text-paper"
                  : "border-sand text-ink"
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
                  ? "border-pine bg-pine text-paper"
                  : "border-sand text-ink"
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
    <section className="card mt-6">
      <h2 className="text-lg font-semibold text-ink">What is the money for?</h2>
      <div className="mt-4 flex flex-col gap-2">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            aria-pressed={draft.goalId === goal.id}
            onClick={() => patch({ goalId: goal.id })}
            className={`btn min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
              draft.goalId === goal.id
                ? "border-pine bg-pine text-paper"
                : "border-sand bg-white/70 text-ink"
            }`}
          >
            {goal.label}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm text-ink/80">
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
