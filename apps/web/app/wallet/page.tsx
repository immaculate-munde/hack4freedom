"use client";

import Link from "next/link";
import { BreezWalletSetup } from "../../components/breez-wallet-setup";
import { PageFrame } from "../../components/page-frame";
import { useBreezWallet } from "../../contexts/breez-wallet-context";

export default function WalletPage() {
  const wallet = useBreezWallet();

  return (
    <PageFrame
      title="Your wallet"
      backHref="/"
      description="Powered by Breez SDK Spark. Keys stay on this device."
      aside={
        wallet.status === "ready" ? (
          <section className="card text-sm">
            <h2 className="font-serif text-lg text-pine">Balance</h2>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-pine">
              {wallet.balanceSats}
              <span className="ml-1 text-sm font-normal text-ink/60">sats</span>
            </p>
            <Link href="/invest" className="btn btn-primary mt-4 inline-flex w-full justify-center">
              Invest
            </Link>
          </section>
        ) : null
      }
    >
      <BreezWalletSetup />

      {wallet.status === "ready" ? (
        <section className="card mt-4 text-sm lg:mt-0">
          <h2 className="font-serif text-xl text-pine">Withdraw to M-Pesa</h2>
          <p className="mt-2 leading-6 text-ink/70">
            After a buy, use <strong>Withdraw to M-Pesa (in app)</strong> on Invest. We send
            from this wallet to your <code className="text-xs">07…@bitcoin.co.ke</code> address.
          </p>
          <p className="mt-3 font-medium text-pine lg:hidden">
            Balance: {wallet.balanceSats} sats
          </p>
          <button
            type="button"
            className="btn btn-ghost mt-4 w-full sm:w-auto"
            onClick={() => void wallet.signOutWallet()}
          >
            Sign out (clears phrase from this browser)
          </button>
        </section>
      ) : null}
    </PageFrame>
  );
}
