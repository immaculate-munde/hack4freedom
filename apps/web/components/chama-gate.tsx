"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../contexts/language-context";
import { readChamaOptIn, writeChamaOptIn } from "../lib/chama-opt-in";
import { PageFrame } from "./page-frame";

/**
 * Soft gate for /chama when the user has not opted to join or use a chama.
 * Opt-in unlocks nav and the full Chama flow without destroying existing data.
 */
export function ChamaGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    setOptedIn(readChamaOptIn());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <PageFrame title={t("chama.title")} backHref="/overview" backLabel={t("common.back")}>
        <p className="text-sm leading-6 text-ink-soft">{t("chama.loading")}</p>
      </PageFrame>
    );
  }

  if (!optedIn) {
    return (
      <PageFrame
        title={t("chama.gateTitle")}
        description={t("chama.gateBody")}
        backHref="/overview"
        backLabel={t("common.back")}
      >
        <section className="card space-y-4">
          <p className="text-sm leading-6 text-ink-soft">{t("chama.gateHint")}</p>
          <button
            type="button"
            className="btn btn-accent w-full sm:w-auto"
            onClick={() => {
              writeChamaOptIn(true);
              setOptedIn(true);
            }}
          >
            {t("chama.gateOptIn")}
          </button>
          <Link href="/overview" className="btn btn-secondary inline-flex w-full justify-center sm:w-auto">
            {t("chama.gateLater")}
          </Link>
        </section>
      </PageFrame>
    );
  }

  return <>{children}</>;
}
