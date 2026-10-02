"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinancialProfile } from "@pesasense/core";
import { useProfile } from "../../contexts/profile-context";
import { PdfImportForm } from "../../components/pdf-import-form";
import { SmsImportForm } from "../../components/sms-import-form";

export default function OnboardPage() {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [parsedProfile, setParsedProfile] = useState<FinancialProfile | null>(null);

  const handleUseDemo = () => {
    setProfile(null);
    router.push("/");
  };

  const handleGoToDashboard = () => {
    if (parsedProfile) {
      setProfile(parsedProfile);
      try {
        localStorage.setItem("hasSeenWelcome", "true");
      } catch {
        // ignore
      }
      router.push("/overview");
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8 px-4 sm:px-0">
      <header>
        <h1 className="font-serif text-3xl font-bold text-pine">Import your data</h1>
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-moss/10 p-3 text-sm text-ink/80">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-moss"
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
          <p>Your statements never leave your phone. Backups are encrypted with your key.</p>
        </div>
      </header>

      {parsedProfile ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-mint/60 bg-mint/25 p-6 text-pine shadow-sm duration-500">
          <h2 className="font-serif text-2xl font-semibold text-pine">
            Analysis Complete
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex justify-between border-b border-sand/50 pb-3">
              <span className="text-sm font-medium text-ink/70">
                Safe Surplus Range
              </span>
              <span className="font-bold text-pine">
                KES {parsedProfile.surplus.monthlyKes.floor.toLocaleString()} -{" "}
                {parsedProfile.surplus.monthlyKes.ceiling.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-b border-sand/50 pb-3">
              <span className="text-sm font-medium text-ink/70">Resilience</span>
              <span className="font-bold text-ink">
                {parsedProfile.resilience.monthsOfExpensesCovered} months covered
              </span>
            </div>
            <div className="flex justify-between border-b border-sand/50 pb-3">
              <span className="text-sm font-medium text-ink/70">
                Detected Commitments
              </span>
              <span className="font-bold text-ink">
                {parsedProfile.commitments.length} items
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-sm font-medium text-ink/70">Income range</span>
              <span className="font-bold text-ink">
                KES {parsedProfile.income.monthlyKes.floor.toLocaleString("en-KE")} –{" "}
                {parsedProfile.income.monthlyKes.ceiling.toLocaleString("en-KE")}
              </span>
            </div>
          </div>

          <button
            onClick={handleGoToDashboard}
            className="btn btn-primary mt-8 w-full py-4 text-base shadow-sm"
          >
            Go to my dashboard
          </button>
        </section>
      ) : (
        <>
          <section className="card space-y-4">
            <h2 className="font-semibold text-pine">M-Pesa SMS Paste</h2>
            <SmsImportForm
              onProfileReady={setParsedProfile}
              onDemoFallback={handleUseDemo}
            />
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold text-pine">M-Pesa PDF Upload</h2>
            <PdfImportForm
              onProfileReady={setParsedProfile}
              onDemoFallback={handleUseDemo}
            />
            <p className="text-[11px] leading-4 text-ink/55">
              Demo fixture:{" "}
              <a
                href="/fixtures/amina-statement.pdf"
                className="font-semibold text-teal underline underline-offset-2"
                download
              >
                amina-statement.pdf
              </a>{" "}
              (password <code className="text-[10px]">demo-statement</code>)
            </p>
          </section>
        </>
      )}

      {!parsedProfile && (
        <div className="mt-2 border-t border-sand/40 pt-6">
          <button onClick={handleUseDemo} className="btn btn-ghost w-full">
            Use demo profile (Amina)
          </button>
        </div>
      )}
    </main>
  );
}
