"use client";

import { useState } from "react";
import { useBreezWallet } from "../contexts/breez-wallet-context";
import { assertValidMnemonic, normalizeMnemonic } from "../lib/breez/mnemonic";
import { SeedPhraseBackup } from "./seed-phrase-backup";

export function BreezWalletSetup({ compact }: { compact?: boolean }) {
  const wallet = useBreezWallet();
  const [restoreText, setRestoreText] = useState("");
  const [mode, setMode] = useState<"pick" | "restore">("pick");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (wallet.status === "no_api_key") {
    return (
      <div className="rounded-2xl border border-brass/40 bg-brass/10 p-4 text-sm text-ink/80">
        <p className="font-medium text-pine">Breez API key needed</p>
        <p className="mt-2 leading-6">
          In-app wallet uses{" "}
          <strong>Breez SDK Spark</strong> (non-custodial). Request a free key at{" "}
          <a
            className="text-moss underline"
            href="https://breez.technology/request-api-key/"
            target="_blank"
            rel="noreferrer"
          >
            breez.technology
          </a>{" "}
          and set <code className="text-xs">NEXT_PUBLIC_BREEZ_API_KEY</code> in{" "}
          <code className="text-xs">apps/web/.env.local</code>, then restart{" "}
          <code className="text-xs">pnpm dev</code>.
        </p>
      </div>
    );
  }

  if (wallet.pendingMnemonic) {
    return (
      <SeedPhraseBackup
        mnemonic={wallet.pendingMnemonic}
        busy={busy}
        onConfirm={() => {
          setBusy(true);
          void wallet.confirmBackupAndUnlock().finally(() => setBusy(false));
        }}
      />
    );
  }

  if (wallet.status === "loading") {
    return <p className="text-sm text-ink/70">Opening your Lightning wallet…</p>;
  }

  if (wallet.status === "ready" && wallet.lightningAddress) {
    return (
      <div className="rounded-2xl border border-moss/30 bg-moss/5 p-4 text-sm">
        <p className="font-medium text-pine">PesaSense wallet is ready</p>
        <p className="mt-2 break-all font-mono text-xs">{wallet.lightningAddress}</p>
        <p className="mt-2 text-ink/70">Balance: {wallet.balanceSats} sats</p>
        {!compact ? (
          <button
            type="button"
            className="btn btn-ghost mt-3"
            onClick={() => void wallet.refreshBalance()}
          >
            Refresh balance
          </button>
        ) : null}
      </div>
    );
  }

  const err = localError ?? wallet.error;

  if (mode === "restore") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-ink/80">Paste your 12-word recovery phrase.</p>
        <textarea
          className="field min-h-[100px] font-mono text-xs"
          value={restoreText}
          onChange={(e) => setRestoreText(e.target.value)}
          placeholder="word1 word2 … word12"
        />
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={busy}
          onClick={() => {
            setLocalError(null);
            setBusy(true);
            try {
              assertValidMnemonic(normalizeMnemonic(restoreText));
              void wallet
                .restoreWallet(restoreText)
                .catch((e: unknown) => {
                  setLocalError(e instanceof Error ? e.message : "Restore failed.");
                })
                .finally(() => setBusy(false));
            } catch (e) {
              setBusy(false);
              setLocalError(e instanceof Error ? e.message : "Invalid phrase.");
            }
          }}
        >
          {busy ? "Restoring…" : "Restore wallet"}
        </button>
        <button type="button" className="btn btn-ghost w-full" onClick={() => setMode("pick")}>
          Back
        </button>
        {err ? <p className="text-red-800">{err}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {!compact ? (
        <p className="leading-6 text-ink/80">
          We create a <strong>non-custodial</strong> Lightning wallet in your browser with{" "}
          <strong>Breez</strong>. You hold the keys. Bitika sends buys to this address.
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={busy}
        onClick={() => {
          setLocalError(null);
          setBusy(true);
          void wallet.createWallet().finally(() => setBusy(false));
        }}
      >
        Create wallet in PesaSense
      </button>
      <button
        type="button"
        className="btn btn-secondary w-full"
        onClick={() => setMode("restore")}
      >
        I already have a recovery phrase
      </button>
      {err ? <p className="text-red-800">{err}</p> : null}
    </div>
  );
}
