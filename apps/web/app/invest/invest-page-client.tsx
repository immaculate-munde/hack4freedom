"use client";

import { Suspense } from "react";
import Link from "next/link";
import { appInvestAllowance } from "../../lib/buffer-gate";
import { PageFrame } from "../../components/page-frame";
import { ProfileRequired } from "../../components/profile-required";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { useActiveProfile } from "../../lib/use-active-profile";
import { InvestFlow } from "./invest-flow";

function InvestPageContent({ bitikaMode: mode }: { bitikaMode: "sandbox" | "live" | "missing" }) {
  const active = useActiveProfile();

  if (!active.ready) {
    return (
      <PageFrame title="Invest" backHref="/" backLabel="Back to overview">
        <ProfileRequired />
      </PageFrame>
    );
  }

  const { profile, profileId, isDemo } = active;
  const allowance = appInvestAllowance(profile);
  const planAmount = profile.investmentPlan?.amountKes;
  const hasPlan = typeof planAmount === "number" && planAmount > 0;

  if (!allowance.ok) {
    return (
      <PageFrame title="Not ready yet" backHref="/" backLabel="Back to overview">
        <section className="card">
          <p className="text-sm leading-6 text-ink/80">{allowance.reason}</p>
        </section>
        {profileId === "amina" || profileId === "brian" ? (
          <UssdAccess profileId={profileId} />
        ) : null}
      </PageFrame>
    );
  }

  if (!hasPlan || planAmount === undefined) {
    return (
      <PageFrame title="Set the habit" backHref="/habit" backLabel="Set the habit">
        <section className="card">
          <p className="text-sm leading-6 text-ink/80">
            Save a habit amount first. A purchase waits until you review and approve it.
            Nothing is sent on its own.
          </p>
          <Link href="/habit" className="btn btn-accent mt-4 inline-flex">
            Set the habit
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
      title="Invest"
      backHref="/"
      backLabel="Back to overview"
      description={
        isDemo
          ? `Demo profile (${active.displayName}, invented).`
          : "Amounts use your imported profile on this phone."
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
        <p className="mt-4 text-xs text-red-800">
          Set BITIKA_API_KEY in apps/web/.env.local to run purchases.
        </p>
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
