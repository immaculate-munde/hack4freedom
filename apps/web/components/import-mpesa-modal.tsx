"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { useI18n } from "../contexts/language-context";
import { useProfile } from "../contexts/profile-context";
import { ImportAnalysisCard } from "./import-analysis-card";
import { PdfImportForm } from "./pdf-import-form";
import { ShareImportHint } from "./share-import-hint";
import { SmsImportForm } from "./sms-import-form";
import { routeAfterImport } from "../lib/profile-from-import";

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
  const { t } = useI18n();
  const router = useRouter();
  const { setProfile } = useProfile();
  const [result, setResult] = useState<FinancialProfile | null>(null);
  const [transactionCount, setTransactionCount] = useState<number | undefined>(undefined);

  if (!isOpen) return null;

  function handleClose() {
    setResult(null);
    setTransactionCount(undefined);
    onClose();
  }

  function handleProfileReady(
    profile: FinancialProfile,
    meta?: { transactionCount: number },
  ) {
    setResult(profile);
    setTransactionCount(meta?.transactionCount);
  }

  function handleCommit() {
    if (!result) return;
    const next = result;
    setProfile(next);
    try {
      localStorage.setItem("hasSeenWelcome", "true");
    } catch {
      // ignore
    }
    handleClose();
    router.push(routeAfterImport(next));
  }

  function handleUseDemo() {
    setProfile(demoProfiles.amina);
    try {
      localStorage.setItem("hasSeenWelcome", "true");
    } catch {
      // ignore
    }
    handleClose();
    router.push("/overview");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("import.aria")}
      className="fixed inset-0 z-[25]"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm lg:left-[15.5rem]"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center lg:left-[15.5rem] lg:items-center">
        <div
          className={`pointer-events-auto relative mb-[var(--spacing-nav)] max-h-[min(92dvh,52rem)] w-full overflow-y-auto rounded-t-2xl border border-sand bg-paper shadow-2xl lg:mb-0 lg:rounded-3xl ${
            result ? "max-w-lg" : "max-w-sm"
          }`}
        >
          <div
            className="mx-auto mt-3 h-1 w-10 rounded-full bg-sand/80 lg:hidden"
            aria-hidden="true"
          />

          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-pine">{t("import.title")}</h2>
                <p className="mt-0.5 text-xs text-slate">{t("import.stays")}</p>
              </div>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={handleClose}
                className="btn btn-ghost -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sand/80 text-slate hover:text-ink"
              >
                <XIcon />
              </button>
            </div>

            {!result ? (
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
                  <p className="text-xs leading-5 text-ink-soft">{t("import.neverLeave")}</p>
                  <p className="text-[11px] leading-4 text-slate">{t("import.passwordNote")}</p>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="mt-4">
                <ImportAnalysisCard
                  profile={result}
                  transactionCount={transactionCount}
                  primaryActionLabel={
                    routeAfterImport(result) === "/habit"
                      ? t("import.setHabit")
                      : t("import.useProfile")
                  }
                  onPrimaryAction={handleCommit}
                />
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <ShareImportHint />
                <SmsImportForm
                  onProfileReady={handleProfileReady}
                  onDemoFallback={handleUseDemo}
                />
                <div className="border-t border-sand/50 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate">
                    {t("import.orPdf")}
                  </p>
                  <PdfImportForm
                    onProfileReady={handleProfileReady}
                    onDemoFallback={handleUseDemo}
                  />
                </div>
              </div>
            )}

            {!result && (
              <div className="mt-4 border-t border-sand/50 pb-2 pt-4">
                <button
                  onClick={handleUseDemo}
                  className="btn btn-ghost w-full text-center"
                >
                  {t("import.useDemo")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
