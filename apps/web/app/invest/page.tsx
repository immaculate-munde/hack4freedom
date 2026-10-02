import { demoProfiles } from "@pesasense/core";
import { PageFrame } from "../../components/page-frame";
import { bitikaMode } from "../../lib/bitika";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { InvestFlow } from "./invest-flow";

export default async function InvestPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const params = await searchParams;
  const demoId = params.profile === "brian" ? "brian" : "amina";
  const profile = demoProfiles[demoId];
  const floor = profile.surplus.monthlyKes.floor;
  const planAmount = profile.investmentPlan?.amountKes ?? Math.min(floor, 500);
  const mode = bitikaMode();

  if (profile.resilience.bufferFirst || floor < 10) {
    return (
      <PageFrame title="Not ready yet" backHref="/" backLabel="Back to surplus">
        <section className="card">
          <p className="text-sm leading-6 text-ink/80">
            Build your buffer first. Bitcoin comes after your emergency cushion.
          </p>
        </section>
        <UssdAccess profileId={demoId} />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Invest"
      backHref="/"
      backLabel="Back to surplus"
      description={`Demo profile: ${demoId === "brian" ? "Brian" : "Amina"} (invented).`}
    >
      <InvestFlow
        profileId={demoId}
        surplusFloorKes={floor}
        defaultAmountKes={planAmount}
        sandbox={mode === "sandbox"}
      />
      <WalletActivity profileId={demoId} />
      <UssdAccess profileId={demoId} />
      {mode === "missing" ? (
        <p className="mt-4 text-xs text-red-800">
          Set BITIKA_API_KEY in apps/web/.env.local to run purchases.
        </p>
      ) : null}
    </PageFrame>
  );
}
