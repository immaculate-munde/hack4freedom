"use client";

import { Suspense } from "react";

import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER, type FinancialProfile } from "@pesasense/core";
import { ProfileRequired } from "../../components/profile-required";
import { ProfileSync } from "../../components/profile-sync";
import { SensiAvatar } from "../../components/sensi-avatar";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { formatKes, habitPercentOfFloor } from "../../lib/format";
import { ImportTrigger } from "../../components/import-trigger";
import { appInvestAllowance, showBufferFirstUx } from "../../lib/buffer-gate";
import { LifeMarkers } from "../../components/life-markers";
import { MoneyMap } from "../../components/money-map";
import { habitOffer } from "../../lib/habit-plan";
import { useHabitReminder } from "../../lib/habit-reminder";
import { useActiveProfile } from "../../lib/use-active-profile";

const TRUST_ICONS: Record<string, string> = {
  key: "🔑",
  chart: "📊",
  phone: "📱",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

/** Calendar date from a profile window. Returns null when the field is not a real date. */
function formatWindowDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthName = MONTHS[month - 1];
  if (!monthName || day < 1 || day > 31) return null;
  return `${day} ${monthName} ${year}`;
}

function statementPeriod(profile: FinancialProfile, isDemo: boolean): string {
  const from = formatWindowDate(profile.window.from);
  const to = formatWindowDate(profile.window.to);
  if (from && to) return `${from} – ${to}`;
  if (isDemo) return "Demo statement";
  return "From the statement on this phone";
}

function OverviewContent() {
  const active = useActiveProfile();
  const reminder = useHabitReminder();
  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, profileId, isDemo, displayName: name } = active;
  const persona = isDemo ? `${name} (invented demo)` : "Your profile on this phone";

  const { floor, typical } = profile.surplus.monthlyKes;
  const habit = profile.investmentPlan?.amountKes ?? 0;
  const cadence = profile.investmentPlan?.cadence === "weekly" ? "week" : "month";
  const share = habitPercentOfFloor(habit, floor);

  const query = isDemo && profileId === "brian" ? "?profile=brian" : "";
  const cushionMonths = profile.resilience.monthsOfExpensesCovered;
  const bufferFirst = showBufferFirstUx(profile) || floor <= 0;
  const hasPlan = (profile.investmentPlan?.amountKes ?? 0) > 0;
  const allowance = appInvestAllowance(profile);
  const offer = habitOffer(profile);
  const period = statementPeriod(profile, isDemo);

  const reading = bufferFirst
    ? `The buffer comes first. ${cushionMonths} months of expenses are covered, and the aim is 3. This history is not ready for a Bitcoin habit yet. Nothing is sent from this screen.`
    : hasPlan
      ? `The safe floor, ${formatKes(floor)}, is what is left after the regular bills. Your habit is ${formatKes(habit)} a ${cadence}, ${share}% of that floor, not of the typical surplus (${formatKes(typical)}). Bitcoin can lose value. We'll remind you on the 1st. You approve each purchase. It goes to your own wallet. Nothing is sent from this screen.`
      : `The safe floor, ${formatKes(floor)}, is what is left after the regular bills. No habit is saved yet. You can set one within that floor. Bitcoin can lose value. You approve each purchase. Nothing is sent from this screen.`;

  return (
    <main className="flex w-full flex-col gap-4">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
          Statement period
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">{period}</p>
        {isDemo ? (
          <p className="mt-2">
            <DemoTag />
          </p>
        ) : null}
      </header>

      <section className="flex items-center gap-3 rounded-[20px] border border-mint/40 bg-mint/35 px-4 py-3 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint">
          <SensiAvatar size="sm" mood="happy" />
        </span>
        <p className="text-sm leading-5 text-ink">
          <span className="font-semibold">Habari {name} 👋</span>{" "}
          {bufferFirst
            ? "The buffer comes first. This history is not ready for a Bitcoin habit yet."
            : "Here is the picture from this statement, then what a habit would mean."}
        </p>
      </section>

      <MoneyMap profile={profile} isDemo={isDemo} />

      <LifeMarkers profile={profile} isDemo={isDemo} />

      <section className="rounded-[20px] bg-white p-5 shadow-card">
        <h2 className="text-base font-semibold text-ink">How to read this</h2>
        <p className="mt-2 text-sm leading-6 text-ink">{reading}</p>
        {reminder ? (
          <p className="mt-3 text-sm leading-6 text-slate">
            We&apos;ll remind you on the 1st. You approve each purchase.
          </p>
        ) : null}
      </section>

      {allowance.ok && hasPlan ? (
        <div className="flex flex-col gap-2">
          <Link href="/invest" className="btn btn-accent inline-flex w-full justify-center">
            Review an investment
          </Link>
          <p className="text-center text-sm text-slate">
            You review it on the next screen. Nothing is sent until you approve it.
          </p>
        </div>
      ) : offer.ok && !hasPlan ? (
        <div className="flex flex-col gap-2">
          <Link href={`/habit${query}`} className="btn btn-accent inline-flex w-full justify-center">
            Set the habit
          </Link>
          <p className="text-center text-sm text-slate">
            Save the amount first. A review comes after that. Nothing is sent from here.
          </p>
        </div>
      ) : bufferFirst ? (
        <Link href={`/habit${query}`} className="btn btn-accent inline-flex w-full justify-center">
          Here&apos;s how
        </Link>
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
