/**
 * Safe surplus.
 * Rows come from the profile. The total is the sum of those rows, not a figure from the mockup.
 */
import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { formatKes } from "../../lib/format";
import { loadProfile } from "../../lib/load-profile";

export default async function SurplusPage({
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

  const { profile, isDemo, demoId } = loaded;
  const { floor, typical, ceiling } = profile.surplus.monthlyKes;
  const habit = profile.investmentPlan;
  const rows = [
    ...profile.commitments.map((item) => ({
      label: item.label,
      detail: `${item.category} · seen ${item.observations} times`,
      amount: item.amountKes,
    })),
    ...profile.spending.byCategory.map((item) => ({
      label: item.category,
      detail: "Flexible spending, typical month",
      amount: item.monthlyKes.typical,
    })),
  ];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const query = demoId === "brian" ? "?profile=brian" : "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">M-Pesa analysis</h1>
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
      <p className="flex items-center gap-2 rounded-[18px] bg-mint px-4 py-3 text-sm text-ink">
        <span className="text-teal" aria-hidden="true">
          ●
        </span>
        Your statements never leave your phone. Backups are encrypted with your key.
      </p>

      <section className="rounded-[20px] bg-white p-5 shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
          Stress-tested cushion
        </p>
        <p className="mt-1 text-xl font-bold text-ink">Safe surplus range</p>
        <p className="mt-1 text-sm text-slate">Typical monthly {formatKes(typical)}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-pearl px-2 py-3 text-center">
            <dt className="text-[11px] font-semibold text-slate">Floor</dt>
            <dd className="mt-1 text-sm font-bold text-ink tabular-nums">
              {formatKes(floor)}
            </dd>
          </div>
          <div className="rounded-2xl bg-mint px-2 py-3 text-center">
            <dt className="text-[11px] font-semibold text-teal">Typical</dt>
            <dd className="mt-1 text-sm font-bold text-teal tabular-nums">
              {formatKes(typical)}
            </dd>
          </div>
          <div className="rounded-2xl bg-pearl px-2 py-3 text-center">
            <dt className="text-[11px] font-semibold text-slate">High</dt>
            <dd className="mt-1 text-sm font-bold text-ink tabular-nums">
              {formatKes(ceiling)}
            </dd>
          </div>
        </dl>
        {habit ? (
          <p className="mt-4 text-sm text-ink">
            Recommended habit {formatKes(habit.amountKes)} / {habit.cadence}, within the
            safe floor.
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink">No habit yet. The buffer comes first.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">Monthly commitments</h2>
          <p className="text-sm font-bold text-ink tabular-nums">{formatKes(total)}</p>
        </div>
        <ul className="overflow-hidden rounded-[20px] bg-white shadow-card">
          {rows.map((row) => (
            <li
              key={`${row.label}-${row.detail}`}
              className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 first:border-t-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-xs font-semibold text-teal">
                  {row.label.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{row.label}</p>
                  <p className="text-xs text-slate">{row.detail}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                {formatKes(row.amount)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/import" className="btn btn-primary inline-flex justify-center">
        Import M-Pesa statement
      </Link>
      <Link href="/import" className="text-center text-sm font-semibold text-slate">
        Paste messages instead
      </Link>
      {isDemo ? (
        <p className="text-sm">
          {demoId === "brian" ? (
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
