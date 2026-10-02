"use client";

import { Suspense } from "react";

import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER, demoProfiles } from "@pesasense/core";
import { formatKes, habitPercentOfFloor } from "../../lib/format";
import { useProfile } from "../../contexts/profile-context";
import { useSearchParams } from "next/navigation";

function HabitContent() {
  const searchParams = useSearchParams();
  const profileQuery = searchParams?.get("profile");
  const { profile: contextProfile, isDemo: contextIsDemo } = useProfile();

  const demoId = profileQuery === "brian" ? "brian" : "amina";
  const profile = contextProfile || demoProfiles[demoId];
  const isDemo = contextProfile ? false : contextIsDemo;

  const floor = profile.surplus.monthlyKes.floor;
  const habit = Math.round(floor * 0.75);
  const cadence = profile.investmentPlan?.cadence ?? "monthly";
  const share = habitPercentOfFloor(habit, floor);
  const width = Math.max(0, Math.min(100, share));

  const monthly = cadence !== "weekly";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
          Patient habit
        </p>
        <h1 className="mt-1 text-[28px] leading-9 font-bold tracking-tight text-ink">
          Steady long-term habit
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate">
          A small pot from your monthly safe surplus. Bitcoin is one option, not the
          only one.
        </p>
        {isDemo ? (
          <p className="mt-2 text-[11px] font-semibold text-slate">Demo data</p>
        ) : null}
      </header>

      <section className="flex items-start gap-3 rounded-[20px] bg-mint px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teal">
          <LeafIcon />
        </span>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Sensi&apos;s note</p>
            <p className="text-[11px] font-semibold tracking-wide text-teal uppercase">
              Mindset
            </p>
          </div>
          <p className="mt-1 text-sm leading-5 text-ink">
            “A patient pot for 3 to 5 years. You approve each purchase.”
          </p>
        </div>
      </section>

      <section className="rounded-[20px] bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
            Allocated target
          </p>
          <div className="flex rounded-full bg-pearl p-1 text-xs font-semibold">
            <span
              className={`rounded-full px-3 py-1 ${monthly ? "text-slate" : "bg-white text-teal shadow-card"}`}
            >
              Weekly
            </span>
            <span
              className={`rounded-full px-3 py-1 ${monthly ? "bg-white text-teal shadow-card" : "text-slate"}`}
            >
              Monthly
            </span>
          </div>
        </div>
        <p className="mt-3 text-[32px] leading-10 font-bold text-ink tabular-nums">
          {formatKes(habit)}{" "}
          <span className="text-base font-semibold text-slate">/ {cadence}</span>
        </p>
        <p className="mt-1 text-sm text-slate">
          <span className="mr-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold">
            Demo
          </span>
          Sats appear when there is a quote. Goes straight to your own wallet.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="font-semibold text-ink">{share}% of your safe floor</p>
          <p className="text-slate tabular-nums">{formatKes(floor)} floor</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-pearl" aria-hidden="true">
          <div className="h-2 rounded-full bg-teal" style={{ width: `${width}%` }} />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate">
          We&apos;ll remind you on the 1st. You approve each purchase.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">Resilience ladder</h2>
          <p className="text-xs font-semibold text-slate">3 tiers</p>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-white shadow-card">
          <Ladder
            n="1"
            title="Cash cushion"
            state="Liquid"
            body="Money you may need soon. Watch out for treating it as spare cash."
            current={false}
          />
          <Ladder
            n="2"
            title="Everyday saving"
            state="1–2 yrs"
            body="M-Shwari, Ziidi, a money market fund, or a SACCO. Watch the fees and the lock-up."
            current={false}
          />
          <Ladder
            n="3"
            title="Bitcoin steady pot"
            state="Current habit"
            body="Good for 3 to 5 years or more. The value goes up and down, and you can lose money."
            current
          />
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 rounded-full bg-pearl px-4 py-2 text-center text-xs font-semibold text-slate">
        Keys stay on your device · Backup is coming soon
      </p>

      <Link href="/invest" className="btn btn-primary inline-flex items-center justify-center">
        Review my first purchase
      </Link>
      <p className="text-center text-sm text-slate">
        You can skip a month. Nothing moves until you approve it.
      </p>
      <p className="text-xs leading-5 text-slate">{PAST_PERFORMANCE_DISCLAIMER}</p>
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
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <div className="animate-pulse h-6 w-32 rounded-full bg-pearl" />
          <div className="animate-pulse h-10 w-64 rounded-full bg-pearl" />
          <div className="card animate-pulse h-40 bg-pearl" />
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
