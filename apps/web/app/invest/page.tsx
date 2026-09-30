import { demoProfiles } from "@pesasense/core";
import Link from "next/link";
import { bitikaMode } from "../../lib/bitika";
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
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:px-8">
        <Link href="/" className="btn btn-ghost">Back</Link>
        <h1 className="mt-4 font-serif text-3xl text-pine">Not ready yet</h1>
        <p className="mt-3 text-sm text-ink/80">
          Build your buffer first. Bitcoin comes after your emergency cushion.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:px-8">
      <Link href="/" className="btn btn-ghost">Back to surplus</Link>
      <h1 className="mt-4 font-serif text-3xl text-pine">Invest</h1>
      <p className="mt-2 text-sm text-ink/70">
        Demo profile: {demoId === "brian" ? "Brian" : "Amina"} (invented).
      </p>
      <div className="mt-6">
        <InvestFlow
          surplusFloorKes={floor}
          defaultAmountKes={planAmount}
          sandbox={mode === "sandbox"}
        />
      </div>
      {mode === "missing" ? (
        <p className="mt-4 text-xs text-red-800">
          Set BITIKA_API_KEY in apps/web/.env.local to run purchases.
        </p>
      ) : null}
    </main>
  );
}
