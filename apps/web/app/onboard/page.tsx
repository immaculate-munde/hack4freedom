"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { useProfile } from "../../contexts/profile-context";
import { useI18n } from "../../contexts/language-context";
import { ImportAnalysisCard } from "../../components/import-analysis-card";
import { PdfImportForm } from "../../components/pdf-import-form";
import { ShareImportHint } from "../../components/share-import-hint";
import { SmsImportForm } from "../../components/sms-import-form";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ThemeToggle } from "../../components/theme-toggle";
import { routeAfterImport } from "../../lib/profile-from-import";

export default function OnboardPage() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { t } = useI18n();

  const [parsedProfile, setParsedProfile] = useState<FinancialProfile | null>(null);
  const [transactionCount, setTransactionCount] = useState<number | undefined>(undefined);

  const handleProfileReady = (
    profile: FinancialProfile,
    meta?: { transactionCount: number },
  ) => {
    setParsedProfile(profile);
    setTransactionCount(meta?.transactionCount);
  };

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
          {parsedProfile ? t("onboard.promptReady") : t("onboard.promptPaste")}
        </p>
        <img
          src={parsedProfile ? "/sensi-yes.png" : "/sensi-ask.png"}
          alt={t("onboard.sensiAlt")}
          className="pointer-events-none h-52 w-auto object-contain sm:h-64 lg:h-[min(72vh,680px)]"
        />
      </aside>

      <div className="flex min-w-0 flex-col gap-6 px-5 py-8 sm:px-8 lg:py-10 lg:pr-10 xl:pr-14">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-bold text-pine sm:text-4xl">{t("onboard.title")}</h1>
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-moss/10 p-3 text-sm text-ink-soft">
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
            <p>{t("onboard.privacy")}</p>
          </div>
        </header>

        {parsedProfile ? (
          <ImportAnalysisCard
            profile={parsedProfile}
            transactionCount={transactionCount}
            primaryActionLabel={
              nextPath === "/habit" ? t("onboard.setHabit") : t("onboard.goDashboard")
            }
            onPrimaryAction={handleGoToDashboard}
          />
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="card space-y-4">
              <h2 className="font-semibold text-pine">{t("onboard.smsPaste")}</h2>
              <ShareImportHint />
              <SmsImportForm onProfileReady={handleProfileReady} onDemoFallback={handleUseDemo} />
            </section>

            <section className="card space-y-4">
              <h2 className="font-semibold text-pine">{t("onboard.pdfUpload")}</h2>
              <PdfImportForm onProfileReady={handleProfileReady} onDemoFallback={handleUseDemo} />
              <p className="text-[11px] leading-4 text-slate">
                {t("onboard.demoFixture")}{" "}
                <a
                  href="/fixtures/amina-statement.pdf"
                  className="font-semibold text-teal underline underline-offset-2"
                  download
                >
                  amina-statement.pdf
                </a>{" "}
                ({t("onboard.passwordWord")} <code className="text-[10px]">demo-statement</code>)
              </p>
            </section>
          </div>
        )}

        {!parsedProfile && (
          <div className="border-t border-sand/40 pt-6">
            <button onClick={handleUseDemo} className="btn btn-ghost sm:w-auto">
              {t("onboard.useDemo")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
