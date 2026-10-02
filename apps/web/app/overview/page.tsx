"use client";

import { Suspense } from "react";

import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { ProfileRequired } from "../../components/profile-required";
import { ProfileSync } from "../../components/profile-sync";
import { SensiAvatar } from "../../components/sensi-avatar";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { formatKes, habitPercentOfFloor } from "../../lib/format";
import { ImportTrigger } from "../../components/import-trigger";
import { AnimatedNumber } from "../../components/animated-number";
import { appInvestAllowance, showBufferFirstUx } from "../../lib/buffer-gate";
import { useHabitReminder } from "../../lib/habit-reminder";
import { useActiveProfile } from "../../lib/use-active-profile";

const TRUST_ICONS: Record<string, string> = {
  key: "🔑",
  chart: "📊",
  phone: "📱",
};

function TrustChip({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-2xl" role="img" aria-label={icon}>
        {TRUST_ICONS[icon] ?? "✅"}
      </span>
      <span className="text-[10px] font-semibold leading-tight text-slate">
        {label}
      </span>
    </div>
  );
}

function OverviewContent() {
  const active = useActiveProfile();
  const reminder = useHabitReminder();
  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, profileId, isDemo, displayName: name } = active;
  const persona = isDemo ? `${name} (invented demo)` : "Your profile on this phone";

  const { floor, typical, ceiling } = profile.surplus.monthlyKes;

  const habit = profile.investmentPlan?.amountKes ?? 0;
  const share = habitPercentOfFloor(habit, floor);

  const span = Math.max(ceiling - floor, 1);
  const typicalPercent = Math.round(((typical - floor) / span) * 100);
  const query = isDemo && profileId === "brian" ? "?profile=brian" : "";
  const cushionMonths = profile.resilience.monthsOfExpensesCovered;
  const cushionPercent = Math.max(
    0,
    Math.min(100, Math.round((cushionMonths / 3) * 100)),
  );
  const bufferFirst = showBufferFirstUx(profile) || floor <= 0;
  const hasPlan = (profile.investmentPlan?.amountKes ?? 0) > 0;
  const allowance = appInvestAllowance(profile);

  return (
    <main className="flex w-full flex-col gap-4">
      <section className="flex items-center gap-3 rounded-[20px] border border-mint/40 bg-mint/35 px-4 py-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint">
          <SensiAvatar size="sm" mood="happy" />
        </span>
        <p className="text-sm leading-5 text-ink">
          <span className="font-semibold">Habari {name} 👋</span>{" "}
          {bufferFirst
            ? "The buffer comes first. This history is not ready for a Bitcoin habit yet."
            : "Everything essential is covered this month."}
        </p>
      </section>

      <section className="rounded-[20px] bg-gradient-to-br from-pine to-moss p-5 text-paper shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-brass uppercase">
            Safe monthly surplus
          </p>
          {isDemo ? <DemoTag dark /> : null}
        </div>
        <p className="mt-3 text-[32px] leading-10 font-bold tracking-tight text-paper tabular-nums">
          <AnimatedNumber value={floor} /> – <AnimatedNumber value={ceiling} />
        </p>
        <p className="mt-1 text-sm text-paper/80">
          Calm surplus after bills, chamas, and daily life.
        </p>
        <div className="mt-5" aria-hidden="true">
          <div className="relative h-1.5 rounded-full bg-paper/25">
            <div className="absolute inset-y-0 right-0 left-[8%] rounded-full bg-brass" />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass ring-4 ring-moss"
              style={{ left: `${typicalPercent}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-paper/75">
            <span>Conservative</span>
            <span className="rounded-full bg-brass px-2 py-1 text-paper">
              Typical {formatKes(typical)}
            </span>
            <span>Relaxed</span>
          </div>
        </div>
        <p className="sr-only">
          Floor {formatKes(floor)}, typical {formatKes(typical)}, high{" "}
          {formatKes(ceiling)}.
        </p>
      </section>

      {bufferFirst ? (
        <section className="rounded-[20px] border border-mint/60 bg-mint/20 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-moss uppercase">
            Safety cushion
          </p>
          <p className="mt-2 text-sm leading-6 text-ink">
            {cushionMonths} months of expenses covered. The aim is 3 months.
          </p>
          <div className="mt-3 h-2 rounded-full bg-pearl" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-teal"
              style={{ width: `${cushionPercent}%` }}
            />
          </div>
          <Link href={`/habit${query}`} className="btn btn-accent mt-4 inline-flex">
            Here&apos;s how
          </Link>
        </section>
      ) : hasPlan ? (
        <section className="rounded-[20px] border border-brass/40 bg-brass/15 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
            Your habit
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-[28px] leading-9 font-bold text-ink tabular-nums">
              <AnimatedNumber value={habit} />{" "}
              <span className="text-base font-semibold text-slate">
                / {profile.investmentPlan?.cadence === "weekly" ? "week" : "month"}
              </span>
            </p>
            <Link href={`/habit${query}`} className="btn btn-ghost px-4 py-2">
              Adjust
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate">
            Sats appear when there is a quote. {share}% of the safe floor.
          </p>
          {allowance.ok ? (
            <Link href="/invest" className="btn btn-accent mt-4 inline-flex w-full justify-center">
              Review and approve
            </Link>
          ) : null}
          {allowance.ok ? (
            <p className="mt-2 text-sm text-slate">
              You review the purchase here. Nothing is sent until you approve it.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-[20px] border border-brass/40 bg-brass/15 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
            Your habit
          </p>
          <p className="mt-2 text-sm leading-6 text-ink">
            No habit yet. The safe floor is {formatKes(floor)}.
          </p>
          <Link href={`/habit${query}`} className="btn btn-accent mt-4 inline-flex w-full justify-center">
            Set the habit
          </Link>
        </section>
      )}

      {reminder ? (
        <p className="text-sm leading-6 text-slate">
          We&apos;ll remind you on the 1st. You approve each purchase.
        </p>
      ) : null}

      <section className="grid grid-cols-3 gap-1 rounded-[20px] bg-pearl px-2 py-4 text-center">
        <TrustChip label="Never hold keys" icon="key" />
        <TrustChip label="Never push trading" icon="chart" />
        <TrustChip label="Never leaves phone" icon="phone" />
      </section>

      <WalletActivity profileId={profileId} />
      {profileId === "amina" || profileId === "brian" ? (
        <UssdAccess profileId={profileId} />
      ) : null}
      <ProfileSync profile={profile} profileId={profileId} />

      {isDemo ? (
        <section className="card space-y-3">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            Using demo data
          </p>
          <p className="text-sm leading-6 text-slate">
            Import your M-Pesa history to see your real financial picture.
          </p>
          <ImportTrigger />
          <div className="flex gap-3 pt-1 text-sm">
            {profileId === "brian" ? (
              <Link href="/overview" className="text-teal underline underline-offset-2">View Amina</Link>
            ) : (
              <Link href="/overview?profile=brian" className="text-teal underline underline-offset-2">View the thin profile</Link>
            )}
          </div>
        </section>
      ) : null}

      <p className="text-xs leading-5 text-slate">
        {persona}. {PAST_PERFORMANCE_DISCLAIMER}
      </p>
    </main>
  );
}

function DemoTag({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dark ? "bg-paper/15 text-paper" : "bg-pearl text-slate"}`}>
      Demo data
    </span>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  );
}
