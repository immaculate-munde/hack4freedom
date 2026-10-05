"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FinancialProfile } from "@pesasense/core";
import { useI18n } from "../contexts/language-context";
import { factsCacheKey, fetchSensiSummary } from "../lib/sensi-api";
import { factsFromProfile } from "../lib/sensi-facts";
import { SensiAvatar } from "./sensi-avatar";

const CACHE_PREFIX = "pesasense.sensi.overview.";

type Props = {
  profile: FinancialProfile;
};

export function SensiOverviewCard({ profile }: Props) {
  const { t } = useI18n();
  const facts = factsFromProfile(profile);
  const cacheKey = `${CACHE_PREFIX}${factsCacheKey(facts)}`;
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requested = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey;
    if (requested.current === key && summary) {
      setLoading(false);
      return;
    }
    requested.current = key;

    try {
      const cached = sessionStorage.getItem(key);
      if (cached?.trim()) {
        setSummary(cached);
        setError(null);
        setLoading(false);
        return;
      }
    } catch {
      // sessionStorage may be blocked; fetch live.
    }

    setLoading(true);
    setError(null);

    void (async () => {
      const result = await fetchSensiSummary({
        facts,
        purpose: "overview",
        pictureConfirmed: true,
      });
      if (cancelled) return;
      if ("summary" in result) {
        setSummary(result.summary);
        setError(null);
        try {
          sessionStorage.setItem(key, result.summary);
        } catch {
          // Ignore quota / private mode.
        }
      } else {
        setSummary(null);
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // facts values are embodied in cacheKey; profile identity drives refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional cacheKey gate
  }, [cacheKey]);

  async function refresh() {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {
      // ignore
    }
    requested.current = null;
    setLoading(true);
    setError(null);
    const result = await fetchSensiSummary({
      facts,
      purpose: "overview",
      pictureConfirmed: true,
    });
    if ("summary" in result) {
      setSummary(result.summary);
      setError(null);
      try {
        sessionStorage.setItem(cacheKey, result.summary);
      } catch {
        // ignore
      }
    } else {
      setSummary(null);
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <section
      className="rounded-[20px] border border-pine/15 bg-paper px-5 py-4 shadow-card"
      aria-label={t("overview.sensiCardTitle")}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint">
          <SensiAvatar size="sm" mood={summary ? "happy" : "neutral"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
            {t("overview.sensiCardTitle")}
          </p>
          {loading ? (
            <p className="mt-2 text-sm leading-6 text-slate">{t("overview.sensiCardLoading")}</p>
          ) : summary ? (
            <p className="mt-2 text-sm leading-6 text-ink">{summary}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-warning" role="alert">
              {error ?? t("overview.sensiCardError")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/sensi" className="btn btn-secondary !min-h-0 rounded-full !px-3 !py-1.5 text-xs">
              {t("overview.sensiCardTalk")}
            </Link>
            {!loading ? (
              <button
                type="button"
                className="text-xs font-semibold text-pine underline-offset-2 hover:underline"
                onClick={() => void refresh()}
              >
                {t("overview.sensiCardRefresh")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
