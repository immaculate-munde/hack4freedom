"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawAddress: string;
  withdrawDone?: boolean;
  balanceSats?: number;
  amountSats?: number;
}

const STEPS = [
  "Copy the address below or scan the QR code with your phone.",
  "Open your Lightning wallet — Wallet of Satoshi, Blink, Breez, or any other.",
  "Send your sats to this address. bitcoin.co.ke converts them to KES on your M-Pesa.",
] as const;

export function WithdrawModal({
  isOpen,
  onClose,
  withdrawAddress,
  withdrawDone = false,
  balanceSats,
  amountSats,
}: WithdrawModalProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(withdrawAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      void 0;
    }
  }, [withdrawAddress]);

  const tryWalletApp = useCallback(() => {
    const link = document.createElement("a");
    link.href = `lightning:${withdrawAddress}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [withdrawAddress]);

  if (!isOpen || !withdrawAddress) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Withdraw to M-Pesa"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-3xl border border-sand bg-paper p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-pine">Withdraw to M-Pesa</h2>
            <p className="mt-0.5 text-xs text-ink/55">
              via bitcoin.co.ke · ~1% fee
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn btn-ghost -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sand/80 text-ink/50 hover:text-ink"
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <div className="rounded-2xl border border-sand bg-white p-3 shadow-sm">
            <QRCodeSVG
              value={withdrawAddress}
              size={180}
              level="M"
              marginSize={1}
            />
          </div>
        </div>

        <p className="mt-4 break-all rounded-xl border border-sand/80 bg-sand/40 px-3 py-2.5 text-center font-mono text-xs text-ink">
          {withdrawAddress}
        </p>

        <ol className="mt-5 space-y-3" aria-label="Steps to withdraw">
          {STEPS.map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine/10 text-[10px] font-bold tabular-nums text-pine">
                {i + 1}
              </span>
              <p className="text-xs leading-5 text-ink/75">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            id="withdraw-modal-copy"
            className="btn btn-primary flex flex-1 items-center justify-center gap-2"
            onClick={() => void copyAddress()}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            type="button"
            id="withdraw-modal-open-wallet"
            className="btn btn-secondary flex flex-1 items-center justify-center gap-2"
            onClick={tryWalletApp}
          >
            Try wallet app
          </button>
        </div>

        {withdrawDone ? (
          <div className="mt-4 rounded-xl border border-moss/25 bg-moss/8 px-3 py-2.5">
            <p className="text-xs leading-5 text-moss">
              Payment submitted from your PesaSense wallet. KES should arrive on
              M-Pesa after bitcoin.co.ke settles.
              {balanceSats !== undefined ? (
                <> Wallet balance: {balanceSats} sats.</>
              ) : null}
            </p>
          </div>
        ) : amountSats ? (
          <p className="mt-4 text-xs leading-5 text-ink/55">
            Send about <span className="font-semibold text-ink/80">{amountSats} sats</span> to this
            address. If the wallet app does not open, use Copy address instead.
          </p>
        ) : null}
      </div>
    </div>
  );
}
