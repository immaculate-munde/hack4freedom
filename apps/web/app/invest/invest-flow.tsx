"use client";

import {
  maskPhone,
  parseDestination,
  toBitcoinCoKeLightningAddress,
  type OnRampPurchase,
  type OnRampStatus,
} from "@pesasense/wallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BreezWalletSetup } from "../../components/breez-wallet-setup";
import { useBreezWallet } from "../../contexts/breez-wallet-context";
import { HttpOnRamp } from "../../lib/http-onramp";

type Step = "choose" | "address" | "amount" | "confirm" | "status" | "done";

const ramp = new HttpOnRamp();

function kesForDisplay(purchase: OnRampPurchase, committedKes: number): number {
  return purchase.amountKes > 0 ? purchase.amountKes : committedKes;
}

function statusMessage(
  status: OnRampStatus,
  purchase: OnRampPurchase,
  sandbox: boolean,
  committedKes: number,
): string {
  const kes = kesForDisplay(purchase, committedKes);
  switch (status) {
    case "awaiting_mpesa":
      return sandbox
        ? "Sandbox: no M-Pesa prompt on your phone. Payment is simulated in a few seconds."
        : "Check your phone and enter your M-Pesa PIN.";
    case "sending_sats":
      return "M-Pesa paid. Sending your sats.";
    case "filled":
      return purchase.amountSats
        ? `You invested KES ${kes}. You got ${purchase.amountSats} sats.`
        : `You invested KES ${kes}.`;
    case "failed":
      return "The M-Pesa payment did not go through. No money left your account.";
    case "paid_not_delivered":
      return purchase.mpesaReceipt
        ? `M-Pesa took KES ${kes} but the sats did not arrive. Your receipt is ${purchase.mpesaReceipt}. Contact Bitika with it.`
        : `M-Pesa took KES ${kes} but the sats did not arrive. Contact Bitika with your M-Pesa receipt.`;
    case "cannot_fill":
      return purchase.reason ?? "Bitika cannot fill this right now. Try again later.";
    default:
      return "Working on your payment.";
  }
}

export function InvestFlow({
  surplusFloorKes,
  defaultAmountKes,
  sandbox,
}: {
  surplusFloorKes: number;
  defaultAmountKes: number;
  sandbox: boolean;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [address, setAddress] = useState("");
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [amountKes, setAmountKes] = useState(defaultAmountKes);
  const [phone, setPhone] = useState("");
  const [estimatedSats, setEstimatedSats] = useState<number | null>(null);
  const [purchase, setPurchase] = useState<OnRampPurchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [satsBoughtTotal, setSatsBoughtTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [withdrawHelpOpen, setWithdrawHelpOpen] = useState(false);
  const [copiedWithdraw, setCopiedWithdraw] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawDone, setWithdrawDone] = useState(false);
  const breezWallet = useBreezWallet();

  useEffect(() => {
    if (
      hasWallet === false &&
      breezWallet.status === "ready" &&
      breezWallet.lightningAddress
    ) {
      setAddress(breezWallet.lightningAddress);
      setAddressHint("Using your PesaSense wallet (Breez).");
      setHasWallet(true);
      setStep("amount");
    }
  }, [hasWallet, breezWallet.status, breezWallet.lightningAddress]);

  useEffect(() => {
    if (step === "done" && breezWallet.status === "ready") {
      void breezWallet.refreshBalance();
    }
  }, [step, breezWallet]);

  const maxKes = useMemo(
    () => Math.min(surplusFloorKes, 10_000),
    [surplusFloorKes],
  );

  const verifyAddress = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      parseDestination(address);
      const res = await fetch("/api/onramp/verify-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not verify address.");
      }
      setAddressHint(data.message as string);
      setStep("amount");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify address.");
    } finally {
      setBusy(false);
    }
  }, [address]);

  const loadQuote = useCallback(async () => {
    setError(null);
    if (amountKes < 10 || amountKes > maxKes) {
      setError(`Enter an amount between 10 and ${maxKes} KES.`);
      return;
    }
    setBusy(true);
    try {
      const quote = await ramp.getQuote({ amountKes });
      setEstimatedSats(quote.estimatedSats);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load a quote.");
    } finally {
      setBusy(false);
    }
  }, [amountKes, maxKes]);

  const mergePurchase = useCallback(
    (next: OnRampPurchase): OnRampPurchase => ({
      ...next,
      amountKes: next.amountKes > 0 ? next.amountKes : amountKes,
    }),
    [amountKes],
  );

  const startPurchase = useCallback(async () => {
    setError(null);
    setBusy(true);
    setStep("status");
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = mergePurchase(
        await ramp.startPurchase({
        amountKes,
        payerPhone: phone,
        destination: address.trim(),
        approvedByUser: true,
        idempotencyKey,
        surplusFloorKes,
      }),
      );
      setPurchase(result);
      if (!result.purchaseId) {
        throw new Error("Bitika did not return a transaction code. Try again.");
      }

      const terminal: OnRampStatus[] = [
        "filled",
        "failed",
        "paid_not_delivered",
        "cannot_fill",
      ];
      let current = result;
      let attempts = 0;
      while (!terminal.includes(current.status) && attempts < 60) {
        await new Promise((r) => setTimeout(r, 2000));
        current = mergePurchase(await ramp.checkStatus(current.purchaseId));
        setPurchase(current);
        attempts += 1;
      }

      if (current.status === "filled" && current.amountSats) {
        setSatsBoughtTotal((t: number) => t + current.amountSats!);
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed.");
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }, [address, amountKes, phone, surplusFloorKes, sandbox, mergePurchase]);

  const withdrawAddress = useMemo(() => {
    try {
      return toBitcoinCoKeLightningAddress(phone);
    } catch {
      return null;
    }
  }, [phone]);

  const openWithdrawHelp = useCallback(() => {
    if (!withdrawAddress) {
      setError("Enter your M-Pesa phone number on the amount step, then try again.");
      return;
    }
    setError(null);
    setWithdrawHelpOpen(true);
  }, [withdrawAddress]);

  const copyWithdrawAddress = useCallback(async () => {
    if (!withdrawAddress) {
      return;
    }
    try {
      await navigator.clipboard.writeText(withdrawAddress);
      setCopiedWithdraw(true);
      window.setTimeout(() => setCopiedWithdraw(false), 2500);
    } catch {
      setError("Could not copy. Select the address and copy it manually.");
    }
  }, [withdrawAddress]);

  const tryOpenWalletApp = useCallback(() => {
    if (!withdrawAddress) {
      return;
    }
    const link = document.createElement("a");
    link.href = `lightning:${withdrawAddress}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [withdrawAddress]);

  if (hasWallet === false) {
    return (
      <section className="card">
        <h2 className="font-serif text-2xl text-pine">We&apos;ve got you</h2>
        <p className="mt-3 text-sm leading-6 text-ink/80">
          Create a wallet here (non-custodial, powered by Breez). Your Bitika buys and
          M-Pesa withdraws use this wallet end to end.
        </p>
        <div className="mt-4">
          <BreezWalletSetup compact />
        </div>
        <button
          type="button"
          className="btn btn-ghost mt-4 w-full"
          onClick={() => {
            setHasWallet(true);
            setStep("address");
          }}
        >
          I use another wallet — paste Lightning address
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {sandbox ? (
        <p className="inline-flex rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brass uppercase">
          Sandbox payments
        </p>
      ) : null}

      {step === "choose" && (
        <section className="card">
          <h2 className="font-serif text-2xl text-pine">Invest in Bitcoin</h2>
          <p className="mt-2 text-sm text-ink/70">
            You could start from KES 10. Sats go to a wallet you control.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                setHasWallet(true);
                setStep("address");
              }}
            >
              Yes, I have a wallet
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => setHasWallet(false)}
            >
              No, I&apos;m new to Bitcoin
            </button>
          </div>
        </section>
      )}

      {step === "address" && (
        <section className="card">
          <h2 className="font-serif text-xl text-pine">Your Lightning address</h2>
          <p className="mt-2 text-sm text-ink/70">
            Paste the address from Blink, Wallet of Satoshi, or another wallet.
          </p>
          <input
            className="field mt-4"
            placeholder="name@blink.sv"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {addressHint ? (
            <p className="mt-2 text-xs text-moss">{addressHint}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => void verifyAddress()}
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </section>
      )}

      {step === "amount" && (
        <section className="card">
          <h2 className="font-serif text-xl text-pine">How much?</h2>
          <p className="mt-2 text-sm text-ink/70">
            Stay at or below your surplus floor ({surplusFloorKes} KES).
          </p>
          <label className="mt-4 block text-xs text-moss uppercase">Amount (KES)</label>
          <input
            type="number"
            min={10}
            max={maxKes}
            className="field mt-1"
            value={amountKes}
            onChange={(e) => setAmountKes(Number(e.target.value))}
          />
          <label className="mt-4 block text-xs text-moss uppercase">M-Pesa phone</label>
          <input
            className="field mt-1"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => void loadQuote()}
          >
            {busy ? "Loading quote…" : "Review"}
          </button>
        </section>
      )}

      {step === "confirm" && (
        <section className="card">
          <h2 className="font-serif text-xl text-pine">Confirm</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            <li>Pay: KES {amountKes}</li>
            <li>About: {estimatedSats ?? "…"} sats</li>
            <li>To: {address}</li>
            <li>Phone: {phone ? maskPhone(phone) : "…"}</li>
          </ul>
          <p className="mt-3 text-xs text-ink/60">
            Sats shown are an estimate before you pay. Live mode adds about 3% on Bitika.
            Education only, not financial advice.
          </p>
          <button
            type="button"
            className="btn btn-accent mt-4 w-full"
            disabled={busy}
            onClick={() => void startPurchase()}
          >
            {busy ? "Starting payment…" : "Approve and pay with M-Pesa"}
          </button>
        </section>
      )}

      {step === "status" && purchase && (
        <section className="card">
          <p className="text-sm text-ink/80">
            {statusMessage(purchase.status, purchase, sandbox, amountKes)}
          </p>
        </section>
      )}

      {step === "done" && purchase && (
        <section className="card">
          <p className="text-sm font-medium text-pine">
            {statusMessage(purchase.status, purchase, sandbox, amountKes)}
          </p>
          {satsBoughtTotal > 0 ? (
            <p className="mt-3 text-sm text-ink/70">
              Sats bought through PesaSense: {satsBoughtTotal} (not your full wallet
              balance).
            </p>
          ) : null}
          {breezWallet.status === "ready" && withdrawAddress ? (
            <button
              type="button"
              className="btn btn-primary mt-4 w-full"
              disabled={withdrawBusy || withdrawDone}
              onClick={() => {
                const sats = purchase.amountSats ?? satsBoughtTotal;
                if (!sats || sats <= 0) {
                  setError("No sats amount to withdraw.");
                  return;
                }
                if (breezWallet.balanceSats < sats) {
                  setError(
                    `Wallet balance is ${breezWallet.balanceSats} sats. Sandbox buys may not fund a real wallet — send sats to ${breezWallet.lightningAddress} or use a live Bitika buy.`,
                  );
                  return;
                }
                setError(null);
                setWithdrawBusy(true);
                void breezWallet
                  .withdrawSats(sats, withdrawAddress)
                  .then(() => {
                    setWithdrawDone(true);
                    setWithdrawHelpOpen(true);
                  })
                  .catch((e: unknown) => {
                    setError(e instanceof Error ? e.message : "Withdraw failed.");
                  })
                  .finally(() => setWithdrawBusy(false));
              }}
            >
              {withdrawBusy
                ? "Sending to bitcoin.co.ke…"
                : withdrawDone
                  ? "Withdraw sent"
                  : "Withdraw to M-Pesa (in app)"}
            </button>
          ) : null}

          <button
            type="button"
            className={`btn btn-secondary mt-4 w-full ${breezWallet.status === "ready" ? "" : ""}`}
            onClick={openWithdrawHelp}
          >
            {breezWallet.status === "ready"
              ? "Withdraw help / external wallet"
              : "Withdraw to M-Pesa"}
          </button>

          {withdrawHelpOpen && withdrawAddress ? (
            <div className="mt-4 rounded-2xl border border-sand bg-paper/80 p-4 text-sm text-ink/80">
              <p className="font-medium text-pine">Send from your Lightning wallet</p>
              <p className="mt-2 leading-6">
                On this computer, the browser often cannot open a wallet app. Copy this
                address and paste it in Send in Wallet of Satoshi, Blink, or your other
                wallet.
              </p>
              <p className="mt-3 break-all rounded-xl bg-sand/60 px-3 py-2 font-mono text-xs">
                {withdrawAddress}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn btn-primary w-full sm:flex-1"
                  onClick={() => void copyWithdrawAddress()}
                >
                  {copiedWithdraw ? "Copied" : "Copy address"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary w-full sm:flex-1"
                  onClick={tryOpenWalletApp}
                >
                  Try wallet app
                </button>
              </div>
              {withdrawDone ? (
                <p className="mt-3 text-xs leading-5 text-moss">
                  Payment submitted from your PesaSense wallet. KES should arrive on M-Pesa
                  after bitcoin.co.ke settles (check your wallet balance:{" "}
                  {breezWallet.balanceSats} sats).
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-ink/60">
                  Pay about {purchase.amountSats ?? satsBoughtTotal} sats to this address.
                  bitcoin.co.ke converts to KES on your M-Pesa (about 1% fee). If nothing
                  opens when you tap Try wallet app, use Copy address instead.
                </p>
              )}
            </div>
          ) : null}
        </section>
      )}

      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
