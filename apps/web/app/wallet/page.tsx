"use client";

import Link from "next/link";
import { BreezWalletSetup } from "../../components/breez-wallet-setup";
import { PageFrame } from "../../components/page-frame";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useBreezWallet } from "../../contexts/breez-wallet-context";

export default function WalletPage() {
  const wallet = useBreezWallet();
  const { t } = useI18n();
  const { number } = useFormat();

  return (
    <PageFrame
      title={t("wallet.title")}
      backHref="/"
      description={t("wallet.description")}
      aside={
        wallet.status === "ready" ? (
          <section className="card text-sm">
            <h2 className="font-serif text-lg text-pine">{t("wallet.balance")}</h2>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-pine">
              {number(wallet.balanceSats)}
              <span className="ml-1 text-sm font-normal text-ink/60">sats</span>
            </p>
            <Link href="/invest" className="btn btn-primary mt-4 inline-flex w-full justify-center">
              {t("common.titles.invest")}
            </Link>
          </section>
        ) : null
      }
    >
      <BreezWalletSetup />

      {wallet.status === "ready" ? (
        <section className="card mt-4 text-sm lg:mt-0">
          <h2 className="font-serif text-xl text-pine">{t("wallet.withdrawTitle")}</h2>
          <p className="mt-2 leading-6 text-ink/70">
            {t("wallet.withdrawLead")}
            <strong>{t("invest.withdrawInApp")}</strong>
            {t("wallet.withdrawTrail")}
            <code className="text-xs">07…@bitcoin.co.ke</code>
            {t("wallet.withdrawEnd")}
          </p>
          <p className="mt-3 font-medium text-pine lg:hidden">
            {t("wallet.balanceLine", { sats: number(wallet.balanceSats) })}
          </p>
          <button
            type="button"
            className="btn btn-ghost mt-4 w-full sm:w-auto"
            onClick={() => void wallet.signOutWallet()}
          >
            {t("wallet.signOut")}
          </button>
        </section>
      ) : null}
    </PageFrame>
  );
}
