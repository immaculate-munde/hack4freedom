/**
 * RegulatoryDisclosure
 *
 * Static, non-dismissible regulatory transparency notice.
 * Purely presentational — no state, no API calls, no side-effects.
 *
 * Usage:
 *   import { RegulatoryDisclosure } from "../components/regulatory-disclosure";
 *
 *   // Large card — Welcome screen, dedicated section
 *   <RegulatoryDisclosure variant="full" />
 *
 *   // Small footer note — sidebar, page footers, confirm steps
 *   <RegulatoryDisclosure variant="condensed" />
 */

/** Shield SVG — conveys security/trust without alarm. */
function ShieldIcon({ className }: { className?: string }) {
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
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/** Small information circle — used in the condensed variant. */
function InfoIcon({ className }: { className?: string }) {
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
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const DISCLOSURES = [
  "PesaSense is not a licensed exchange or investment adviser under the CBK or CMA.",
  "We never hold your funds, your keys, or your M-Pesa balance.",
  "This is education, not financial advice.",
] as const;

export interface RegulatoryDisclosureProps {
  /**
   * "full"      — Prominent card with icon header and bulleted list.
   *               Use on the Welcome screen or any dedicated trust section.
   *
   * "condensed" — Single-line inline note with a small icon prefix.
   *               Use in sidebars, page footers, or confirm-step captions.
   *
   * Defaults to "full".
   */
  variant?: "full" | "condensed";
}

export function RegulatoryDisclosure({
  variant = "full",
}: RegulatoryDisclosureProps) {
  if (variant === "condensed") {
    return (
      <aside
        aria-label="Regulatory notice"
        className="flex items-start gap-2 rounded-xl border border-brass/35 bg-brass/8 px-3 py-2.5"
      >
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" />
        <p className="text-[11px] leading-5 text-ink/70">
          <span className="font-semibold text-ink/90">Not financial advice.</span>{" "}
          PesaSense is not a licensed exchange or adviser (CBK/CMA). We never
          hold your funds or keys.
        </p>
      </aside>
    );
  }

  // ── "full" variant ────────────────────────────────────────────────────────
  return (
    <aside
      aria-label="Regulatory and transparency notice"
      className="rounded-2xl border border-brass/40 bg-brass/10 p-5"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brass/20"
        >
          <ShieldIcon className="h-5 w-5 text-brass" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-snug text-ink">
            Transparency &amp; regulatory notice
          </p>
          <p className="mt-0.5 text-xs leading-5 text-ink/60">
            Please read before using PesaSense.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        className="my-4 border-t border-brass/25"
        role="separator"
        aria-hidden="true"
      />

      {/* Disclosure bullets */}
      <ul className="space-y-3" role="list">
        {DISCLOSURES.map((text) => (
          <li key={text} className="flex items-start gap-2.5">
            {/* Bullet dot */}
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass/60"
            />
            <p className="text-sm leading-6 text-ink/85">{text}</p>
          </li>
        ))}
      </ul>

      {/* Footer note */}
      <p className="mt-4 text-[11px] leading-5 text-ink/55">
        CBK — Central Bank of Kenya &nbsp;·&nbsp; CMA — Capital Markets
        Authority
      </p>
    </aside>
  );
}
