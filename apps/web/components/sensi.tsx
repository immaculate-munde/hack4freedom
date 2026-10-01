/**
 * Sensi, the guide on the welcome screen.
 *
 * A small sprout with a calm face. Bundled inline so it loads with the page.
 */
export function Sensi({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className={className}>
      <circle cx="40" cy="44" r="22" className="fill-sand" />
      <ellipse
        cx="31"
        cy="24"
        rx="7"
        ry="11"
        transform="rotate(-35 31 24)"
        className="fill-pine"
      />
      <ellipse
        cx="49"
        cy="24"
        rx="7"
        ry="11"
        transform="rotate(35 49 24)"
        className="fill-pine"
      />
      <circle cx="33" cy="43" r="2.2" className="fill-ink" />
      <circle cx="47" cy="43" r="2.2" className="fill-ink" />
      <path
        d="M35 50c2 2.4 8 2.4 10 0"
        className="fill-none stroke-ink"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="28" cy="48" r="2.4" className="fill-brass/50" />
      <circle cx="52" cy="48" r="2.4" className="fill-brass/50" />
    </svg>
  );
}
