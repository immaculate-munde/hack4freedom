"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { appInvestAllowance } from "../../lib/buffer-gate";
import { HabitInvestJourney } from "../../components/habit-invest-journey";
import { PageFrame } from "../../components/page-frame";
import { ProfileRequired } from "../../components/profile-required";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { useI18n } from "../../contexts/language-context";
import { useActiveProfile } from "../../lib/use-active-profile";
import { InvestFlow } from "./invest-flow";

function InvestShell({
  title,
  description,
  backLabel,
  children,
}: {
  title: string;
  description?: ReactNode;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <PageFrame title={title} description={description} backHref="/habit" backLabel={backLabel}>
      <HabitInvestJourney step="invest" />
      {children}
    </PageFrame>
  );
}

const ALLOWANCE: Record<string, string> = {
  "Build a buffer before buying Bitcoin.": "invest.bufferFirst",
  "The surplus floor is too small for a buy.": "invest.floorTooSmall",
};

function InvestPageContent({ bitikaMode: mode }: { bitikaMode: "sandbox" | "live" | "missing" }) {
  const active = useActiveProfile();
  const { t } = useI18n();

  if (!active.ready) {
    return (
      <InvestShell title={t("invest.title")} backLabel={t("invest.backHabit")}>
        <ProfileRequired />
      </InvestShell>
    );
  }

  const { profile, profileId, isDemo } = active;
  const allowance = appInvestAllowance(profile);
  const planAmount = profile.investmentPlan?.amountKes;
  const hasPlan = typeof planAmount === "number" && planAmount > 0;

  if (!allowance.ok) {
    const reasonKey = ALLOWANCE[allowance.reason];
    const reason = reasonKey ? t(reasonKey) : t("invest.notReadyFallback");
    return (
      <InvestShell title={t("invest.notReady")} backLabel={t("invest.backHabit")}>
        <section className="card">
          <p className="text-sm leading-6 text-ink-soft">{reason}</p>
          <Link href="/surplus" className="btn btn-secondary mt-4 inline-flex">
            {t("invest.seeSurplus")}
          </Link>
        </section>
        {profileId === "amina" || profileId === "brian" ? (
          <UssdAccess profileId={profileId} />
        ) : null}
      </InvestShell>
    );
  }

  if (!hasPlan || planAmount === undefined) {
    return (
      <InvestShell title={t("invest.setHabit")} backLabel={t("invest.setHabit")}>
        <section className="card">
          <p className="text-sm leading-6 text-ink-soft">{t("invest.setHabitFirst")}</p>
          <Link href="/habit" className="btn btn-accent mt-4 inline-flex">
            {t("invest.setHabit")}
          </Link>
        </section>
        {profileId === "amina" || profileId === "brian" ? (
          <UssdAccess profileId={profileId} />
        ) : null}
      </InvestShell>
    );
  }

  return (
    <InvestShell
      title={t("invest.title")}
      backLabel={t("invest.backHabit")}
      description={
        isDemo
          ? t("invest.demoProfile", { name: active.displayName })
          : t("invest.importedProfile")
      }
    >
      <InvestFlow
        profileId={profileId}
        profile={isDemo ? undefined : profile}
        surplusFloorKes={allowance.ok ? allowance.maxKes : profile.surplus.monthlyKes.floor}
        defaultAmountKes={planAmount}
        sandbox={mode === "sandbox"}
      />
      <WalletActivity profileId={profileId} />
      {profileId === "amina" || profileId === "brian" ? (
        <UssdAccess profileId={profileId} />
      ) : null}
      {mode === "missing" ? (
        <p className="mt-4 text-xs text-red-800">{t("invest.missingKey")}</p>
      ) : null}
    </InvestShell>
  );
}

export function InvestPageClient({
  bitikaMode,
}: {
  bitikaMode: "sandbox" | "live" | "missing";
}) {
  return (
    <Suspense>
      <InvestPageContent bitikaMode={bitikaMode} />
    </Suspense>
  );
}
