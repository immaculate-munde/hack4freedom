import type { LearnImageKey } from "@pesasense/core";
import Image from "next/image";

const SENSI_SRC: Partial<Record<LearnImageKey, string>> = {
  sensi: "/sensi.png",
  "sensi-ask": "/sensi-ask.png",
  "sensi-think": "/sensi-think.png",
  "sensi-yes": "/sensi-yes.png",
};

/** Maps KB image keys to Sensi photos or simple brand illustrations. */
export function LearnIllustration({
  imageKey,
  alt,
  className = "",
}: {
  imageKey: LearnImageKey;
  alt: string;
  className?: string;
}) {
  const sensiSrc = SENSI_SRC[imageKey];
  if (sensiSrc) {
    return (
      <div
        className={`relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[28px] border border-sand/70 bg-gradient-to-br from-mint/40 to-pearl ${className}`}
      >
        <Image src={sensiSrc} alt={alt} fill className="object-cover object-top" sizes="220px" />
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-[28px] border border-sand/70 bg-gradient-to-br from-pearl via-paper to-mint/30 p-6 ${className}`}
      role="img"
      aria-label={alt}
    >
      <TopicSvg imageKey={imageKey} />
    </div>
  );
}

function TopicSvg({ imageKey }: { imageKey: LearnImageKey }) {
  switch (imageKey) {
    case "bitcoin":
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="60" cy="60" r="44" className="fill-brass/20 stroke-brass" strokeWidth="3" />
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="fill-brass"
            style={{ fontSize: 42, fontWeight: 700, fontFamily: "ui-sans-serif, system-ui" }}
          >
            ₿
          </text>
          <circle cx="28" cy="30" r="4" className="fill-moss/50" />
          <circle cx="96" cy="40" r="3" className="fill-teal/50" />
          <circle cx="88" cy="92" r="3.5" className="fill-moss/40" />
          <path d="M28 30 L48 48 M96 40 L78 52 M88 92 L70 74" className="stroke-sand" strokeWidth="2" />
        </svg>
      );
    case "keys":
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="42" cy="48" r="18" className="fill-none stroke-pine" strokeWidth="4" />
          <path
            d="M56 56 L96 80 L90 88 L82 82 L76 90 L68 84 L74 76 Z"
            className="fill-none stroke-brass"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect x="24" y="78" width="36" height="16" rx="4" className="fill-mint stroke-moss" strokeWidth="2" />
          <path d="M30 86 H48 M30 90 H42" className="stroke-pine" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "sats":
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="60" cy="60" r="40" className="fill-brass/15 stroke-brass/60" strokeWidth="2" />
          <circle cx="44" cy="52" r="10" className="fill-brass/40" />
          <circle cx="68" cy="46" r="7" className="fill-brass/55" />
          <circle cx="72" cy="70" r="12" className="fill-brass/35" />
          <circle cx="50" cy="74" r="6" className="fill-brass/70" />
          <text
            x="60"
            y="108"
            textAnchor="middle"
            className="fill-slate"
            style={{ fontSize: 12, fontWeight: 600, fontFamily: "ui-sans-serif, system-ui" }}
          >
            sats
          </text>
        </svg>
      );
    case "lightning":
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <path
            d="M62 18 L34 66 H56 L48 102 L88 48 H64 Z"
            className="fill-brass stroke-terracotta"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M22 78 C40 70 80 70 98 78"
            className="fill-none stroke-sky"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <path
            d="M60 16 L96 32 V58 C96 82 78 98 60 104 C42 98 24 82 24 58 V32 Z"
            className="fill-mint/50 stroke-moss"
            strokeWidth="3"
          />
          <path
            d="M44 40 L76 40 M48 52 H72 M52 64 H68"
            className="stroke-coral"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="60" cy="78" r="6" className="fill-coral/80" />
        </svg>
      );
    case "habit":
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <rect x="18" y="70" width="22" height="28" rx="4" className="fill-sand stroke-slate/40" strokeWidth="2" />
          <rect x="48" y="52" width="22" height="46" rx="4" className="fill-mint stroke-moss" strokeWidth="2" />
          <rect x="78" y="34" width="22" height="64" rx="4" className="fill-brass/40 stroke-brass" strokeWidth="2" />
          <path
            d="M28 64 L58 46 L88 28"
            className="fill-none stroke-teal"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="88" cy="28" r="5" className="fill-teal" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="60" cy="60" r="36" className="fill-mint stroke-moss" strokeWidth="3" />
        </svg>
      );
  }
}
