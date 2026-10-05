"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { SmsImportForm } from "../../components/sms-import-form";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useProfile } from "../../contexts/profile-context";
import { routeAfterImport } from "../../lib/profile-from-import";
import { takeSharedText } from "../../lib/share-target";

function SharePageContent() {
  const { t } = useI18n();
  const { kes, number } = useFormat();
  const router = useRouter();
  const params = useSearchParams();
  const { setProfile } = useProfile();
  const missed = params.get("local") === "0";
  const tooLarge = params.get("large") === "1";
  const [sharedText, setSharedText] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<FinancialProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    takeSharedText()
      .then((text) => {
        if (cancelled) return;
        setSharedText(text);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSharedText(null);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function rememberWelcome() {
    try {
      localStorage.setItem("hasSeenWelcome", "true");
    } catch {
      // ignore
    }
  }

  function handleUseDemo() {
    setProfile(demoProfiles.amina);
    rememberWelcome();
    router.push("/overview");
  }

  function handleCommit() {
    if (!result) return;
    const next = result;
    setProfile(next);
    rememberWelcome();
    router.push(routeAfterImport(next));
  }

  const warning = sharedText ? null : missed ? t("import.share.missed") : tooLarge ? t("import.share.large") : null;

  return (
    <main className="page-frame pb-24 md:pb-0">
      <div className="page-frame-primary">
        <h1 className="page-title">{t("import.share.title")}</h1>
        <p className="page-lead">{t("import.share.stays")}</p>
        <div className="page-body space-y-4">
          {warning ? (
            <p className="rounded-xl bg-brass/10 px-3 py-2 text-sm leading-6 text-brass">{warning}</p>
          ) : null}
          {ready && !sharedText && !warning ? (
            <p className="text-sm leading-6 text-ink-soft">{t("import.share.empty")}</p>
          ) : null}

          {!ready ? (
            <p className="text-sm text-slate">{t("common.loading")}</p>
          ) : result ? (
            <div className="space-y-3 rounded-2xl border border-mint/60 bg-mint/25 p-4">
              <p className="text-sm font-semibold text-pine">{t("import.complete")}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-ink-soft">{t("import.safeSurplus")}</span>
                  <span className="font-semibold text-ink">
                    {kes(result.surplus.monthlyKes.floor)} – {number(result.surplus.monthlyKes.ceiling)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-soft">{t("import.resilience")}</span>
                  <span className="font-semibold text-ink">
                    {t("import.months", { count: result.resilience.monthsOfExpensesCovered })}
                  </span>
                </div>
              </div>
              <button type="button" onClick={handleCommit} className="btn btn-primary w-full">
                {routeAfterImport(result) === "/habit" ? t("import.setHabit") : t("import.useProfile")}
              </button>
            </div>
          ) : (
            <SmsImportForm
              key={sharedText ?? "empty"}
              initialText={sharedText ?? ""}
              onProfileReady={setResult}
              onDemoFallback={handleUseDemo}
            />
          )}

          <Link href="/onboard" className="inline-flex text-sm font-semibold text-pine underline underline-offset-4">
            {t("import.share.pasteLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <SharePageContent />
    </Suspense>
  );
}
