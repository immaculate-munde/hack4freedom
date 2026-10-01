/**
 * Sensi, the guide.
 *
 * A calm sprout face, drawn inline so the welcome screen does not fetch an image.
 */
export function Sensi({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className={className}>
      <circle cx="40" cy="46" r="24" className="fill-mint" />
      <ellipse
        cx="30"
        cy="22"
        rx="7"
        ry="12"
        transform="rotate(-32 30 22)"
        className="fill-teal"
      />
      <ellipse
        cx="50"
        cy="22"
        rx="7"
        ry="12"
        transform="rotate(32 50 22)"
        className="fill-teal"
      />
      <circle cx="32" cy="46" r="2.4" className="fill-ink" />
      <circle cx="48" cy="46" r="2.4" className="fill-ink" />
      <path
        d="M34 54c2.2 2.6 9.8 2.6 12 0"
        className="fill-none stroke-ink"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="26" cy="52" r="2.6" className="fill-warning/35" />
      <circle cx="54" cy="52" r="2.6" className="fill-warning/35" />
    </svg>
  );
}
