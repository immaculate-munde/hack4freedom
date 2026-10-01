/**
 * Home screen.
 *
 * Demo data is the default, behind PROFILE_SOURCE.
 * Set PROFILE_SOURCE=parsed to stop using the hand-written profiles.
 * This is a server-only flag so it can change without rebuilding the client.
 * `?profile=brian` shows the thin demo profile. It is ignored in parsed mode.
 */
import {
  demoProfiles,
  PAST_PERFORMANCE_DISCLAIMER,
  profileSourceFromEnv,
  selectProfile,
  type FinancialProfile,
} from "@pesasense/core";
import { PageFrame } from "../components/page-frame";

/** Format a whole-shilling amount the way a Kenyan reader expects. */
function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format an ISO date without shifting the calendar day. */
function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const params = await searchParams;
  const source = profileSourceFromEnv(process.env.PROFILE_SOURCE);
  const demoId = params.profile === "brian" ? "brian" : "amina";
  const persona = demoId === "brian" ? "Brian (invented)" : "Amina (invented)";
  const selection =
    source === "parsed"
      ? selectProfile({ source: "parsed", messages: [] })
      : selectProfile({ source: "demo", profile: demoProfiles[demoId] });

  if (selection.status === "not-ready") {
    return (
      <PageFrame
        title="PesaSense"
        description="Private surplus. Small Bitcoin saves."
      >
        <section className="card">
          <h2 className="font-serif text-2xl text-pine">No profile yet</h2>
          <p className="mt-3 text-sm leading-6 text-ink/80">
            Parsed mode is on, and there is no statement to read. Demo numbers are not
            shown here.
          </p>
          <p className="mt-3 text-xs leading-5 text-ink/60">{selection.reason}</p>
        </section>
      </PageFrame>
    );
  }

  return (
    <SurplusScreen
      profile={selection.profile}
      isDemo={selection.isDemo}
      persona={persona}
      demoId={demoId}
    />
  );
}

/** The surplus range for one profile. Demo runs show a badge. */
function SurplusScreen({
  profile,
  isDemo,
  persona,
  demoId,
}: {
  profile: FinancialProfile;
  isDemo: boolean;
  persona: string;
  demoId: "amina" | "brian";
}) {
  const { surplus, income, resilience, window, investmentPlan } = profile;
  const { floor, typical, ceiling } = surplus.monthlyKes;
  const span = Math.max(ceiling - floor, 1);
  // Place the typical marker between the floor and the ceiling of the range.
  const typicalPercent = Math.round(((typical - floor) / span) * 100);

  const investHref = demoId === "brian" ? "/invest?profile=brian" : "/invest";
  const showActions = !resilience.bufferFirst && surplus.monthlyKes.floor >= 10;

  const aside = (
    <>
      <section className="card text-sm">
        <p className="text-xs tracking-wide text-moss uppercase">Typical income</p>
        <p className="mt-1 text-xl font-semibold text-pine">
          {formatKes(income.monthlyKes.typical)}
        </p>
        <div className="mt-4 border-t border-sand pt-4">
          <p className="text-xs tracking-wide text-moss uppercase">Buffer</p>
          <p className="mt-1 font-semibold">
            {resilience.monthsOfExpensesCovered} months of expenses
          </p>
          <p className="mt-1 text-xs text-ink/60">
            {resilience.bufferFirst
              ? "Buffer comes first."
              : "Buffer-first guard is off for this profile."}
          </p>
        </div>
      </section>
      {showActions ? (
        <section className="card">
          <h2 className="font-serif text-lg text-pine">Next step</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Turn surplus into a small Bitcoin habit with your in-app wallet.
          </p>
          <div className="action-row mt-4">
            <a className="btn btn-primary inline-flex justify-center" href={investHref}>
              Invest
            </a>
            <a className="btn btn-secondary inline-flex justify-center" href="/wallet">
              Wallet
            </a>
            {demoId === "amina" ? (
              <a className="btn btn-secondary inline-flex justify-center" href="/chama">
                Chama
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );

  return (
    <PageFrame
      title="Surplus"
      description={
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isDemo ? (
              <span className="inline-flex rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brass uppercase">
                Demo data
              </span>
            ) : null}
            <span className="text-xs font-medium tracking-[0.16em] text-moss uppercase lg:hidden">
              On this device
            </span>
          </div>
          {isDemo
            ? `A private picture of ${persona}'s M-Pesa history, and the range they could set aside. This is a description, not a recommendation.`
            : "A private picture of this history, and the range that could be set aside. This is a description, not a recommendation."}
        </>
      }
      aside={aside}
    >
      <section className="card">
        <h2 className="font-serif text-2xl text-pine">Safe surplus</h2>
        <p className="mt-1 text-sm text-ink/70">
          {formatDay(window.from)} – {formatDay(window.to)} · M-Pesa ·{" "}
          {window.monthsCovered} months
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs tracking-wide text-moss uppercase">Floor</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">{formatKes(floor)}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-brass uppercase">Typical</dt>
            <dd className="mt-1 text-lg font-semibold text-pine">
              {formatKes(typical)}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-moss uppercase">Ceiling</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatKes(ceiling)}
            </dd>
          </div>
        </dl>

        <div className="mt-6" aria-hidden="true">
          <div className="relative h-2 rounded-full bg-sand">
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-pine/80" />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brass"
              style={{ left: `${typicalPercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink/50">
            <span>Worst typical month</span>
            <span>Best typical month</span>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-ink/80">
          {resilience.bufferFirst
            ? "This history is not ready for a Bitcoin habit. The buffer comes first."
            : `The floor is the tightest month in this history, ${formatKes(floor)}. A scheduled buy stays under that number${
                investmentPlan
                  ? `, so the draft habit is ${formatKes(investmentPlan.amountKes)} a ${investmentPlan.cadence}`
                  : ""
              }.`}
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 text-sm lg:hidden">
        <div className="stat-tile">
          <p className="text-xs tracking-wide text-moss uppercase">Typical income</p>
          <p className="mt-1 font-semibold">{formatKes(income.monthlyKes.typical)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs tracking-wide text-moss uppercase">Buffer</p>
          <p className="mt-1 font-semibold">
            {resilience.monthsOfExpensesCovered} months
          </p>
        </div>
      </section>

      {showActions ? (
        <div className="action-row mt-6 lg:hidden">
          <a className="btn btn-primary inline-flex justify-center" href={investHref}>
            Invest from surplus
          </a>
          <a className="btn btn-secondary inline-flex justify-center" href="/wallet">
            PesaSense wallet
          </a>
          {demoId === "amina" ? (
            <a className="btn btn-secondary inline-flex justify-center" href="/chama">
              Chama
            </a>
          ) : null}
        </div>
      ) : null}

      {isDemo ? (
        <p className="mt-6 text-sm text-moss">
          {demoId === "brian" ? (
            <a className="underline" href="/">
              View Amina&apos;s surplus
            </a>
          ) : (
            <a className="underline" href="/?profile=brian">
              View the thin profile
            </a>
          )}
        </p>
      ) : null}

      <p className="mt-8 text-xs leading-5 text-ink/60">
        {PAST_PERFORMANCE_DISCLAIMER}
      </p>
    </PageFrame>
  );
}
