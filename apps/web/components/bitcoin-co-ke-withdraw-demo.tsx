"use client";

import { toBitcoinCoKeLightningAddress } from "@pesasense/wallet";
import { useMemo, useState } from "react";
import { useFormat, useI18n } from "../contexts/language-context";
import { useActiveProfile } from "../lib/use-active-profile";
import { WithdrawModal } from "./withdraw-modal";

const DEMO_PHONE = "0712345678";
const DEMO_SATS = 12_500;

/** Judge-friendly walkthrough of the M-Pesa off-ramp via bitcoin.co.ke (no live payment). */
export function BitcoinCoKeWithdrawDemo() {
  const { t } = useI18n();
  const { number } = useFormat();
  const active = useActiveProfile();
  const [open, setOpen] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const demoAddress = useMemo(() => toBitcoinCoKeLightningAddress(DEMO_PHONE), []);

  const showAminaDemo =
    active.ready && active.isDemo && active.profileId === "amina";

  if (!showAminaDemo) {
    return null;
  }

  return (
    <section className="card mt-4">
      <h2 className="font-serif text-xl text-pine">{t("wallet.withdrawDemo.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{t("wallet.withdrawDemo.body")}</p>
      <p className="mt-3 rounded-2xl bg-pearl px-4 py-3 font-mono text-sm text-pine">{demoAddress}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn btn-secondary flex-1"
          onClick={() => {
            setSimulated(false);
            setOpen(true);
          }}
        >
          {t("wallet.withdrawDemo.open")}
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={() => {
            setSimulated(true);
            setOpen(true);
          }}
        >
          {t("wallet.withdrawDemo.simulateSuccess")}
        </button>
      </div>
      <WithdrawModal
        isOpen={open}
        onClose={() => setOpen(false)}
        withdrawAddress={demoAddress}
        withdrawDone={simulated}
        balanceSats={DEMO_SATS}
        amountSats={DEMO_SATS}
      />
      <p className="mt-3 text-xs text-slate">{t("wallet.withdrawDemo.note", { sats: number(DEMO_SATS) })}</p>
    </section>
  );
}
