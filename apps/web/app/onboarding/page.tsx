"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OnboardingAnswers, UserGoal } from "@pesasense/core";
import type { SensiMood } from "../../components/sensi-avatar";
import { ThemeToggle } from "../../components/theme-toggle";

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
  { id: "scam_risk", label: "I'm worried about scams" },
  { id: "no_understanding", label: "I don't understand how it works" },
  { id: "capital", label: "It feels like it needs too much money" },
  { id: "regulation", label: "I'm not sure about the rules in Kenya" },
  { id: "returns", label: "I want something that pays back sooner" },
  { id: "other", label: "Something else" },
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
    setAcknowledgment(ACKNOWLEDGMENTS[step % ACKNOWLEDGMENTS.length] ?? "Got it.");
    window.setTimeout(() => {
      setAcknowledgment(null);
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
    const total = summaryLines(finale).length;
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
  }, [isCelebrating, finale, beat]);

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
    const lines = summaryLines(finale);
    const shown = Math.min(beat, lines.length);
    const done = shown >= lines.length;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center gap-4 px-5 py-8 sm:px-8 lg:flex-row lg:items-center">
        <img
          src={done ? "/sensi-yes.png" : "/sensi-think.png"}
          alt="Sensi"
          className="pointer-events-none h-72 w-auto object-contain sm:h-96 lg:h-[min(68vh,560px)]"
        />
        <Thought
          title="On this phone"
          ask={done ? "That's the picture I have." : "Let me read that back."}
          why={done ? "Nothing here leaves the phone. Next is your history." : "One line at a time, from what you just said."}
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
                      ready ? "bg-pine text-paper" : "border border-sand"
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
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-5 sm:px-8">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          aria-label="Go to previous step"
          className="btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-paper text-xl text-pine"
        >
          &lt;
        </button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
            Step {step + 1} of {TOTAL_STEPS}
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
          <ThemeToggle />
          <button type="button" onClick={skip} className="btn text-sm font-semibold text-slate">
            Skip
          </button>
        </div>
      </header>

      <div className="mt-2 grid flex-1 items-center gap-1 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-4">
        <div className="flex flex-col items-center">
          <img
            src={pose}
            alt="Sensi"
            className="pointer-events-none h-64 w-auto object-contain sm:h-80 lg:h-[min(68vh,560px)]"
          />
          <p className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-slate uppercase">Sensi</p>
        </div>
        <div>
          <Thought {...promptFor(step, draft)}>
            {acknowledgment ? <p className="text-sm font-semibold text-pine">{acknowledgment}</p> : null}
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

const ACKNOWLEDGMENTS = ["Got it.", "Nice.", "Noted.", "Okay!"];

type Prompt = { title: string; ask: string; why: string };

function promptFor(step: number, draft: Draft): Prompt {
  if (step === 0) {
    return {
      title: "Debts",
      ask: "Do you repay any debt every month?",
      why: "A loan or a balance you pay back. I'll leave room for it. Rent can wait for your statement.",
    };
  }
  if (step === 1) {
    return {
      title: "Chama",
      ask: "Are you in a chama right now?",
      why: "If you contribute, tell me the name and the amount so I don't treat that money as spare.",
    };
  }
  if (step === 2) {
    return {
      title: "A new chama",
      ask: "Would you like to join a chama?",
      why: "Say yes only if you want one. I'll show it in the app. Saying no changes nothing else.",
    };
  }
  if (step === 3 && draft.hasInvestedBitcoin === false) {
    return {
      title: "Bitcoin",
      ask: "Why haven't you bought Bitcoin?",
      why: "Pick any that fit. I'm asking so I know how much to explain. Nothing is bought on this step.",
    };
  }
  if (step === 3 && draft.hasInvestedBitcoin === true) {
    return {
      title: "Bitcoin",
      ask: "Where do you buy or hold it?",
      why: "A name is enough. You don't have to share an amount. Nothing is bought on this step.",
    };
  }
  if (step === 3) {
    return {
      title: "Bitcoin",
      ask: "Have you bought Bitcoin before?",
      why: "So I know how much to explain. This step does not buy anything.",
    };
  }
  return {
    title: "Ready for",
    ask: "What do you want this money to help you feel ready for?",
    why: "Pick one. A small habit comes later, and you still approve each purchase.",
  };
}

function summaryLines(draft: Draft): string[] {
  const lines: string[] = [];
  if (draft.hasDebt === true) {
    const name = draft.debtNotes.trim();
    const amount = wholeKes(draft.debtBalance);
    if (name && amount !== null) {
      lines.push(`${name}, balance about KES ${amount.toLocaleString("en-KE")}.`);
    } else if (name) {
      lines.push(`A monthly debt: ${name}.`);
    } else {
      lines.push("You repay something every month.");
    }
  } else if (draft.hasDebt === false) {
    lines.push("No monthly debt to set aside.");
  } else {
    lines.push("Monthly debt: skipped for now.");
  }

  if (draft.inChama === true) {
    const name = draft.chamaName.trim();
    const amount = wholeKes(draft.chamaAmount);
    const cadence = draft.chamaCadence === "weekly" ? "a week" : "a month";
    if (name && amount !== null) {
      lines.push(`${name}: KES ${amount.toLocaleString("en-KE")} ${cadence}.`);
    } else if (name) {
      lines.push(`You're in ${name}.`);
    } else {
      lines.push("You're in a chama.");
    }
  } else if (draft.inChama === false) {
    lines.push("No chama contribution right now.");
  } else {
    lines.push("Chama contribution: skipped for now.");
  }

  if (draft.wantsChama === true) lines.push("You'd like to join a chama.");
  else if (draft.wantsChama === false) lines.push("You don't want a chama just yet.");
  else lines.push("Joining a chama: skipped for now.");

  if (draft.hasInvestedBitcoin === true) {
    const where = draft.bitcoinWhere.trim();
    lines.push(where ? `You've bought Bitcoin, through ${where}.` : "You've bought Bitcoin before.");
  } else if (draft.hasInvestedBitcoin === false) {
    const reason = BITCOIN_REASONS.find((item) => item.id === draft.bitcoinReasons[0]);
    lines.push(reason ? `Bitcoin: ${reason.label}.` : "You haven't bought Bitcoin before.");
  } else {
    lines.push("Bitcoin: skipped for now.");
  }

  const goal = GOALS.find((item) => item.id === draft.goalId);
  if (goal) lines.push(`Ready for: ${goal.label}.`);
  else lines.push("What you're saving toward: skipped for now.");

  lines.push("Next I'll ask for your history, on this phone.");
  return lines;
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
          value === true ? "choice-picked" : "choice-idle"
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
          value === false ? "choice-picked" : "choice-idle"
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
                draft.chamaCadence === "monthly" ? "choice-picked" : "choice-idle"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={draft.chamaCadence === "weekly"}
              onClick={() => patch({ chamaCadence: "weekly" })}
              className={`btn min-h-12 rounded-2xl border text-sm font-semibold ${
                draft.chamaCadence === "weekly" ? "choice-picked" : "choice-idle"
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
            className={`btn flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
              draft.goalId === goal.id ? "choice-picked" : "choice-idle"
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
          The place
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
                  selected ? "choice-picked" : "choice-idle"
                }`}
              >
                {reason.label}
                <span aria-hidden="true" className="choice-mark h-4 w-4 shrink-0 rounded-full border" />
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
