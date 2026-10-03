"use client";

import Link from "next/link";
import { useI18n } from "../contexts/language-context";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export interface SavingsLadderProps {
  /** The current active step (1-3) */
  currentStep: number;
  /** Used to determine if the first step (emergency buffer) is complete */
  bufferMonths: number;
}

export function SavingsLadder({ currentStep, bufferMonths }: SavingsLadderProps) {
  const { t } = useI18n();
  const bufferTarget = 3;
  const isStep1Complete = bufferMonths >= bufferTarget || currentStep > 1;
  const isStep2Complete = currentStep > 2;

  // Derive statuses
  const step1Status = isStep1Complete ? "complete" : "active";
  const step2Status = isStep1Complete
    ? isStep2Complete
      ? "complete"
      : "active"
    : "locked";
  const step3Status = isStep2Complete ? "active" : "locked";

  return (
    <div className="relative pl-10" aria-label={t("learn.ladder.label")}>
      {/* Vertical connecting line */}
      <div
        className="absolute bottom-6 left-[1.125rem] top-4 w-px bg-sand"
        aria-hidden="true"
      />

      {/* STEP 1: Emergency Buffer */}
      <div className="relative mb-8">
        <StepMarker status={step1Status} number={1} />
        <div
          className={`rounded-2xl border p-4 ${
            step1Status === "active"
              ? "border-moss/40 bg-moss/5"
              : "border-sand/50 bg-paper"
          }`}
          aria-current={step1Status === "active" ? "step" : undefined}
        >
          <h3
            className={`font-semibold ${
              step1Status === "active" ? "text-moss" : "text-ink"
            }`}
          >
            {t("learn.ladder.bufferTitle")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            {t("learn.ladder.bufferBody", { months: bufferTarget })}
          </p>
          {step1Status === "active" && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full bg-moss transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, (Math.max(0, bufferMonths) / bufferTarget) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-moss">
                {t("learn.ladder.progress", { done: bufferMonths, target: bufferTarget })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Everyday Saving */}
      <div className="relative mb-8">
        <StepMarker status={step2Status} number={2} />
        <div
          className={`rounded-2xl border p-4 ${
            step2Status === "active"
              ? "border-moss/40 bg-moss/5"
              : step2Status === "locked"
                ? "border-transparent bg-sand/30 opacity-70"
                : "border-sand/50 bg-paper"
          }`}
          aria-current={step2Status === "active" ? "step" : undefined}
        >
          <div className="flex items-center gap-2">
            {step2Status === "locked" && <LockIcon className="h-4 w-4 text-ink/40" />}
            <h3
              className={`font-semibold ${
                step2Status === "active" ? "text-moss" : "text-ink"
              }`}
            >
              {t("learn.ladder.everydayTitle")}
            </h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            {t("learn.ladder.everydayBody")}
          </p>
        </div>
      </div>

      {/* STEP 3: Long-Term Bitcoin */}
      <div className="relative">
        <StepMarker status={step3Status} number={3} />
        <div
          className={`rounded-2xl border p-4 ${
            step3Status === "active"
              ? "border-pine/40 bg-pine/5 shadow-sm"
              : "border-transparent bg-sand/30 opacity-70"
          }`}
          aria-current={step3Status === "active" ? "step" : undefined}
        >
          <div className="flex items-center gap-2">
            {step3Status === "locked" && <LockIcon className="h-4 w-4 text-ink/40" />}
            <h3
              className={`font-semibold ${
                step3Status === "active" ? "text-pine" : "text-ink"
              }`}
            >
              {t("learn.ladder.bitcoinTitle")}
            </h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            {t("learn.ladder.bitcoinBody")}
          </p>

          {step3Status === "active" && (
            <div className="mt-5">
              <Link
                href="/invest"
                className="btn btn-primary inline-flex items-center justify-center text-sm"
              >
                {t("learn.ladder.invest")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The circular marker that sits on the timeline line. */
function StepMarker({
  status,
  number,
}: {
  status: "complete" | "active" | "locked";
  number: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute -left-10 top-4 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-paper text-[10px] font-bold ring-4 ring-paper ${
        status === "complete"
          ? "border-pine text-pine"
          : status === "active"
            ? "border-moss text-moss"
            : "border-sand/80 text-ink/40"
      }`}
    >
      {status === "complete" ? <CheckIcon className="h-3 w-3" /> : number}
    </div>
  );
}
