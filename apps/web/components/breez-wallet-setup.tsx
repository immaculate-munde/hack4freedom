"use client";

import { useEffect, useState } from "react";
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

const OPENING_STEPS = [
  "walletSetup.openingKeys",
  "walletSetup.openingSpark",
  "walletSetup.openingAddress",
] as const;

function OpeningWallet({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % OPENING_STEPS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className={`flex flex-col items-center rounded-[20px] border border-line bg-surface text-center shadow-card ${
        compact ? "px-4 py-6" : "px-6 py-6 sm:py-10"
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`relative flex items-center justify-center ${
          compact ? "h-16 w-16" : "h-20 w-20 sm:h-24 sm:w-24"
        }`}
      >
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-mint border-t-brass [animation-duration:2.4s]"
          aria-hidden
        />
        <span className="absolute inset-3 animate-pulse rounded-full bg-mint/50" aria-hidden />
        <span
          className={`relative flex items-center justify-center rounded-full bg-pine text-brass shadow-card ${
            compact ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z" />
          </svg>
        </span>
      </div>
      <h2
        className={`max-w-[16rem] text-balance font-serif text-pine ${
          compact ? "mt-4 text-lg" : "mt-4 text-xl sm:mt-6"
        }`}
      >
        {t("walletSetup.openingTitle")}
      </h2>
      <p className="mt-2 min-h-6 max-w-[16rem] text-balance text-sm text-ink/70">
        {t(OPENING_STEPS[step] ?? OPENING_STEPS[0])}
      </p>
      <div className="mt-4 flex gap-1.5 sm:mt-5" aria-hidden>
        {OPENING_STEPS.map((key, index) => (
          <span
            key={key}
            className={`h-1.5 rounded-full transition-all ${
              index === step ? "w-6 bg-brass" : "w-1.5 bg-sand"
            }`}
          />
        ))}
      </div>
    </section>
  );
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
    return <OpeningWallet compact={compact} />;
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
