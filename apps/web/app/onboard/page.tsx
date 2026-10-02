"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { useProfile } from "../../contexts/profile-context";
import { PdfImportForm } from "../../components/pdf-import-form";
import { SmsImportForm } from "../../components/sms-import-form";
import { ThemeToggle } from "../../components/theme-toggle";
import { routeAfterImport } from "../../lib/profile-from-import";

export default function OnboardPage() {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [parsedProfile, setParsedProfile] = useState<FinancialProfile | null>(null);

  const handleUseDemo = () => {
    setProfile(demoProfiles.amina);
    try {
      localStorage.setItem("hasSeenWelcome", "true");
    } catch {
      // ignore
    }
    router.push("/overview");
  };

  const handleGoToDashboard = () => {
    if (parsedProfile) {
      setProfile(parsedProfile);
      try {
        localStorage.setItem("hasSeenWelcome", "true");
      } catch {
        // ignore
      }
      router.push(routeAfterImport(parsedProfile));
    }
  };

  const nextPath = parsedProfile ? routeAfterImport(parsedProfile) : "/overview";

  return (
    <main className="grid min-h-dvh w-full lg:grid-cols-[minmax(16rem,28rem)_minmax(0,1fr)]">
      <aside className="flex flex-col items-center justify-end px-6 pt-6 lg:sticky lg:top-0 lg:h-dvh lg:justify-end lg:px-4 lg:pb-0">
        <p className="mb-4 max-w-[16rem] rounded-2xl bg-paper px-4 py-3 text-center text-sm leading-6 text-ink shadow-sm">
          {parsedProfile
            ? "That's the picture from your history."
            : "Paste the messages, or drop the PDF. I'll read them on this phone."}
        </p>
        <img
          src={parsedProfile ? "/sensi-yes.png" : "/sensi-ask.png"}
          alt="Sensi"
          className="pointer-events-none h-52 w-auto object-contain sm:h-64 lg:h-[min(72vh,680px)]"
        />
      </aside>

      <div className="flex min-w-0 flex-col gap-6 px-5 py-8 sm:px-8 lg:py-10 lg:pr-10 xl:pr-14">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-bold text-pine sm:text-4xl">Import your data</h1>
            <ThemeToggle />
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-moss/10 p-3 text-sm text-ink/80">
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
          <section className="animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-mint/60 bg-mint/25 p-6 text-pine shadow-sm duration-500 lg:max-w-3xl">
            <h2 className="font-serif text-2xl font-semibold text-pine">Analysis Complete</h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between border-b border-sand/50 pb-3">
                <span className="text-sm font-medium text-ink/70">Safe Surplus Range</span>
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
                <span className="text-sm font-medium text-ink/70">Detected Commitments</span>
                <span className="font-bold text-ink">{parsedProfile.commitments.length} items</span>
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
              {nextPath === "/habit" ? "Set the habit" : "Go to my dashboard"}
            </button>
          </section>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="card space-y-4">
              <h2 className="font-semibold text-pine">M-Pesa SMS Paste</h2>
              <SmsImportForm onProfileReady={setParsedProfile} onDemoFallback={handleUseDemo} />
            </section>

            <section className="card space-y-4">
              <h2 className="font-semibold text-pine">M-Pesa PDF Upload</h2>
              <PdfImportForm onProfileReady={setParsedProfile} onDemoFallback={handleUseDemo} />
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
          </div>
        )}

        {!parsedProfile && (
          <div className="border-t border-sand/40 pt-6">
            <button onClick={handleUseDemo} className="btn btn-ghost sm:w-auto">
              Use demo profile (Amina)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
