/**
 * PesaSense mark. A sprout in a teal tile, drawn inline.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="10" className="fill-teal" />
      <ellipse
        cx="12.2"
        cy="13.4"
        rx="3.1"
        ry="4.8"
        transform="rotate(-42 12.2 13.4)"
        className="fill-canvas"
      />
      <ellipse
        cx="19.8"
        cy="13.4"
        rx="3.1"
        ry="4.8"
        transform="rotate(42 19.8 13.4)"
        className="fill-canvas"
      />
      <rect
        x="15.15"
        y="14.2"
        width="1.7"
        height="9"
        rx="0.85"
        className="fill-canvas"
      />
    </svg>
  );
}
