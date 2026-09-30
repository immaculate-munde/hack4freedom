"use client";

import Link from "next/link";
import { BreezWalletSetup } from "../../components/breez-wallet-setup";
import { useBreezWallet } from "../../contexts/breez-wallet-context";

export default function WalletPage() {
  const wallet = useBreezWallet();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:px-8">
      <Link href="/" className="btn btn-ghost">Back</Link>
      <h1 className="mt-4 font-serif text-3xl text-pine">Your wallet</h1>
      <p className="mt-2 text-sm text-ink/70">
        Powered by Breez SDK Spark. Keys stay on this device.
      </p>

      <div className="mt-6">
        <BreezWalletSetup />
      </div>

      {wallet.status === "ready" ? (
        <section className="mt-6 rounded-3xl border border-sand bg-white/70 p-6 text-sm">
          <h2 className="font-serif text-xl text-pine">Withdraw to M-Pesa</h2>
          <p className="mt-2 leading-6 text-ink/70">
            Send sats to your <code className="text-xs">07…@bitcoin.co.ke</code> address from
            Invest after you enter your M-Pesa number, or use Invest when your buy completes.
          </p>
          <p className="mt-3 font-medium text-pine">Balance: {wallet.balanceSats} sats</p>
          <Link href="/invest" className="btn btn-secondary mt-4 inline-flex">
            Go to Invest
          </Link>
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            onClick={() => void wallet.signOutWallet()}
          >
            Sign out (clears phrase from this browser)
          </button>
        </section>
      ) : null}
    </main>
  );
}
