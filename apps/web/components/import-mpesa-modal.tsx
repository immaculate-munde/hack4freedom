"use client";

import { useState } from "react";
import type { FinancialProfile } from "@pesasense/core";
import { useProfile } from "../contexts/profile-context";
import { SmsImportForm } from "./sms-import-form";

function XIcon() {
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
      className="h-4 w-4"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export interface ImportMpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportMpesaModal({ isOpen, onClose }: ImportMpesaModalProps) {
  const { setProfile } = useProfile();
  const [result, setResult] = useState<FinancialProfile | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    setResult(null);
    onClose();
  }

  function handleCommit() {
    if (!result) return;
    setProfile(result);
    handleClose();
  }

  function handleUseDemo() {
    setProfile(null);
    handleClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import M-Pesa data"
      className="fixed inset-0 z-[25]"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm lg:left-[15.5rem]"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center lg:left-[15.5rem] lg:items-center">
        <div className="pointer-events-auto relative mb-[var(--spacing-nav)] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-sand bg-paper shadow-2xl lg:mb-0 lg:rounded-3xl">
          <div
            className="mx-auto mt-3 h-1 w-10 rounded-full bg-sand/80 lg:hidden"
            aria-hidden="true"
          />

          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-pine">Import M-Pesa data</h2>
                <p className="mt-0.5 text-xs text-ink/55">Stays on your phone</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={handleClose}
                className="btn btn-ghost -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sand/80 text-ink/50 hover:text-ink"
              >
                <XIcon />
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-moss/8 p-3">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-moss"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div className="flex flex-col gap-1">
                <p className="text-xs leading-5 text-ink/70">
                  Your statements never leave your phone. Backups are encrypted with
                  your key.
                </p>
                <p className="text-[11px] leading-4 text-ink/55">
                  If importing a PDF, the password is whatever you type. It is NOT your
                  ID, and it is NOT saved.
                </p>
              </div>
            </div>

            {result ? (
              <div className="mt-5 space-y-3 rounded-2xl border border-mint/60 bg-mint/25 p-4">
                <p className="text-sm font-semibold text-pine">Analysis complete</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/65">Safe surplus</span>
                    <span className="font-semibold text-ink">
                      KES {result.surplus.monthlyKes.floor.toLocaleString()} –{" "}
                      {result.surplus.monthlyKes.ceiling.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/65">Resilience</span>
                    <span className="font-semibold text-ink">
                      {result.resilience.monthsOfExpensesCovered} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/65">Commitments</span>
                    <span className="font-semibold text-ink">{result.commitments.length} detected</span>
                  </div >
                </div >
                <button onClick={handleCommit} className="btn btn-primary mt-2 w-full">
                  Use this profile
                </button>
              </div >
            ) : (
              <div className="mt-5 space-y-3">
                <SmsImportForm
                  onProfileReady={setResult}
                  onDemoFallback={handleUseDemo}
                />
              </div >
            )
            }

            {
              !result && (
                <div className="mt-4 border-t border-sand/50 pb-2 pt-4">
                  <button
                    onClick={handleUseDemo}
                    className="btn btn-ghost w-full text-center"
                  >
                    Use demo profile (Amina)
                  </button>
                </div>
              )
            }
          </div >
        </div >
      </div >
    </div >
  );
}
