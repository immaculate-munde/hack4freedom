"use client";

import Link from "next/link";
import { Suspense } from "react";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { AnimatedNumber } from "../../components/animated-number";
import { ProfileRequired } from "../../components/profile-required";
import { formatKes } from "../../lib/format";
import { SensiAvatar } from "../../components/sensi-avatar";
import { useActiveProfile } from "../../lib/use-active-profile";

function getCategoryColor(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("rent") || c.includes("housing")) return "var(--color-sky)";
  if (c.includes("loan") || c.includes("debt")) return "var(--color-terracotta)";
  if (c.includes("utilit")) return "var(--color-sunflower)";
  if (c.includes("chama")) return "var(--color-lavender)";
  if (c.includes("grocer")) return "var(--color-mint)";
  return "var(--color-sand)";
}

function SurplusContent() {
  const active = useActiveProfile();
  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, profileId, isDemo } = active;
  const { floor, typical, ceiling } = profile.surplus.monthlyKes;
  const habit = profile.investmentPlan;
  const rows = [
    ...profile.commitments.map((item) => ({
      label: item.label,
      category: item.category,
      detail: `${item.category} · seen ${item.observations} times`,
      amount: item.amountKes,
    })),
    ...profile.spending.byCategory.map((item) => ({
      label: item.category,
      category: item.category,
      detail: "Flexible spending, typical month",
      amount: item.monthlyKes.typical,
    })),
  ];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const query = isDemo && profileId === "brian" ? "?profile=brian" : "";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">Your money story</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">M-Pesa analysis</h1>
          <p className="mt-1 text-sm text-slate">Read on this phone.</p>
        </div>
        <p className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-teal">
          {profile.window.monthsCovered} mo. actuals
        </p>
      </div>
      {isDemo ? (
        <p className="text-xs font-semibold text-slate">
          <span className="rounded-full bg-pearl px-2.5 py-1">Demo data</span>
        </p>
      ) : null}
      <p className="flex items-center gap-2 rounded-[18px] border border-mint/60 bg-mint/20 px-4 py-3 text-sm text-ink">
        <span className="text-teal" aria-hidden="true">
          ●
        </span>
        Your statements never leave your phone. Backups are encrypted with your key.
      </p>

      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        <section className="w-full rounded-[20px] bg-gradient-to-br from-pine to-moss p-5 text-paper shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-brass uppercase">
            Stress-tested cushion
          </p>
          <p className="mt-1 text-xl font-bold text-paper">Safe surplus range</p>
          <p className="mt-1 text-sm text-paper/80">Typical monthly {formatKes(typical)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-mint/20 px-2 py-3 text-center">
              <dt className="text-[11px] font-semibold text-paper/80">Floor</dt>
              <dd className="mt-1 text-sm font-bold text-paper tabular-nums">
                <AnimatedNumber value={floor} />
              </dd>
            </div>
            <div className="rounded-2xl border border-brass/70 bg-sunflower/20 px-2 py-3 text-center">
              <dt className="text-[11px] font-semibold text-brass">Typical</dt>
              <dd className="mt-1 text-sm font-bold text-brass tabular-nums">
                <AnimatedNumber value={typical} />
              </dd>
            </div>
            <div className="rounded-2xl bg-sky/20 px-2 py-3 text-center">
              <dt className="text-[11px] font-semibold text-paper/80">High</dt>
              <dd className="mt-1 text-sm font-bold text-paper tabular-nums">
                <AnimatedNumber value={ceiling} />
              </dd>
            </div>
          </dl>
          {habit ? (
            <p className="mt-4 text-sm text-paper/90">
              Recommended habit {formatKes(habit.amountKes)} / {habit.cadence}, within the
              safe floor.
            </p>
          ) : (
            <p className="mt-4 text-sm text-paper/90">No habit yet. The buffer comes first.</p>
          )}
        </section>

        <section className="w-full">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <SensiAvatar size="sm" mood="thinking" />
              Monthly commitments
            </h2>
            <p className="text-sm font-bold text-ink tabular-nums">{formatKes(total)}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={`${row.label}-${row.detail}`}
                className="card w-full flex items-center justify-between gap-3 border-l-[3px] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderLeftColor: getCategoryColor(row.category) }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-pine"
                    style={{ backgroundColor: getCategoryColor(row.category) }}
                  >
                    {row.label.slice(0, 1)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: getCategoryColor(row.category) }}>{row.label}</p>
                    <p className="truncate text-xs text-slate">{row.detail}</p>
                  </div>
                </div>
                <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-ink tabular-nums">
                  {formatKes(row.amount)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Link href="/onboard" className="btn btn-accent inline-flex justify-center">
        Import M-Pesa statement
      </Link>
      <Link href="/onboard" className="text-center text-sm font-semibold text-slate">
        Paste messages instead
      </Link>
      {isDemo ? (
        <p className="text-sm">
          {profileId === "brian" ? (
            <Link href="/surplus">View Amina</Link>
          ) : (
            <Link href={`/surplus${query === "" ? "?profile=brian" : query}`}>
              View the thin profile
            </Link>
          )}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-slate">{PAST_PERFORMANCE_DISCLAIMER}</p>
    </main>
  );
}

export default function SurplusPage() {
  return (
    <Suspense>
      <SurplusContent />
    </Suspense>
  );
}
