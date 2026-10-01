/**
 * Overview.
 * The dashboard from the Serene Shilling screens. Amounts come from the profile.
 * Sats are not shown as a number until a real quote exists.
 */
import Link from "next/link";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { ProfileSync } from "../../components/profile-sync";
import { Sensi } from "../../components/sensi";
import { WalletActivity } from "../../components/wallet-activity";
import { formatKes, habitPercentOfFloor } from "../../lib/format";
import { loadProfile } from "../../lib/load-profile";
import { ImportTrigger } from "../../components/import-trigger";

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-4">
      <section className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint">
          <Sensi className="h-9 w-9" />
        </span>
        <p className="text-sm leading-5 text-ink">
          <span className="font-semibold">Habari {name}.</span>{" "}
          {profile.surplus.bufferFirst
            ? "The buffer comes first. This history is not ready for a Bitcoin habit yet."
            : "Everything essential is covered this month."}
        </p>
      </section>

      <section className="rounded-[20px] bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
            Safe monthly surplus
          </p>
          {isDemo ? <DemoTag /> : null}
        </div>
        <p className="mt-3 text-[32px] leading-10 font-bold tracking-tight text-ink tabular-nums">
          {formatKes(floor)} – {formatKes(ceiling)}
        </p>
        <p className="mt-1 text-sm text-slate">
          Calm surplus after bills, chamas, and daily life.
        </p>
        <div className="mt-5" aria-hidden="true">
          <div className="relative h-1.5 rounded-full bg-pearl">
            <div className="absolute inset-y-0 right-0 left-[8%] rounded-full bg-teal/70" />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal ring-4 ring-white"
              style={{ left: `${typicalPercent}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate">
            <span>Conservative</span>
            <span className="rounded-full bg-mint px-2 py-1 text-teal">
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

      {profile.surplus.bufferFirst ? (
        <section className="rounded-[20px] bg-white p-5 shadow-card">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
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
          <Link href={`/habit${query}`} className="btn btn-secondary mt-4 inline-flex">
            Here&apos;s how
          </Link>
        </section>
      ) : (
        <section className="rounded-[20px] bg-white p-5 shadow-card">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
            Your habit
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-[28px] leading-9 font-bold text-ink tabular-nums">
              {formatKes(habit)}{" "}
              <span className="text-base font-semibold text-slate">/ month</span>
            </p>
            <Link href={`/habit${query}`} className="btn btn-secondary px-4 py-2">
              Adjust
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate">
            <span className="mr-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold">
              Demo
            </span>
            Sats appear when there is a quote. {share}% of the safe floor.
          </p>
        </section>
      )}

      <section className="grid grid-cols-3 gap-1 rounded-[20px] bg-pearl px-2 py-4 text-center">
        <TrustChip label="Never hold keys" icon="key" />
        <TrustChip label="Never push trading" icon="chart" />
        <TrustChip label="Never leaves phone" icon="phone" />
      </section>

      {isDemo ? <WalletActivity profileId={demoId} /> : null}
      {isDemo ? <ProfileSync profile={profile} profileId={demoId} /> : null}

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
            {demoId === "brian" ? (
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

function DemoTag() {
  return (
    <span className="rounded-full bg-pearl px-2.5 py-1 text-[11px] font-semibold text-slate">
      Demo data
    </span>
  );
}

function TrustChip({ label, icon }: { label: string; icon: "key" | "chart" | "phone" }) {
  return (
    <p className="flex flex-col items-center gap-1.5 px-1 text-[11px] leading-4 font-semibold text-slate">
      <ChipIcon name={icon} />
      {label}
    </p>
  );
}

function ChipIcon({ name }: { name: "key" | "chart" | "phone" }) {
  const common = "h-4 w-4 fill-none stroke-teal";
  if (name === "key") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <circle cx="8" cy="14" r="3.2" />
        <path strokeLinecap="round" d="M11 14h9l-2 2M17 14v2" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
        <path strokeLinecap="round" d="M4 18h16M7 15V9M12 15V6M17 15v-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} strokeWidth="1.75">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path strokeLinecap="round" d="M11 18h2" />
    </svg>
  );
}
