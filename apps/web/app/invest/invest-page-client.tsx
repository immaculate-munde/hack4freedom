"use client";

import { Suspense } from "react";
import Link from "next/link";
import { appInvestAllowance } from "../../lib/buffer-gate";
import { PageFrame } from "../../components/page-frame";
import { ProfileRequired } from "../../components/profile-required";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { useI18n } from "../../contexts/language-context";
import { useActiveProfile } from "../../lib/use-active-profile";
import { InvestFlow } from "./invest-flow";

const ALLOWANCE: Record<string, string> = {
  "Build a buffer before buying Bitcoin.": "invest.bufferFirst",
  "The surplus floor is too small for a buy.": "invest.floorTooSmall",
};

function InvestPageContent({ bitikaMode: mode }: { bitikaMode: "sandbox" | "live" | "missing" }) {
  const active = useActiveProfile();
  const { t } = useI18n();

  if (!active.ready) {
    return (
      <PageFrame title={t("invest.title")} backHref="/" backLabel={t("invest.backOverview")}>
        <ProfileRequired />
      </PageFrame>
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
      <PageFrame title={t("invest.notReady")} backHref="/" backLabel={t("invest.backOverview")}>
        <section className="card">
          <p className="text-sm leading-6 text-ink-soft">{reason}</p>
        </section>
        {profileId === "amina" || profileId === "brian" ? (
          <UssdAccess profileId={profileId} />
        ) : null}
      </PageFrame>
    );
  }

  if (!hasPlan || planAmount === undefined) {
    return (
      <PageFrame title={t("invest.setHabit")} backHref="/habit" backLabel={t("invest.setHabit")}>
        <section className="card">
          <p className="text-sm leading-6 text-ink-soft">{t("invest.setHabitFirst")}</p>
          <Link href="/habit" className="btn btn-accent mt-4 inline-flex">
            {t("invest.setHabit")}
          </Link>
        </section>
        {profileId === "amina" || profileId === "brian" ? (
          <UssdAccess profileId={profileId} />
        ) : null}
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={t("invest.title")}
      backHref="/"
      backLabel={t("invest.backOverview")}
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
    </PageFrame>
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
