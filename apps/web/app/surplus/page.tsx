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
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">M-Pesa analysis</h1>
        <p className="text-xs font-semibold text-teal">
          {profile.window.monthsCovered} mo.
        </p>
      </div>
      {isDemo ? (
        <p className="text-xs font-semibold text-slate">
          <span className="rounded-full border border-line px-2 py-0.5">Demo data</span>
        </p>
      ) : null}
      <p className="rounded-card border border-line bg-pearl px-4 py-3 text-sm text-ink">
        Read on your phone. Your statements never leave it.
      </p>

      <section className="card">
        <p className="text-xs font-semibold tracking-wide text-slate uppercase">
          Stress-tested cushion
        </p>
        <p className="mt-2 text-xl font-bold text-ink">Safe surplus range</p>
        <p className="mt-1 text-sm text-slate">Typical monthly {formatKes(typical)}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-slate">Floor</dt>
            <dd className="font-semibold tabular-nums">{formatKes(floor)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Typical</dt>
            <dd className="font-semibold tabular-nums text-teal">
              {formatKes(typical)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate">High</dt>
            <dd className="font-semibold tabular-nums">{formatKes(ceiling)}</dd>
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
          <h2 className="text-lg font-semibold">Monthly commitments</h2>
          <p className="text-sm font-semibold tabular-nums">{formatKes(total)}</p>
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={`${row.label}-${row.detail}`}
              className="card flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold">{row.label}</p>
                <p className="text-xs text-slate">{row.detail}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatKes(row.amount)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/onboard" className="btn btn-primary inline-flex justify-center">
        Import M-Pesa statement
      </Link>
      <Link href="/onboard" className="text-center text-sm font-semibold text-slate">
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
