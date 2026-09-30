/**
 * Home screen.
 * Loads the synthetic profile and shows the safe surplus as a range.
 * The floor is the worst typical month. A habit has to stay under it.
 */
import { demoProfile, PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";

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

export default function HomePage() {
  const { surplus, income, resilience, window, investmentPlan } = demoProfile;
  const { floor, typical, ceiling } = surplus.monthlyKes;
  const span = Math.max(ceiling - floor, 1);
  // Place the typical marker between the floor and the ceiling of the range.
  const typicalPercent = Math.round(((typical - floor) / span) * 100);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:px-8">
      <p className="text-xs font-medium tracking-[0.16em] text-moss uppercase">
        Synthetic demo · on this device
      </p>
      <h1 className="mt-3 font-serif text-5xl tracking-tight text-pine">STAK</h1>
      <p className="mt-2 font-serif text-xl text-ink/80">
        Start Tiny, Accumulate Kesho
      </p>
      <p className="mt-4 max-w-md text-sm leading-6 text-ink/70">
        A private picture of Amina&apos;s invented M-Pesa history, and the range she
        could set aside. This is a description, not a recommendation.
      </p>

      <section className="mt-8 rounded-3xl border border-sand bg-white/70 p-6 shadow-sm">
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
          The floor is the tightest month in this history, {formatKes(floor)}. A
          scheduled buy stays under that number
          {investmentPlan
            ? `, so the draft habit is ${formatKes(investmentPlan.amountKes)} a ${investmentPlan.cadence.replace("_", " ")}`
            : ""}
          .
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-sand/80 px-4 py-3">
          <p className="text-xs tracking-wide text-moss uppercase">Typical income</p>
          <p className="mt-1 font-semibold">{formatKes(income.monthlyKes.typical)}</p>
        </div>
        <div className="rounded-2xl bg-sand/80 px-4 py-3">
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

      <p className="mt-8 text-xs leading-5 text-ink/60">
        {PAST_PERFORMANCE_DISCLAIMER}
      </p>
    </main>
  );
}
