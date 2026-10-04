"use client";

import { maskPhone } from "@pesasense/wallet";

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
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Bitika purchase"
      className="fixed inset-0 z-[25] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
    >
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={status === "confirm" ? onClose : undefined}
      />

      <div className="relative flex w-full max-h-[min(90dvh,42rem)] max-w-lg flex-col overflow-y-auto rounded-[24px] bg-paper p-5 shadow-[0_12px_48px_rgb(0_0_0/0.22)] sm:rounded-[28px] sm:p-6">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-on-primary text-xs font-bold tracking-tight">
              ₿
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Bitika</p>
              <p className="text-[11px] text-slate">M-Pesa → Bitcoin</p>
            </div>
          </div>
          {status === "confirm" && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pearl text-slate"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {status === "confirm" && (
          <>
            <div className="mt-5 space-y-3 sm:mt-6">
              <Row label="M-Pesa debit" value={`KES ${kesAmount.toLocaleString("en-KE")}`} bold />
              <Row
                label="You receive (est.)"
                value={estimatedSats !== null ? `${estimatedSats.toLocaleString()} sats` : "…"}
              />
              <Row label="To wallet" value={address} truncate />
              <Row label="From phone" value={phone ? maskPhone(phone) : "…"} />
            </div>

            <p className="mt-4 rounded-xl bg-pearl px-3 py-2.5 text-[11px] leading-5 text-slate">
              M-Pesa will prompt your phone — enter your PIN to finish.
              Sats are an estimate; live mode adds ~3% on Bitika.
            </p>

            <button
              type="button"
              className="btn btn-primary mt-5 w-full py-4 text-base"
              disabled={busy}
              onClick={onApprove}
            >
              {busy ? "Starting payment…" : "Approve & Pay"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-4 text-slate">
              Education only, not financial advice. PesaSense does not hold your funds.
            </p>
          </>
        )}

        {status === "polling" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-4">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            <p className="text-sm text-ink">Waiting for M-Pesa confirmation…</p>
            <p className="text-xs text-slate">Check your phone and enter your PIN.</p>
          </div>
        )}

        {status === "success" && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-mint/60 bg-mint/25 py-5 text-center text-pine animate-in fade-in zoom-in duration-500">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint text-teal animate-[bounce_1s_ease-in-out]">
              <CheckIcon />
            </span>
            <p className="text-base font-semibold text-ink">Payment sent</p>
            <p className="text-sm text-slate">
              KES {kesAmount.toLocaleString("en-KE")} debited.
              {estimatedSats ? ` ~${estimatedSats.toLocaleString()} sats incoming.` : ""}
            </p>
            <button type="button" className="btn btn-secondary mt-2 w-full" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex flex-col gap-3">
            <p className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2.5 text-sm text-coral">
              {errorMessage ?? "The payment did not go through. No money left your account."}
            </p>
            <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
              Close
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
        className={`min-w-0 text-right text-sm ${bold ? "font-bold text-ink" : "font-medium text-ink"} ${truncate ? "max-w-[65%] truncate sm:max-w-[70%]" : ""}`}
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
