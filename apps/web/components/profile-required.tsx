"use client";

import Link from "next/link";
import { useI18n } from "../contexts/language-context";

/** Shown when PROFILE_SOURCE=parsed and no profile is stored on this device yet. */
export function ProfileRequired() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold text-ink">{t("common.noProfileTitle")}</h1>
        <p className="text-sm leading-6 text-slate">{t("common.noProfileBody")}</p>
        <Link href="/onboard" className="btn btn-primary inline-flex justify-center">
          {t("common.importMpesa")}
        </Link>
        <Link href="/onboarding" className="btn btn-ghost text-center text-sm">
          {t("common.answerQuestionsFirst")}
        </Link>
      </section>
    </main>
  );
}
