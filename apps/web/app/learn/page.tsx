"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileRequired } from "../../components/profile-required";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useProfile } from "../../contexts/profile-context";
import { appInvestAllowance, isBufferGateEnabled } from "../../lib/buffer-gate";
import { parseWholeKes, planWithAmount } from "../../lib/habit-plan";
import { useActiveProfile } from "../../lib/use-active-profile";
import { SavingsLadder } from "../../components/savings-ladder";
import { ScenarioChart } from "../../components/scenario-chart";
import { SensiAvatar } from "../../components/sensi-avatar";

const GUIDES = [
  { title: "learn.guides.bitcoinTitle", body: "learn.guides.bitcoinBody" },
  { title: "learn.guides.yearsTitle", body: "learn.guides.yearsBody" },
  { title: "learn.guides.custodyTitle", body: "learn.guides.custodyBody" },
] as const;

const FLAGS = ["learn.flags.returns", "learn.flags.manage", "learn.flags.words"] as const;

type Answer = "drop" | "years" | "rent";

type LearnError =
  | "learn.errors.buildBuffer"
  | "learn.errors.floorTooSmall"
  | "learn.errors.whole"
  | "learn.errors.exceeds"
  | "learn.errors.save";

function LearnPageContent() {
  const router = useRouter();
  const active = useActiveProfile();
  const { setProfile } = useProfile();
  const { t } = useI18n();
  const { kes, number } = useFormat();
  const [open, setOpen] = useState<number | null>(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [errorKey, setErrorKey] = useState<LearnError | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const planKey = active.ready
    ? `${active.profileId}:${active.profile.investmentPlan?.amountKes ?? ""}:${active.profile.investmentPlan?.cadence ?? ""}`
    : "";

  useEffect(() => {
    const current = activeRef.current;
    if (!current.ready) return;
    const plan = current.profile.investmentPlan;
    const nextAllowance = appInvestAllowance(current.profile);
    const max = nextAllowance.ok ? nextAllowance.maxKes : 0;
    const saved = plan?.amountKes ?? 0;
    const recommended = nextAllowance.ok && saved > 0 ? Math.min(saved, max) : 0;
    setAmount(recommended > 0 ? String(recommended) : "");
    setCadence(plan?.cadence === "weekly" ? "weekly" : "monthly");
  }, [planKey]);

  if (!active.ready) {
    return <ProfileRequired />;
  }

  const activeProfile = active.profile;
  const allowance = appInvestAllowance(activeProfile);
  const bufferGateOn = isBufferGateEnabled();
  const surplusFloor = activeProfile.surplus.monthlyKes.floor;
  const maxSaveKes = allowance.ok ? allowance.maxKes : 0;
  const savedHabit = activeProfile.investmentPlan?.amountKes ?? 0;
  const recommendedHabit =
    allowance.ok && savedHabit > 0 ? Math.min(savedHabit, maxSaveKes) : 0;

  const bufferMonths = activeProfile.resilience.monthsOfExpensesCovered;
  const currentStep = bufferMonths >= 3 ? 2 : 1;
  const showTypical = activeProfile.surplus.monthlyKes.ceiling > surplusFloor;
  const blockedKey = !bufferGateOn
    ? showTypical
      ? "learn.blocked.parsedTypical"
      : "learn.blocked.parsed"
    : activeProfile.resilience.bufferFirst
      ? showTypical
        ? "learn.blocked.bufferTypical"
        : "learn.blocked.buffer"
      : showTypical
        ? "learn.blocked.floorTypical"
        : "learn.blocked.floor";
  const reimport = t("learn.reimport");
  const [reimportBefore, reimportAfter = ""] = reimport.split("{link}");

  const handleStartSaving = (e: FormEvent) => {
    e.preventDefault();
    if (!allowance.ok) {
      setErrorKey(
        bufferGateOn && activeProfile.resilience.bufferFirst
          ? "learn.errors.buildBuffer"
          : "learn.errors.floorTooSmall",
      );
      return;
    }
    const num = parseWholeKes(amount);
    if (num === null) {
      setErrorKey("learn.errors.whole");
      return;
    }
    if (num > maxSaveKes) {
      setErrorKey("learn.errors.exceeds");
      return;
    }
    try {
      setProfile(planWithAmount(activeProfile, num, cadence));
    } catch {
      setErrorKey("learn.errors.save");
      return;
    }
    setErrorKey(null);
    router.push("/invest");
  };

  const errorText =
    errorKey === "learn.errors.exceeds"
      ? t(errorKey, { amount: kes(maxSaveKes) })
      : errorKey
        ? t(errorKey)
        : null;

  return (
    <main className="flex w-full flex-col gap-8 pb-24 md:gap-6 md:pb-0">
      <header className="mb-2 md:mb-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">
          {t("learn.eyebrow")}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
          <SensiAvatar size="sm" mood="happy" />
          {t("learn.title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate">{t("learn.intro")}</p>
      </header>

      <ScrollReveal>
        <section className="rounded-[20px] border border-coral/35 bg-coral/10 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral/20 text-coral">
            <WarnIcon />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-coral">{t("learn.scamTitle")}</h2>
            <p className="text-[11px] text-slate">{t("learn.scamHint")}</p>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {FLAGS.map((flag) => (
            <li
              key={flag}
              className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm text-ink"
            >
              <span className="text-coral" aria-hidden="true">×</span>
              {t(flag)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-5 text-slate">{t("learn.scamClose")}</p>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section>
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-moss uppercase">{t("learn.startHere")}</p>
            <h2 className="mt-1 text-base font-semibold text-ink">{t("learn.guidesTitle")}</h2>
          </div>
          <p className="text-xs font-semibold text-slate">{t("learn.topics", { count: GUIDES.length })}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:grid-cols-3">
          {GUIDES.map((guide, index) => {
            const expanded = open === index;
            return (
              <article key={guide.title} className="rounded-[18px] border border-mint/60 bg-mint/15 shadow-card">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : index)}
                  className="btn flex w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-ink">{t(guide.title)}</span>
                  <span className="text-slate" aria-hidden="true">
                    {expanded ? "–" : "+"}
                  </span>
                </button>
                {expanded ? (
                  <p className="px-4 pb-4 text-sm leading-6 text-slate">{t(guide.body)}</p>
                ) : null}
              </article>
            );
          })}
        </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section aria-labelledby="ladder-heading">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-sky uppercase">{t("learn.pathEyebrow")}</p>
        <h2
          id="ladder-heading"
          className="mb-5 text-base font-semibold text-ink"
        >
          {t("learn.journey")}
        </h2>
        <SavingsLadder currentStep={currentStep} bufferMonths={bufferMonths} />
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="scenario-heading">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">{t("learn.rangeEyebrow")}</p>
        <h2
          id="scenario-heading"
          className="mb-4 text-base font-semibold text-ink"
        >
          {t("learn.scenarioTitle")}
        </h2>
        <div className="min-w-0 overflow-hidden px-0">
          <ScenarioChart />
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section aria-labelledby="start-saving-heading" className="rounded-[20px] border border-sand/70 bg-gradient-to-br from-paper to-pearl p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">{t("learn.habitEyebrow")}</p>
        <h2
          id="start-saving-heading"
          className="text-base font-semibold text-ink"
        >
          {t("learn.startSaving")}
        </h2>
        <p className="mt-1 text-sm text-slate">{t("learn.startBody")}</p>
        {!allowance.ok ? (
          <div className="mt-5 space-y-4 rounded-2xl border border-warning/25 bg-[#FBF6EF] p-4">
            <p className="text-sm leading-6 text-ink">
              {t(blockedKey, {
                floor: kes(surplusFloor),
                typical: kes(activeProfile.surplus.monthlyKes.typical),
              })}
            </p>
            {surplusFloor < 500 && activeProfile.income.monthlyKes.typical < 1_000 ? (
              <p className="text-sm leading-6 text-slate">
                {reimportBefore}
                <Link href="/onboard" className="font-semibold text-teal underline underline-offset-2">
                  {t("learn.reimportLink")}
                </Link>
                {reimportAfter}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/habit" className="btn btn-accent flex-1 justify-center text-center">
                {t("learn.buildCushion")}
              </Link>
              <Link href="/surplus" className="btn btn-ghost flex-1 justify-center text-center">
                {t("learn.reviewSurplus")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStartSaving} className="mt-5 space-y-5">
            <div>
              <label htmlFor="save-amount" className="block text-sm font-semibold text-ink">
                {t("learn.amountLabel")}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm font-bold text-slate">KES</span>
                <input
                  id="save-amount"
                  type="number"
                  inputMode="numeric"
                  className="field max-w-[200px]"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("learn.amountExample", { amount: number(recommendedHabit) })}
                  min={10}
                  max={maxSaveKes}
                />
              </div>
              <p className="mt-2 text-xs text-slate">
                {t("learn.safeUpTo", { amount: kes(maxSaveKes) })}
              </p>
            </div>

            <div>
              <span className="block text-sm font-semibold text-ink">{t("learn.frequency")}</span>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCadence("weekly")}
                  className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                    cadence === "weekly"
                      ? "border-brass bg-brass text-paper"
                      : "border-sand bg-paper text-ink hover:bg-sand/30"
                  }`}
                >
                  {t("common.weekly")}
                </button>
                <button
                  type="button"
                  onClick={() => setCadence("monthly")}
                  className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                    cadence === "monthly"
                      ? "border-brass bg-brass text-paper"
                      : "border-sand bg-paper text-ink hover:bg-sand/30"
                  }`}
                >
                  {t("common.monthly")}
                </button>
              </div>
            </div>

            {errorText ? (
              <p className="text-sm font-semibold text-warning" role="alert">
                {errorText}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn-accent w-full py-4 text-base shadow-sm"
            >
              {t("learn.startSaving")}
            </button>
          </form>
        )}
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="rounded-[20px] border border-sky/35 bg-sky/10 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
            {t("learn.checkEyebrow")}
          </p>
          <p className="text-xs text-slate">{t("learn.questionCount", { count: 1 })}</p>
        </div>
        <h2 className="mt-2 text-base font-semibold text-ink">{t("learn.quizTitle")}</h2>
        <div className="mt-3 space-y-2">
          <Choice
            pressed={answer === "drop"}
            onClick={() => setAnswer("drop")}
            label={t("learn.choiceDrop")}
          />
          <Choice
            pressed={answer === "years"}
            onClick={() => setAnswer("years")}
            label={t("learn.choiceYears")}
          />
          <Choice
            pressed={answer === "rent"}
            onClick={() => setAnswer("rent")}
            label={t("learn.choiceRent")}
          />
        </div>
        {answer ? (
          <p className="mt-3 text-sm leading-6 text-slate">{noteFor(answer, t)}</p>
        ) : null}
      </section>
      </ScrollReveal>

      <p className="text-xs leading-5 text-slate">{t("learn.education")}</p>
    </main>
  );
}

function noteFor(
  answer: Answer,
  t: (key: string) => string,
): string {
  if (answer === "years") return t("learn.noteYears");
  if (answer === "rent") return t("learn.noteRent");
  return t("learn.noteDrop");
}

function Choice({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`btn flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
        pressed ? "border-moss bg-mint text-pine" : "border-line bg-paper text-ink"
      }`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`h-4 w-4 rounded-full border ${
          pressed ? "border-teal bg-teal" : "border-line"
        }`}
      />
    </button>
  );
}

function WarnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 fill-none stroke-current"
      strokeWidth="1.75"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v5M12 17h.01M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0z"
      />
    </svg>
  );
}

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPageContent />
    </Suspense>
  );
}

function ScrollReveal({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}
