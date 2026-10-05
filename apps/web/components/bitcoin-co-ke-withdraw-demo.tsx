"use client";

import { toBitcoinCoKeLightningAddress } from "@pesasense/wallet";
import { useMemo, useState } from "react";
import { useFormat, useI18n } from "../contexts/language-context";
import { WithdrawModal } from "./withdraw-modal";

/** Judge-friendly walkthrough of the M-Pesa off-ramp via bitcoin.co.ke (no live payment). */
export function BitcoinCoKeWithdrawDemo() {
  const { t } = useI18n();
  const { number } = useFormat();
  const [open, setOpen] = useState(false);
  const demoAddress = useMemo(() => toBitcoinCoKeLightningAddress("0712345678"), []);
  const demoSats = 12_500;

  return (
    <section className="card mt-4">
      <h2 className="font-serif text-xl text-pine">{t("wallet.withdrawDemo.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{t("wallet.withdrawDemo.body")}</p>
      <p className="mt-3 rounded-2xl bg-pearl px-4 py-3 font-mono text-sm text-pine">{demoAddress}</p>
      <button type="button" className="btn btn-secondary mt-4 w-full sm:w-auto" onClick={() => setOpen(true)}>
        {t("wallet.withdrawDemo.open")}
      </button>
      <WithdrawModal
        isOpen={open}
        onClose={() => setOpen(false)}
        withdrawAddress={demoAddress}
        withdrawDone={false}
        balanceSats={demoSats}
        amountSats={demoSats}
      />
      <p className="mt-3 text-xs text-slate">{t("wallet.withdrawDemo.note", { sats: number(demoSats) })}</p>
    </section>
  );
}
