/**
 * Overview.
 * The dashboard from the Serene Shilling screens. Amounts come from the profile.
 * Sats are not shown as a number until a real quote exists.
 */
import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { ProfileSync } from "../../components/profile-sync";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { formatKes, habitPercentOfFloor } from "../../lib/format";
import { loadProfile } from "../../lib/load-profile";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const params = await searchParams;
  const loaded = loadProfile(params.profile);
  if (loaded.status === "not-ready") {
    return (
      <main className="card">
        <h1 className="text-2xl font-semibold text-ink">No profile yet</h1>
        <p className="mt-3 text-sm leading-6 text-slate">{loaded.reason}</p>
      </main>
    );
  }

  const { profile, isDemo, demoId, persona } = loaded;
  const name = demoId === "brian" ? "Brian" : "Amina";
  const { floor, typical, ceiling } = profile.surplus.monthlyKes;
  const habit = profile.investmentPlan?.amountKes ?? 0;
  const share = habitPercentOfFloor(habit, floor);
  const span = Math.max(ceiling - floor, 1);
  const typicalPercent = Math.round(((typical - floor) / span) * 100);
  const query = demoId === "brian" ? "?profile=brian" : "";
  const cushionMonths = profile.resilience.monthsOfExpensesCovered;
  const cushionPercent = Math.max(
    0,
    Math.min(100, Math.round((cushionMonths / 3) * 100)),
  );

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <section className="card flex items-start gap-3">
        <p className="text-sm leading-6 text-ink">
          {profile.surplus.bufferFirst
            ? `Habari ${name}. The buffer comes first. This history is not ready for a Bitcoin habit yet.`
            : `Habari ${name}. Everything essential is covered this month.`}
        </p>
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            Safe monthly surplus
          </p>
          {isDemo ? <DemoTag /> : null}
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums text-ink">
          {formatKes(floor)} – {formatKes(ceiling)}
        </p>
        <p className="mt-2 text-sm text-slate">
          Calm surplus after bills and daily life. Typical {formatKes(typical)}.
        </p>
        <div className="mt-4" aria-hidden="true">
          <div className="relative h-2 rounded-full bg-pearl">
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-teal/70" />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal"
              style={{ left: `${typicalPercent}%` }}
            />
          </div>
        </div>
        <p className="sr-only">
          Floor {formatKes(floor)}, typical {formatKes(typical)}, high{" "}
          {formatKes(ceiling)}.
        </p>
      </section>

      {profile.surplus.bufferFirst ? (
        <section className="card">
          <p className="text-sm font-semibold text-ink">Safety cushion</p>
          <p className="mt-2 text-sm leading-6 text-slate">
            {cushionMonths} months of expenses covered. The aim is 3 months.
          </p>
          <div className="mt-3 h-2 rounded-full bg-pearl" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-teal"
              style={{ width: `${cushionPercent}%` }}
            />
          </div>
          <Link href={`/habit${query}`} className="btn btn-secondary mt-4 inline-flex">
            Here&apos;s how
          </Link>
        </section>
      ) : (
        <section className="card">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            Your habit
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
            {formatKes(habit)}{" "}
            <span className="text-base font-semibold text-slate">/ month</span>
          </p>
          <p className="mt-1 text-sm text-slate">
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold">
              Demo
            </span>{" "}
            Sats appear when there is a quote. {share}% of the safe floor.
          </p>
          <Link href={`/habit${query}`} className="btn btn-secondary mt-4 inline-flex">
            Adjust
          </Link>
        </section>
      )}

      <section className="grid grid-cols-3 gap-2 rounded-card border border-line bg-pearl px-2 py-3 text-center text-[11px] font-semibold text-slate">
        <p>Never hold keys</p>
        <p>Never push trading</p>
        <p>Never leaves phone</p>
      </section>

      <nav className="grid grid-cols-2 gap-3 text-sm font-semibold" aria-label="More">
        <Link className="card" href={`/surplus${query}`}>
          Surplus
        </Link>
        <Link className="card" href={`/habit${query}`}>
          Habit
        </Link>
        <Link className="card" href="/learn">
          Learn
        </Link>
        <Link
          className="card"
          href={demoId === "brian" ? "/invest?profile=brian" : "/invest"}
        >
          Invest
        </Link>
        <Link className="card" href="/wallet">
          Wallet
        </Link>
        <Link className="card" href="/chama">
          Chama
        </Link>
      </nav>

      {isDemo ? <WalletActivity profileId={demoId} /> : null}
      {isDemo ? <UssdAccess profileId={demoId} /> : null}
      {isDemo ? <ProfileSync profile={profile} profileId={demoId} /> : null}

      {isDemo ? (
        <p className="text-sm text-teal">
          {demoId === "brian" ? (
            <Link href="/overview">View Amina</Link>
          ) : (
            <Link href="/overview?profile=brian">View the thin profile</Link>
          )}
        </p>
      ) : null}

      <p className="text-xs leading-5 text-slate">
        {persona}. {PAST_PERFORMANCE_DISCLAIMER}
      </p>
    </main>
  );
}

function DemoTag() {
  return (
    <span className="rounded-full border border-line bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate">
      Demo data
    </span>
  );
}
