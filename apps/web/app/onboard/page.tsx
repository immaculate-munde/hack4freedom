"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { useProfile } from "../../contexts/profile-context";
import { useFormat, useI18n } from "../../contexts/language-context";
import { PdfImportForm } from "../../components/pdf-import-form";
import { SmsImportForm } from "../../components/sms-import-form";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ThemeToggle } from "../../components/theme-toggle";
import { routeAfterImport } from "../../lib/profile-from-import";

export default function OnboardPage() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { t } = useI18n();
  const { number } = useFormat();

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
            <p>{t("onboard.privacy")}</p>
          </div>
        </header>

        {parsedProfile ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-mint/60 bg-mint/25 p-6 text-pine shadow-sm duration-500 lg:max-w-3xl">
            <h2 className="font-serif text-2xl font-semibold text-pine">{t("onboard.analysisComplete")}</h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between border-b border-sand/50 pb-3">
                <span className="text-sm font-medium text-ink/70">{t("onboard.safeSurplus")}</span>
                <span className="font-bold text-pine">
                  {t("onboard.kesRange", {
                    floor: number(parsedProfile.surplus.monthlyKes.floor),
                    ceiling: number(parsedProfile.surplus.monthlyKes.ceiling),
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b border-sand/50 pb-3">
                <span className="text-sm font-medium text-ink/70">{t("onboard.resilience")}</span>
                <span className="font-bold text-ink">
                  {t("onboard.monthsCovered", {
                    count: number(parsedProfile.resilience.monthsOfExpensesCovered),
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b border-sand/50 pb-3">
                <span className="text-sm font-medium text-ink/70">{t("onboard.commitments")}</span>
                <span className="font-bold text-ink">
                  {t("onboard.items", { count: number(parsedProfile.commitments.length) })}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-sm font-medium text-ink/70">{t("onboard.incomeRange")}</span>
                <span className="font-bold text-ink">
                  {t("onboard.kesRange", {
                    floor: number(parsedProfile.income.monthlyKes.floor),
                    ceiling: number(parsedProfile.income.monthlyKes.ceiling),
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={handleGoToDashboard}
              className="btn btn-primary mt-8 w-full py-4 text-base shadow-sm"
            >
              {nextPath === "/habit" ? t("onboard.setHabit") : t("onboard.goDashboard")}
            </button>
          </section>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="card space-y-4">
              <h2 className="font-semibold text-pine">{t("onboard.smsPaste")}</h2>
              <SmsImportForm onProfileReady={setParsedProfile} onDemoFallback={handleUseDemo} />
            </section>

            <section className="card space-y-4">
              <h2 className="font-semibold text-pine">{t("onboard.pdfUpload")}</h2>
              <PdfImportForm onProfileReady={setParsedProfile} onDemoFallback={handleUseDemo} />
              <p className="text-[11px] leading-4 text-ink/55">
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
