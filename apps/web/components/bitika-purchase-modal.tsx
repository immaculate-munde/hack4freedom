"use client";

import { maskPhone } from "@pesasense/wallet";
import { useFormat, useI18n } from "../contexts/language-context";

export type BitikaPurchaseStatus = "confirm" | "polling" | "success" | "error";

export interface BitikaPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  kesAmount: number;
  estimatedSats: number | null;
  phone: string;
  address: string;
  status: BitikaPurchaseStatus;
  errorMessage?: string | null;
  onApprove: () => void;
  busy?: boolean;
}

export function BitikaPurchaseModal({
  isOpen,
  onClose,
  kesAmount,
  estimatedSats,
  phone,
  address,
  status,
  errorMessage,
  onApprove,
  busy = false,
}: BitikaPurchaseModalProps) {
  const { t } = useI18n();
  const { kes, number } = useFormat();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("invest.purchase.aria")}
      className="fixed inset-0 z-[50]"
    >
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={status === "confirm" ? onClose : undefined}
      />

      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,calc(100dvh-3rem))] flex-col overflow-y-auto rounded-t-[28px] bg-paper p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.18)] max-lg:mb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:inset-0 sm:m-auto sm:mb-0 sm:h-fit sm:max-h-[90dvh] sm:max-w-sm sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-on-primary text-xs font-bold tracking-tight">
              ₿
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Bitika</p>
              <p className="text-[11px] text-slate">{t("invest.purchase.rail")}</p>
            </div>
          </div>
          {status === "confirm" && (
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={onClose}
              className="btn flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-slate"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {status === "confirm" && (
          <>
            <div className="mt-6 space-y-3">
              <Row label={t("invest.purchase.debit")} value={kes(kesAmount)} bold />
              <Row
                label={t("invest.purchase.receive")}
                value={
                  estimatedSats !== null
                    ? `${number(estimatedSats)} sats`
                    : "…"
                }
              />
              <Row label={t("invest.purchase.toWallet")} value={address} truncate />
              <Row
                label={t("invest.purchase.fromPhone")}
                value={phone ? maskPhone(phone) : "…"}
              />
            </div>

            <p className="mt-4 rounded-xl bg-pearl px-3 py-2.5 text-[11px] leading-5 text-slate">
              {t("invest.purchase.prompt")}
            </p>

            <button
              type="button"
              className="btn btn-primary mt-5 w-full py-4 text-base"
              disabled={busy}
              onClick={onApprove}
            >
              {busy ? t("invest.purchase.starting") : t("invest.purchase.approve")}
            </button>

            <p className="mt-3 text-center text-[10px] leading-4 text-slate">
              {t("invest.purchase.education")}
            </p>
          </>
        )}

        {status === "polling" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-4">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            <p className="text-sm text-ink">{t("invest.purchase.waiting")}</p>
            <p className="text-xs text-slate">{t("invest.checkPhone")}</p>
          </div>
        )}

        {status === "success" && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-mint/60 bg-mint/25 py-5 text-center text-pine animate-in fade-in zoom-in duration-500">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint text-teal animate-[bounce_1s_ease-in-out]">
              <CheckIcon />
            </span>
            <p className="text-base font-semibold text-ink">{t("invest.purchase.sent")}</p>
            <p className="text-sm text-slate">
              {t("invest.purchase.debited", { amount: kes(kesAmount) })}
              {estimatedSats
                ? t("invest.purchase.satsIncoming", { sats: number(estimatedSats) })
                : ""}
            </p>
            <button type="button" className="btn btn-secondary mt-2 w-full" onClick={onClose}>
              {t("invest.purchase.done")}
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex flex-col gap-3">
            <p className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2.5 text-sm text-coral">
              {errorMessage ?? t("invest.purchase.failed")}
            </p>
            <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  truncate,
}: {
  label: string;
  value: string;
  bold?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs text-slate">{label}</span>
      <span
        className={`min-w-0 text-right text-sm break-all ${bold ? "font-bold text-ink" : "font-medium text-ink"} ${truncate ? "truncate sm:break-all" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.5">
      <polyline strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" />
    </svg>
  );
}
