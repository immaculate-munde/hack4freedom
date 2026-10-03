/**
 * Short regulatory notice.
 *
 * Product stance is stated plainly. The licensing sentence is team research
 * and is marked to verify. This is not a finished legal opinion.
 *
 * // to verify: CBK licenses custodial wallets, payment processing, and
 * fiat-to-crypto rails. CMA oversees exchanges, brokers, and investment
 * managers. Confirm this wording before anyone treats it as legal advice.
 */

/** Small information mark for the notice. */
function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-0.5 h-4 w-4 shrink-0 text-ink/70"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const LINES = [
  "This is education, not financial advice.",
  "We never hold your funds, your keys, or your M-Pesa balance.",
  "PesaSense is not a licensed exchange or investment adviser. That status is still to be confirmed.",
] as const;

/** The trust-screen notice. Card on the trust page, plain rows in a footer. */
export function RegulatoryDisclosure({ variant = "card" }: { variant?: "card" | "footer" }) {
  const body = (
    <>
      <div className="flex items-start gap-2">
        {variant === "card" ? <InfoIcon /> : null}
        <div>
          <p
            className={
              variant === "footer"
                ? "text-[11px] font-semibold tracking-[0.14em] text-slate uppercase"
                : "text-sm font-semibold text-ink"
            }
          >
            The honest picture
          </p>
          <p className="mt-1 text-xs leading-5 text-slate">As of 1 October 2026. Status to be confirmed.</p>
        </div>
      </div>
      <ul className={variant === "footer" ? "mt-5 grid gap-4 md:grid-cols-3" : "mt-4 space-y-3"}>
        {LINES.map((line) => (
          <li key={line} className="text-sm leading-6 text-ink">
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-5 text-slate">
        The on-ramp partner&apos;s licence status is to be confirmed. We do not call a partner licensed until
        that is checked.
      </p>
    </>
  );

  if (variant === "footer") {
    return (
      <div aria-label="Regulatory notice" className="contents">
        {body}
      </div>
    );
  }

  return (
    <aside aria-label="Regulatory notice" className="card">
      {body}
    </aside>
  );
}
