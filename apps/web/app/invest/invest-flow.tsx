"use client";

import {
  walletEventFromPurchase,
  type FinancialProfile,
  type RecordedPurchaseStatus,
  type WalletEvent,
} from "@pesasense/core";
import {
  parseDestination,
  toBitcoinCoKeLightningAddress,
  type OnRampPurchase,
  type OnRampStatus,
} from "@pesasense/wallet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BreezWalletSetup } from "../../components/breez-wallet-setup";
import { WithdrawModal } from "../../components/withdraw-modal";
import { BitikaPurchaseModal } from "../../components/bitika-purchase-modal";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useBreezWallet } from "../../contexts/breez-wallet-context";
import { messageFromApi, type ApiErrorBody } from "../../lib/api-message";
import { HttpOnRamp } from "../../lib/http-onramp";
import { isOnline } from "../../lib/network";
import type { Locale, TranslateVars } from "../../lib/i18n";
import {
  latestSubmittedPurchase,
  loadWalletEvents,
  replaceWalletEvent,
  upsertWalletEvent,
} from "../../lib/wallet-events";

type Step = "choose" | "address" | "amount" | "confirm" | "status" | "pending" | "done";
type TFn = (key: string, vars?: TranslateVars) => string;

const TERMINAL: OnRampStatus[] = ["filled", "failed", "paid_not_delivered", "cannot_fill"];

const ramp = new HttpOnRamp();

const INVEST_ERRORS: Record<string, string> = {
  "Could not read the payment.": "invest.statusReadFailed",
  "Could not verify address.": "invest.verifyFailed",
  "Could not load a quote.": "invest.quoteFailed",
  "Could not fetch a quote.": "invest.fetchQuoteFailed",
  "Bitika did not return a transaction code. Try again.": "invest.noTxCode",
  "Purchase failed.": "invest.purchaseFailed",
  "Could not start the purchase.": "invest.startPurchaseFailed",
  "Could not read purchase status.": "invest.statusFailed",
  "Enter a Lightning address.": "invest.enterAddress",
  "Enter a Lightning address or invoice.": "invest.enterAddressOrInvoice",
  "This does not look like a Lightning address (name@wallet.com) or an invoice.": "invest.badDestination",
  "We could not find this wallet. Check the Lightning address and try again.": "invest.walletNotFound",
  "Destination format looks valid.": "invest.destinationValid",
  "Purchase must be approved by the user.": "invest.purchaseNotApproved",
  "Purchase must be explicitly approved by the user.": "invest.explicitApproval",
  "amountKes must be a whole number.": "invest.wholeNumber",
  "Demo profiles are disabled. Import M-Pesa messages and try again.": "invest.demoDisabled",
  "Missing profile. Import your M-Pesa history on this phone.": "invest.missingProfile",
  "This amount is not allowed.": "invest.amountNotAllowed",
  "Missing purchase fields.": "invest.missingFields",
  "Missing transaction code.": "invest.missingTxCode",
  "Missing transaction code for status check.": "invest.missingTxForStatus",
  "Bitika returned an invalid transaction payload.": "invest.invalidPayload",
  "Bitika did not return a transaction code.": "invest.noTxCodeShort",
  "Phone number must be a Kenyan M-Pesa number.": "invest.phoneKenyan",
  "Phone number does not look valid.": "invest.phoneInvalid",
  "Live Bitika key is blocked in this environment. Use bk_test_ locally or set BITIKA_ALLOW_LIVE=true only in production.":
    "invest.liveKeyBlocked",
  "Bitika is short of Bitcoin right now. Nothing was charged. Try again in a few minutes.":
    "invest.bitikaShort",
  "Bitika refused this key (403). Live keys need Bitika approval, active status, and no IP allowlist blocking your server.":
    "invest.bitika403",
  "Bitika refused the M-Pesa collect (400). On live keys, confirm approval in the Bitika dashboard, use a real Safaricom number, and a valid Lightning address. Quotes can still work when collect does not.":
    "invest.bitika400",
  "Bitika rejected the API key (401). Check BITIKA_API_KEY in apps/web/.env.local and restart the dev server.":
    "invest.bitika401",
  "Bitika rate limit (429). Wait a moment and try again.": "invest.bitika429",
  "Build a buffer before buying Bitcoin.": "invest.bufferFirst",
  "The surplus floor is too small for a buy.": "invest.floorTooSmall",
  "Enter a positive sats amount.": "walletSetup.positiveSats",
  "Unlock your PesaSense wallet first.": "walletSetup.unlockFirst",
  "Could not open wallet.": "walletSetup.openFailed",
  "Withdraw failed.": "invest.withdrawFailed",
  "No sats amount to withdraw.": "invest.noSats",
  "NEXT_PUBLIC_BREEZ_API_KEY is missing. Request a free key at breez.technology and add it to apps/web/.env.local.":
    "walletSetup.missingKeyDetail",
};

function mapInvestMessage(t: TFn, message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (!/\s/.test(trimmed)) {
    const translated = t(trimmed);
    if (translated !== trimmed) return translated;
  }
  const key = INVEST_ERRORS[trimmed];
  if (key) return t(key);
  const between = trimmed.match(/^Amount must be between (\d+) and (\d+) KES\.$/);
  if (between?.[1] && between[2]) {
    return t("invest.amountBetween", { min: between[1], max: between[2] });
  }
  const satsAt = trimmed.match(/^Sats will go to a wallet at (.+)\.$/);
  if (satsAt?.[1]) return t("invest.satsGoTo", { domain: satsAt[1] });
  return null;
}

function explainCaught(t: TFn, error: unknown, fallbackKey: string): string {
  if (error instanceof Error) {
    const mapped = mapInvestMessage(t, error.message);
    if (mapped) return mapped;
  }
  return t(fallbackKey);
}

function explainApi(locale: Locale, t: TFn, body: ApiErrorBody | null | undefined, fallbackKey: string): string {
  if (body?.code) {
    const translated = messageFromApi(locale, body, fallbackKey);
    if (translated !== body.code) return translated;
  }
  if (typeof body?.error === "string") {
    const mapped = mapInvestMessage(t, body.error);
    if (mapped) return mapped;
  }
  return t(fallbackKey);
}

function kesForDisplay(purchase: OnRampPurchase, committedKes: number): number {
  return purchase.amountKes > 0 ? purchase.amountKes : committedKes;
}

export function InvestFlow({
  profileId,
  profile,
  surplusFloorKes,
  defaultAmountKes,
  sandbox,
}: {
  profileId: string;
  profile?: FinancialProfile;
  surplusFloorKes: number;
  defaultAmountKes: number;
  sandbox: boolean;
}) {
  const { t, locale } = useI18n();
  const { kes, number } = useFormat();
  const [step, setStep] = useState<Step>("choose");
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [address, setAddress] = useState("");
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [amountKes, setAmountKes] = useState(defaultAmountKes);
  const [phone, setPhone] = useState("");
  const [estimatedSats, setEstimatedSats] = useState<number | null>(null);
  const [purchase, setPurchase] = useState<OnRampPurchase | null>(null);
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withdrawHelpOpen, setWithdrawHelpOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawDone, setWithdrawDone] = useState(false);
  const breezWallet = useBreezWallet();
  const quoteEventId = useRef<string | null>(null);
  const following = useRef(false);
  const resumed = useRef(false);
  const satsBoughtTotal = events.reduce(
    (sum, event) => (event.status === "filled" ? sum + (event.amountSats ?? 0) : sum),
    0,
  );

  const describeStatus = useCallback(
    (status: OnRampStatus, current: OnRampPurchase, committedKes: number): string => {
      const amount = kes(kesForDisplay(current, committedKes));
      switch (status) {
        case "awaiting_mpesa":
          return sandbox ? t("invest.sandboxAwaiting") : t("invest.checkPhone");
        case "sending_sats":
          return t("invest.sendingSats");
        case "filled":
          return current.amountSats
            ? t("invest.investedWithSats", { kes: amount, sats: number(current.amountSats) })
            : t("invest.invested", { kes: amount });
        case "failed":
          return t("invest.mpesaFailed");
        case "paid_not_delivered":
          return current.mpesaReceipt
            ? t("invest.paidNotDeliveredReceipt", { kes: amount, receipt: current.mpesaReceipt })
            : t("invest.paidNotDelivered", { kes: amount });
        case "cannot_fill": {
          if (current.reason) {
            const mapped = mapInvestMessage(t, current.reason);
            if (mapped) return mapped;
          }
          return t("invest.cannotFill");
        }
        default:
          return t("invest.working");
      }
    },
    [kes, number, sandbox, t],
  );

  const recordProgress = useCallback(
    (
      id: string,
      progress: RecordedPurchaseStatus,
      details: {
        amountKes: number;
        amountSats?: number;
        destination: string;
        approvedByUser: boolean;
      },
      previousId?: string | null,
    ) => {
      const event = walletEventFromPurchase({
        id,
        at: new Date().toISOString(),
        amountKes: details.amountKes,
        amountSats: details.amountSats,
        destination: details.destination,
        progress,
        approvedByUser: details.approvedByUser,
      });
      setEvents(
        previousId
          ? replaceWalletEvent(profileId, previousId, event)
          : upsertWalletEvent(profileId, event),
      );
    },
    [profileId],
  );

  const followPurchase = useCallback(
    async (initial: OnRampPurchase, committedKes: number, destination: string) => {
      if (following.current || !initial.purchaseId) return;
      following.current = true;
      setBusy(true);
      setStep("status");
      setError(null);
      try {
        let current: OnRampPurchase = {
          ...initial,
          amountKes: initial.amountKes > 0 ? initial.amountKes : committedKes,
        };
        setPurchase(current);
        recordProgress(current.purchaseId, current.status, {
          amountKes: current.amountKes,
          amountSats: current.amountSats,
          destination,
          approvedByUser: true,
        });
        let attempts = 0;
        while (!TERMINAL.includes(current.status) && attempts < 60) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const next = await ramp.checkStatus(current.purchaseId);
          current = {
            ...next,
            amountKes: next.amountKes > 0 ? next.amountKes : committedKes,
          };
          setPurchase(current);
          recordProgress(current.purchaseId, current.status, {
            amountKes: current.amountKes,
            amountSats: current.amountSats,
            destination,
            approvedByUser: true,
          });
          attempts += 1;
        }
        setStep(TERMINAL.includes(current.status) ? "done" : "pending");
      } catch (e) {
        setError(explainCaught(t, e, "invest.statusReadFailed"));
        setStep("pending");
      } finally {
        following.current = false;
        setBusy(false);
      }
    },
    [recordProgress, t],
  );

  useEffect(() => {
    const stored = loadWalletEvents(profileId);
    setEvents(stored);
    const pending = latestSubmittedPurchase(profileId);
    if (!pending) return;
    resumed.current = true;
    const committed = pending.amountKes ?? defaultAmountKes;
    const destination = pending.destination ?? "";
    if (pending.amountKes) setAmountKes(pending.amountKes);
    if (destination) setAddress(destination);
    void followPurchase(
      {
        purchaseId: pending.id,
        status: "awaiting_mpesa",
        amountKes: committed,
        amountSats: pending.amountSats,
      },
      committed,
      destination,
    );
  }, [profileId, defaultAmountKes, followPurchase]);

  useEffect(() => {
    if (resumed.current || step === "status" || step === "pending" || step === "done") {
      return;
    }
    if (
      hasWallet === false &&
      breezWallet.status === "ready" &&
      breezWallet.lightningAddress
    ) {
      setAddress(breezWallet.lightningAddress);
      setAddressHint(t("invest.usingBreez"));
      setHasWallet(true);
      setStep("amount");
    }
  }, [hasWallet, step, breezWallet.status, breezWallet.lightningAddress, t]);

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
    if (!isOnline()) {
      setError(t("common.offlineAction"));
      return;
    }
    setBusy(true);
    try {
      parseDestination(address);
      const res = await fetch("/api/onramp/verify-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as ApiErrorBody & { message?: string };
      if (!res.ok) {
        setError(explainApi(locale, t, data, "invest.verifyFailed"));
        return;
      }
      const hint =
        typeof data.message === "string" ? mapInvestMessage(t, data.message) : null;
      setAddressHint(hint ?? t("invest.destinationValid"));
      setStep("amount");
    } catch (e) {
      setError(explainCaught(t, e, "invest.verifyFailed"));
    } finally {
      setBusy(false);
    }
  }, [address, locale, t]);

  const loadQuote = useCallback(async () => {
    setError(null);
    if (!isOnline()) {
      setError(t("common.offlineAction"));
      return;
    }
    if (amountKes < 10 || amountKes > maxKes) {
      setError(t("invest.amountRange", { min: number(10), max: number(maxKes) }));
      return;
    }
    setBusy(true);
    try {
      const quote = await ramp.getQuote({ amountKes });
      setEstimatedSats(quote.estimatedSats);
      const id = crypto.randomUUID();
      quoteEventId.current = id;
      recordProgress(id, "quoted", {
        amountKes,
        amountSats: quote.estimatedSats,
        destination: address.trim(),
        approvedByUser: false,
      });
      setStep("confirm");
    } catch (e) {
      setError(explainCaught(t, e, "invest.quoteFailed"));
    } finally {
      setBusy(false);
    }
  }, [address, amountKes, maxKes, number, recordProgress, t]);

  const startPurchase = useCallback(async () => {
    if (following.current) return;
    setError(null);
    if (!isOnline()) {
      setError(t("common.offlineAction"));
      return;
    }
    setBusy(true);
    setStep("status");
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await ramp.startPurchase({
        amountKes,
        payerPhone: phone,
        destination: address.trim(),
        approvedByUser: true,
        idempotencyKey,
        profileId,
        ...(profile ? { profile } : {}),
      });
      if (!result.purchaseId) {
        throw new Error("invest.noTxCode");
      }
      const quoteId = quoteEventId.current;
      quoteEventId.current = null;
      if (quoteId) {
        recordProgress(
          result.purchaseId,
          result.status,
          {
            amountKes: result.amountKes > 0 ? result.amountKes : amountKes,
            amountSats: result.amountSats,
            destination: address.trim(),
            approvedByUser: true,
          },
          quoteId,
        );
      }
      await followPurchase(result, amountKes, address.trim());
    } catch (e) {
      setError(explainCaught(t, e, "invest.purchaseFailed"));
      setStep("confirm");
      setBusy(false);
    }
  }, [address, amountKes, followPurchase, phone, profile, profileId, recordProgress, t]);

  const withdrawAddress = useMemo(() => {
    try {
      return toBitcoinCoKeLightningAddress(phone);
    } catch {
      return null;
    }
  }, [phone]);

  const openWithdrawHelp = useCallback(() => {
    if (!withdrawAddress) {
      setError(t("invest.needPhone"));
      return;
    }
    setError(null);
    setWithdrawHelpOpen(true);
  }, [t, withdrawAddress]);

  if (hasWallet === false) {
    return (
      <section className="card">
        <h2 className="font-serif text-2xl text-pine">{t("invest.gotYou")}</h2>
        <p className="mt-3 text-sm leading-6 text-ink/80">{t("invest.createWalletBody")}</p>
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
          {t("invest.pasteOther")}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {sandbox ? (
        <p className="inline-flex rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brass uppercase">
          {t("invest.sandboxPayments")}
        </p>
      ) : null}

      {step === "choose" && (
        <section className="card">
          <h2 className="font-serif text-2xl text-pine">{t("invest.investBitcoin")}</h2>
          <p className="mt-2 text-sm text-ink/70">{t("invest.startFrom")}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                setHasWallet(true);
                setStep("address");
              }}
            >
              {t("invest.haveWallet")}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => setHasWallet(false)}
            >
              {t("invest.newToBitcoin")}
            </button>
          </div>
        </section>
      )}

      {step === "address" && (
        <section className="card">
          <h2 className="font-serif text-xl text-pine">{t("invest.yourAddress")}</h2>
          <p className="mt-2 text-sm text-ink/70">{t("invest.pasteAddress")}</p>
          <input
            className="field mt-4"
            placeholder={t("invest.addressPlaceholder")}
            aria-label={t("invest.yourAddress")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {addressHint ? <p className="mt-2 text-xs text-moss">{addressHint}</p> : null}
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => void verifyAddress()}
          >
            {busy ? t("invest.checking") : t("common.continue")}
          </button>
        </section>
      )}

      {step === "amount" && (
        <section className="card">
          <h2 className="font-serif text-xl text-pine">{t("invest.howMuch")}</h2>
          <p className="mt-2 text-sm text-ink/70">
            {t("invest.stayBelow", { amount: kes(surplusFloorKes) })}
          </p>
          <label className="mt-4 block text-xs text-moss uppercase">{t("invest.amountLabel")}</label>
          <input
            type="number"
            min={10}
            max={maxKes}
            className="field mt-1"
            value={amountKes}
            onChange={(e) => setAmountKes(Number(e.target.value))}
          />
          <label className="mt-4 block text-xs text-moss uppercase">{t("invest.phoneLabel")}</label>
          <input
            className="field mt-1"
            placeholder={t("invest.phonePlaceholder")}
            aria-label={t("invest.phoneLabel")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => void loadQuote()}
          >
            {busy ? t("invest.loadingQuote") : t("invest.review")}
          </button>
        </section>
      )}

      <BitikaPurchaseModal
        isOpen={step === "confirm" || step === "status"}
        onClose={() => setStep("amount")}
        kesAmount={amountKes}
        estimatedSats={estimatedSats}
        phone={phone}
        address={address}
        status={
          step === "status"
            ? purchase?.status === "filled"
              ? "success"
              : purchase?.status === "failed" ||
                  purchase?.status === "cannot_fill" ||
                  purchase?.status === "paid_not_delivered"
                ? "error"
                : "polling"
            : "confirm"
        }
        errorMessage={purchase ? describeStatus(purchase.status, purchase, amountKes) : null}
        onApprove={() => void startPurchase()}
        busy={busy}
      />

      {step === "pending" && purchase && (
        <section className="card">
          <p className="text-sm text-ink/80">{t("invest.pendingBody")}</p>
          <p className="mt-2 text-xs text-ink/60">
            {t("invest.reference", { id: purchase.purchaseId })}
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => void followPurchase(purchase, amountKes, address.trim())}
          >
            {busy ? t("invest.checking") : t("invest.checkAgain")}
          </button>
        </section>
      )}

      {step === "done" && purchase && (
        <section className="card">
          <p className="text-sm font-medium text-pine">
            {describeStatus(purchase.status, purchase, amountKes)}
          </p>
          {satsBoughtTotal > 0 ? (
            <p className="mt-3 text-sm text-ink/70">
              {t("invest.satsBought", { sats: number(satsBoughtTotal) })}
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
                  setError(t("invest.noSats"));
                  return;
                }
                if (breezWallet.balanceSats < sats) {
                  setError(
                    t("invest.balanceShort", {
                      balance: number(breezWallet.balanceSats),
                      address: breezWallet.lightningAddress ?? "",
                    }),
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
                    setError(explainCaught(t, e, "invest.withdrawFailed"));
                  })
                  .finally(() => setWithdrawBusy(false));
              }}
            >
              {withdrawBusy
                ? t("invest.sendingBitcoinCo")
                : withdrawDone
                  ? t("invest.withdrawSent")
                  : t("invest.withdrawInApp")}
            </button>
          ) : null}

          <button
            type="button"
            className={`btn btn-secondary mt-4 w-full ${breezWallet.status === "ready" ? "" : ""}`}
            onClick={openWithdrawHelp}
          >
            {breezWallet.status === "ready" ? t("invest.withdrawHelp") : t("invest.withdrawMpesa")}
          </button>

          <WithdrawModal
            isOpen={withdrawHelpOpen && Boolean(withdrawAddress)}
            onClose={() => setWithdrawHelpOpen(false)}
            withdrawAddress={withdrawAddress ?? ""}
            withdrawDone={withdrawDone}
            balanceSats={breezWallet.status === "ready" ? breezWallet.balanceSats : undefined}
            amountSats={purchase.amountSats ?? satsBoughtTotal}
          />
        </section>
      )}

      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
