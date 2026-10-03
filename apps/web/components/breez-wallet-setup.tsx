"use client";

import { useState } from "react";
import { useFormat, useI18n } from "../contexts/language-context";
import { useBreezWallet } from "../contexts/breez-wallet-context";
import { assertValidMnemonic, normalizeMnemonic } from "../lib/breez/mnemonic";
import { SeedPhraseBackup } from "./seed-phrase-backup";

const STORED_ERRORS: Record<string, string> = {
  "Enter a positive sats amount.": "walletSetup.positiveSats",
  "That recovery phrase does not look valid. Check all 12 words.": "walletSetup.invalidPhrase",
  "NEXT_PUBLIC_BREEZ_API_KEY is missing. Request a free key at breez.technology and add it to apps/web/.env.local.":
    "walletSetup.missingKeyDetail",
  "Could not open wallet.": "walletSetup.openFailed",
  "Restore failed.": "walletSetup.restoreFailed",
  "Invalid phrase.": "walletSetup.invalidPhrase",
  "Unlock your PesaSense wallet first.": "walletSetup.unlockFirst",
};

function showStored(
  t: (key: string) => string,
  message: string | null,
): string | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed) return t("walletSetup.openFailed");
  if (!/\s/.test(trimmed)) {
    const translated = t(trimmed);
    if (translated !== trimmed) return translated;
  }
  const key = STORED_ERRORS[trimmed];
  if (key) return t(key);
  return t("walletSetup.openFailed");
}

export function BreezWalletSetup({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const { number } = useFormat();
  const wallet = useBreezWallet();
  const [restoreText, setRestoreText] = useState("");
  const [mode, setMode] = useState<"pick" | "restore">("pick");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (wallet.status === "no_api_key") {
    return (
      <div className="rounded-2xl border border-brass/40 bg-brass/10 p-4 text-sm text-ink/80">
        <p className="font-medium text-pine">{t("walletSetup.keyNeeded")}</p>
        <p className="mt-2 leading-6">
          {t("walletSetup.keyLead")}
          <strong>{t("walletSetup.keySpark")}</strong>
          {t("walletSetup.keyMid")}
          <a
            className="text-moss underline"
            href="https://breez.technology/request-api-key/"
            target="_blank"
            rel="noreferrer"
          >
            breez.technology
          </a>
          {t("walletSetup.keyAfterLink")}
          <code className="text-xs">{t("walletSetup.keyEnv")}</code>
          {t("walletSetup.keyIn")}
          <code className="text-xs">{t("walletSetup.keyFile")}</code>
          {t("walletSetup.keyThen")}
          <code className="text-xs">{t("walletSetup.keyCmd")}</code>
          {t("walletSetup.keyEnd")}
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
    return <p className="text-sm text-ink/70">{t("walletSetup.opening")}</p>;
  }

  if (wallet.status === "ready" && wallet.lightningAddress) {
    return (
      <div className="rounded-2xl border border-moss/30 bg-moss/5 p-4 text-sm">
        <p className="font-medium text-pine">{t("walletSetup.ready")}</p>
        <p className="mt-2 break-all font-mono text-xs">{wallet.lightningAddress}</p>
        <p className="mt-2 text-ink/70">
          {t("walletSetup.balance", { sats: number(wallet.balanceSats) })}
        </p>
        {!compact ? (
          <button
            type="button"
            className="btn btn-ghost mt-3"
            onClick={() => void wallet.refreshBalance()}
          >
            {t("walletSetup.refresh")}
          </button>
        ) : null}
      </div>
    );
  }

  const err = showStored(t, localError ?? wallet.error);

  if (mode === "restore") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-ink/80">{t("walletSetup.pastePhrase")}</p>
        <textarea
          className="field min-h-[100px] font-mono text-xs"
          value={restoreText}
          onChange={(e) => setRestoreText(e.target.value)}
          placeholder={t("walletSetup.phrasePlaceholder")}
          aria-label={t("walletSetup.pastePhrase")}
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
                  setLocalError(e instanceof Error ? e.message : "walletSetup.restoreFailed");
                })
                .finally(() => setBusy(false));
            } catch (e) {
              setBusy(false);
              setLocalError(e instanceof Error ? e.message : "walletSetup.invalidPhrase");
            }
          }}
        >
          {busy ? t("walletSetup.restoring") : t("walletSetup.restore")}
        </button>
        <button type="button" className="btn btn-ghost w-full" onClick={() => setMode("pick")}>
          {t("common.back")}
        </button>
        {err ? <p className="text-red-800">{err}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {!compact ? (
        <p className="leading-6 text-ink/80">
          {t("walletSetup.introLead")}
          <strong>{t("walletSetup.introStrong")}</strong>
          {t("walletSetup.introMid")}
          <strong>{t("walletSetup.introBreez")}</strong>
          {t("walletSetup.introRest")}
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
        {t("walletSetup.create")}
      </button>
      <button
        type="button"
        className="btn btn-secondary w-full"
        onClick={() => setMode("restore")}
      >
        {t("walletSetup.havePhrase")}
      </button>
      {err ? <p className="text-red-800">{err}</p> : null}
    </div>
  );
}
