"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";
import type { BuyCadence } from "@pesasense/core";
import { HabitInvestJourney } from "../../components/habit-invest-journey";
import { ProfileRequired } from "../../components/profile-required";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useProfile } from "../../contexts/profile-context";
import { appInvestAllowance } from "../../lib/buffer-gate";
import { habitPercentOfFloor } from "../../lib/format";
import { habitOffer, parseWholeKes, planWithAmount } from "../../lib/habit-plan";
import {
  readHabitReminder,
  requestReminderNotification,
  writeHabitReminder,
  type HabitReminder,
} from "../../lib/habit-reminder";
import { useActiveProfile } from "../../lib/use-active-profile";

type HabitError =
  | "habit.errors.whole"
  | "habit.errors.exceeds"
  | "habit.errors.save"
  | "habit.errors.reminder";

function HabitContent() {
  const active = useActiveProfile();
  const { setProfile } = useProfile();
  const { t, locale } = useI18n();
  const { kes } = useFormat();
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<BuyCadence>("monthly");
  const [errorKey, setErrorKey] = useState<HabitError | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [reminder, setReminder] = useState<HabitReminder | null>(null);

  const planAmount = active.ready ? active.profile.investmentPlan?.amountKes : undefined;
  const planCadence = active.ready ? active.profile.investmentPlan?.cadence : undefined;

  useEffect(() => {
    setReminder(readHabitReminder());
  }, []);

  useEffect(() => {
    if (!active.ready) return;
    setAmount(planAmount != null && planAmount > 0 ? String(planAmount) : "");
    setCadence(planCadence === "weekly" ? "weekly" : "monthly");
  }, [active.ready, planAmount, planCadence]);

  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, isDemo } = active;
  const offer = habitOffer(profile);
  const floor = offer.ok ? offer.maxKes : 0;
  const savedHabit = profile.investmentPlan?.amountKes ?? 0;
  const draftAmount = parseWholeKes(amount);
  const previewKes =
    draftAmount !== null && offer.ok && draftAmount <= offer.maxKes ? draftAmount : savedHabit;
  const share = habitPercentOfFloor(previewKes, profile.surplus.monthlyKes.floor);
  const width = Math.max(0, Math.min(100, share));
  const allowance = appInvestAllowance(profile);
  const draftMatches =
    profile.investmentPlan != null &&
    draftAmount === profile.investmentPlan.amountKes &&
    cadence === profile.investmentPlan.cadence;
  const cadenceLabel = cadence === "weekly" ? t("habit.perWeekly") : t("habit.perMonthly");

  function onSave() {
    if (!offer.ok) return;
    const nextAmount = parseWholeKes(amount);
    if (nextAmount === null) {
      setErrorKey("habit.errors.whole");
      setSavedNote(false);
      return;
    }
    if (nextAmount > offer.maxKes) {
      setErrorKey("habit.errors.exceeds");
      setSavedNote(false);
      return;
    }
    try {
      const nextProfile = planWithAmount(profile, nextAmount, cadence);
      setProfile(nextProfile);
      const raw = localStorage.getItem("pesasense.profile");
      if (!raw) {
        throw new Error("missing profile storage");
      }
      const stored = JSON.parse(raw) as { investmentPlan?: { amountKes?: number } };
      if (stored.investmentPlan?.amountKes !== nextAmount) {
        throw new Error("habit not persisted");
      }
      const existing = readHabitReminder();
      if (existing) {
        setReminder(writeHabitReminder({ amountKes: nextAmount, cadence }));
      }
    } catch {
      setErrorKey("habit.errors.save");
      setSavedNote(false);
      return;
    }
    setErrorKey(null);
    setReminderNote(null);
    setSavedNote(true);
  }

  async function onRemind() {
    const plan = profile.investmentPlan;
    if (!plan || plan.amountKes <= 0 || !draftMatches) return;
    try {
      const next = writeHabitReminder({
        amountKes: plan.amountKes,
        cadence: plan.cadence,
      });
      setReminder(next);
      setErrorKey(null);
    } catch {
      setErrorKey("habit.errors.reminder");
      return;
    }
    const arm = await requestReminderNotification(plan.amountKes, locale);
    setReminderNote(arm.note);
  }

  const errorText =
    errorKey === "habit.errors.exceeds"
      ? t(errorKey, { floor: kes(offer.ok ? offer.maxKes : 0) })
      : errorKey
        ? t(errorKey)
        : null;

  return (
    <main className="flex w-full flex-col gap-8 pb-24 md:gap-5 md:pb-0">
      <HabitInvestJourney step="habit" />
      <header className="mb-2 md:mb-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
          {t("habit.eyebrow")}
        </p>
        <h1 className="mt-1 text-[28px] leading-9 font-bold tracking-tight text-ink">
          {t("habit.title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate">{t("habit.intro")}</p>
        <p className="mt-1 text-sm leading-6 text-slate">{t("habit.journeyNote")}</p>
        {isDemo ? (
          <p className="mt-2 text-[11px] font-semibold text-slate">{t("habit.demoData")}</p>
        ) : null}
      </header>

      <section className="flex items-start gap-3 rounded-[20px] bg-mint px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-teal">
          <LeafIcon />
        </span>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{t("habit.sensiNote")}</p>
            <p className="text-[11px] font-semibold tracking-wide text-teal uppercase">
              {t("habit.mindset")}
            </p>
          </div>
          <p className="mt-1 text-sm leading-5 text-ink">“{t("habit.sensiQuote")}”</p>
        </div>
      </section>

      {offer.ok ? (
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
              {t("habit.allocated")}
            </p>
            <div className="flex rounded-full bg-pearl p-1 text-xs font-semibold">
              <button
                type="button"
                aria-pressed={cadence === "weekly"}
                onClick={() => setCadence("weekly")}
                className={`rounded-full px-3 py-1 ${cadence === "weekly" ? "bg-brass text-on-accent shadow-card" : "text-slate"}`}
              >
                {t("common.weekly")}
              </button>
              <button
                type="button"
                aria-pressed={cadence === "monthly"}
                onClick={() => setCadence("monthly")}
                className={`rounded-full px-3 py-1 ${cadence === "monthly" ? "bg-brass text-on-accent shadow-card" : "text-slate"}`}
              >
                {t("common.monthly")}
              </button>
            </div>
          </div>
          <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="habit-amount">
            {t("habit.amountLabel")}
          </label>
          <input
            id="habit-amount"
            type="text"
            inputMode="numeric"
            className="field mt-2 max-w-[12rem] text-2xl font-bold"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setSavedNote(false);
            }}
            placeholder="0"
          />
          <p className="mt-3 text-[32px] leading-10 font-bold text-ink tabular-nums">
            {kes(previewKes)}{" "}
            <span className="text-base font-semibold text-slate">/ {cadenceLabel}</span>
          </p>
          <p className="mt-1 text-sm text-slate">
            <span className="mr-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold">
              {isDemo ? t("habit.demo") : t("habit.illustrative")}
            </span>
            {t("habit.satsNote")}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <p className="font-semibold text-ink">{t("habit.share", { share })}</p>
            <p className="text-slate tabular-nums">{t("habit.floor", { amount: kes(floor) })}</p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-pearl" aria-hidden="true">
            <div className="h-2 rounded-full bg-teal dark:bg-[#8fd0c4]" style={{ width: `${width}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate">{t("habit.cadenceNote")}</p>
          {errorText ? (
            <p className="mt-3 text-sm font-semibold text-warning" role="alert">
              {errorText}
            </p>
          ) : null}
          {savedNote ? <p className="mt-3 text-sm text-teal">{t("habit.saved")}</p> : null}
          <button type="button" onClick={onSave} className="btn btn-accent mt-4 w-full">
            {t("habit.save")}
          </button>
          <button
            type="button"
            onClick={() => void onRemind()}
            disabled={!draftMatches}
            className="btn btn-secondary mt-3 w-full"
          >
            {t("habit.remind")}
          </button>
          {reminderNote ? (
            <p className="mt-3 text-sm leading-6 text-teal">{reminderNote}</p>
          ) : reminder ? (
            <p className="mt-3 text-sm leading-6 text-slate">{t("habit.remindSet")}</p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate">
              {draftMatches ? t("habit.remindStays") : t("habit.remindAfterSave")}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-[20px] border border-mint/60 bg-mint/20 p-5 shadow-card">
          <p className="text-sm leading-6 text-ink">{t("habit.bufferFirst")}</p>
          <p className="mt-2 text-sm leading-6 text-slate">{t("habit.nothingToSet")}</p>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between md:mb-2">
          <h2 className="text-base font-semibold text-ink">{t("habit.ladderTitle")}</h2>
          <p className="text-xs font-semibold text-slate">{t("habit.tiers", { count: 3 })}</p>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
          <Ladder
            n="1"
            title={t("habit.cashTitle")}
            state={t("habit.cashState")}
            body={t("habit.cashBody")}
            current={false}
          />
          <Ladder
            n="2"
            title={t("habit.everydayTitle")}
            state={t("habit.everydayState")}
            body={t("habit.everydayBody")}
            current={false}
          />
          <Ladder
            n="3"
            title={t("habit.bitcoinTitle")}
            state={t("habit.bitcoinState")}
            body={t("habit.bitcoinBody")}
            current
          />
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 rounded-full bg-pearl px-4 py-2 text-center text-xs font-semibold text-slate">
        {t("habit.keys")}
      </p>

      {offer.ok && draftMatches && allowance.ok ? (
        <Link href="/invest" className="btn btn-accent inline-flex items-center justify-center">
          {t("habit.review")}
        </Link>
      ) : null}
      <p className="text-center text-sm text-slate">{t("habit.skipMonth")}</p>
      <p className="text-xs leading-5 text-slate">{t("habit.disclaimer")}</p>
    </main>
  );
}

function Ladder({
  n,
  title,
  state,
  body,
  current,
}: {
  n: string;
  title: string;
  state: string;
  body: string;
  current: boolean;
}) {
  return (
    <article className="flex gap-3 border-t border-line px-4 py-4 first:border-t-0">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${current ? "bg-teal text-on-primary" : "bg-mint text-teal"
          }`}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p
            className={`text-[11px] font-semibold tracking-wide uppercase ${current ? "text-teal" : "text-slate"
              }`}
          >
            {state}
          </p>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-slate">{body}</p>
      </div>
    </article>
  );
}

export default function HabitPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="skeleton animate-pulse h-6 w-32 rounded-full" />
          <div className="skeleton animate-pulse h-10 w-64 rounded-full" />
          <div className="card skeleton animate-pulse h-40" />
        </main>
      }
    >
      <HabitContent />
    </Suspense>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
      <path d="M12 3c4 3 6 7 6 11a6 6 0 0 1-12 0c0-4 2-8 6-11z" />
    </svg>
  );
}
