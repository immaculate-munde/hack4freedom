"use client";

import type { ReactNode } from "react";
import { useI18n } from "../contexts/language-context";

export type SensiSize = "sm" | "md" | "lg" | "xl";
export type SensiMood = "neutral" | "happy" | "thinking" | "celebrating";

const SIZE_CLASSES: Record<SensiSize, string> = {
  sm: "h-8 w-8",
  md: "h-16 w-16",
  lg: "h-28 w-28",
  xl: "h-40 w-40",
};

function Eyes({ mood }: { mood: SensiMood }): ReactNode {
  if (mood === "happy" || mood === "celebrating") {
    return (
      <path
        d="M29 48C34 43 41 43 46 48M54 48C59 43 66 43 71 48"
        className="fill-none stroke-moss"
        strokeLinecap="round"
        strokeWidth="3"
      />
    );
  }
  if (mood === "thinking") {
    return (
      <>
        <path
          d="M29 47C34 50 41 50 46 47M54 47C59 50 66 50 71 47"
          className="fill-none stroke-moss"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M30 39C35 36 41 36 45 39M55 37C61 35 67 36 71 39"
          className="fill-none stroke-moss"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </>
    );
  }
  return (
    <>
      <path
        d="M29 47C34 50 41 50 46 47M54 47C59 50 66 50 71 47"
        className="fill-none stroke-moss"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M30 39C35 36 41 36 45 39M55 39C59 36 65 36 70 39"
        className="fill-none stroke-moss"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </>
  );
}

function Mouth({ mood }: { mood: SensiMood }): ReactNode {
  if (mood === "celebrating") {
    return <path d="M37 59C44 72 56 72 63 59C58 64 42 64 37 59Z" className="fill-moss" />;
  }
  if (mood === "thinking") {
    return <ellipse cx="50" cy="63" rx="2.5" ry="1.5" className="fill-none stroke-moss" strokeWidth="2" />;
  }
  if (mood === "happy") {
    return (
      <path
        d="M38 60C45 68 55 68 62 60"
        className="fill-none stroke-moss"
        strokeLinecap="round"
        strokeWidth="3"
      />
    );
  }
  return (
    <>
      <path
        d="M47 54C49 56 51 56 53 54"
        className="fill-none stroke-moss"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
      <path
        d="M42 61C47 66 53 66 58 61"
        className="fill-none stroke-moss"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </>
  );
}

/** Sensi, drawn as a small face that blinks and sways. Motion stops when the person asks for less movement. */
export function SensiAvatar({ size = "md", mood = "neutral" }: { size?: SensiSize; mood?: SensiMood }) {
  const { t } = useI18n();
  return (
    <span className={`sensi ${SIZE_CLASSES[size]}`} role="img" aria-label={t("sensi.name")}>
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <g className="sensi-bob">
          <g className="sensi-hair">
            <path
              d="M22 55C17 35 28 12 50 10C72 12 83 35 78 55C74 44 70 36 64 31C55 38 44 40 35 34C29 40 25 47 22 55Z"
              className="fill-pine stroke-pine"
              strokeWidth="3"
            />
            <path
              d="M25 52C24 39 29 27 39 21C44 18 55 18 61 21C70 26 76 38 75 51C70 43 67 36 63 31C54 38 43 39 35 34C30 40 27 46 25 52Z"
              className="fill-pine"
            />
            <path
              d="M29 30C34 24 40 21 47 20M71 30C67 25 62 22 56 20"
              className="fill-none stroke-brass"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
            {mood === "celebrating" ? (
              <path
                d="M24 33C26 30 27 28 28 26M76 33C74 30 73 28 72 26M50 24V17"
                className="fill-none stroke-brass"
                strokeLinecap="round"
                strokeWidth="3"
              />
            ) : null}
          </g>
          <ellipse cx="50" cy="55" rx="27" ry="33" className="fill-paper stroke-pine" strokeWidth="3" />
          <g className="sensi-eyes">
            <Eyes mood={mood} />
          </g>
          <Mouth mood={mood} />
        </g>
      </svg>
    </span>
  );
}
