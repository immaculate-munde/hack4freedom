/**
 * Steady habit.
 * Monthly is the default. The amount is capped by the surplus floor.
 * The app reminds. It does not move money by itself.
 */
import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { formatKes, habitPercentOfFloor } from "../../lib/format";
import { loadProfile } from "../../lib/load-profile";

export default async function HabitPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const params = await searchParams;
  const loaded = loadProfile(params.profile);
  if (loaded.status === "not-ready") {
    return (
      <main className="card">
        <h1 className="text-2xl font-semibold">No profile yet</h1>
        <p className="mt-3 text-sm text-slate">{loaded.reason}</p>
      </main>
    );
  }

  const { profile, isDemo } = loaded;
  const floor = profile.surplus.monthlyKes.floor;
  const habit = profile.investmentPlan?.amountKes ?? 0;
  const cadence = profile.investmentPlan?.cadence ?? "monthly";
  const share = habitPercentOfFloor(habit, floor);
  const width = Math.max(0, Math.min(100, share));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <p className="text-xs font-semibold tracking-wide text-teal uppercase">
        Patient habit
      </p>
      <h1 className="text-3xl font-bold text-ink">Steady long-term habit</h1>
      <p className="text-sm leading-6 text-slate">
        Bitcoin is one option, not the only one. Save only what you will not need soon.
      </p>
      {isDemo ? <p className="text-xs font-semibold text-slate">Demo data</p> : null}

      <section className="card">
        <p className="text-xs font-semibold tracking-wide text-slate uppercase">
          Allocated target
        </p>
        <p className="mt-2 text-sm font-semibold text-teal">
          {cadence === "weekly" ? "Weekly" : "Monthly"}
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {formatKes(habit)}{" "}
          <span className="text-base font-semibold text-slate">/ {cadence}</span>
        </p>
        <p className="mt-2 text-sm text-slate">
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold">
            Demo
          </span>{" "}
          Sats appear when there is a quote. Goes straight to your own wallet.
        </p>
        <p className="mt-4 text-sm font-semibold">
          {formatKes(habit)} is {share}% of your safe floor ({formatKes(floor)}).
        </p>
        <div className="mt-2 h-2 rounded-full bg-pearl" aria-hidden="true">
          <div className="h-2 rounded-full bg-teal" style={{ width: `${width}%` }} />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink">
          We&apos;ll remind you on the 1st. You approve each purchase.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ladder</h2>
        <Ladder
          n="1"
          title="Safety cushion"
          state="First"
          body="Good for money you may need soon. Watch out for treating it as spare cash."
        />
        <Ladder
          n="2"
          title="Everyday saving"
          state="Alongside"
          body="M-Shwari, Ziidi, a money market fund, or a SACCO. Good for the next few years. Watch the fees and the lock-up."
        />
        <Ladder
          n="3"
          title="Bitcoin steady pot"
          state="One option"
          body="Good for 3 to 5 years or more. Watch out: the value goes up and down, and you can lose money."
        />
      </section>

      <p className="rounded-card border border-line px-4 py-3 text-sm">
        Keys stay on your device. Backup is coming soon.
      </p>
      <Link href="/invest" className="btn btn-primary inline-flex justify-center">
        Review my first purchase
      </Link>
      <Link href="/invest" className="text-center text-sm font-semibold text-teal">
        See the invest flow
      </Link>
      <p className="text-xs leading-5 text-slate">{PAST_PERFORMANCE_DISCLAIMER}</p>
    </main>
  );
}

function Ladder({
  n,
  title,
  state,
  body,
}: {
  n: string;
  title: string;
  state: string;
  body: string;
}) {
  return (
    <article className="card">
      <p className="text-xs font-semibold text-teal">
        {n}. {state}
      </p>
      <h3 className="mt-1 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate">{body}</p>
    </article>
  );
}
