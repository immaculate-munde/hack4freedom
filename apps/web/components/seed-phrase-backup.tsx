"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../contexts/language-context";
import { downloadRecoveryBackup } from "../lib/breez/recovery-backup";

export function SeedPhraseBackup({
  mnemonic,
  busy,
  onConfirm,
}: {
  mnemonic: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const words = useMemo(() => mnemonic.trim().split(/\s+/), [mnemonic]);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const canContinue = acknowledged;
  const savedHint = !copied && !downloaded;

  return (
    <div className="space-y-4 text-sm">
      <div
        className="rounded-2xl border-2 border-brass/50 bg-brass/10 p-4"
        role="alert"
      >
        <p className="font-semibold text-ink">{t("walletSetup.saveNow")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-6 text-ink-soft">
          <li>
            <strong>{t("walletSetup.wordsAreWalletLead")}</strong> {t("walletSetup.wordsAreWalletRest")}
          </li>
          <li>{t("walletSetup.noScreenshot")}</li>
          <li>
            {t("walletSetup.writeLead")} <strong>{t("walletSetup.writeStrong")}</strong>
            {t("walletSetup.writeRest")}
          </li>
        </ul>
      </div>

      <div className="card border-pine/20">
        <p className="text-xs font-semibold tracking-wide text-moss uppercase">
          {t("walletSetup.yourWords")}
        </p>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {words.map((word, index) => (
            <li
              key={`${index}-${word}`}
              className="flex items-center gap-2 rounded-xl bg-sand/50 px-2.5 py-2 font-mono text-xs"
            >
              <span className="text-slate tabular-nums">{index + 1}.</span>
              <span className="text-ink">{word}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 break-words rounded-xl border border-dashed border-sand bg-paper/80 px-3 py-2 font-mono text-[11px] leading-5 text-ink-soft">
          {mnemonic}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn btn-secondary w-full sm:flex-1"
          onClick={() => {
            void navigator.clipboard.writeText(mnemonic).then(
              () => setCopied(true),
              () => {
                window.alert(t("walletSetup.copyFailed"));
              },
            );
          }}
        >
          {copied ? t("walletSetup.copied") : t("walletSetup.copyPhrase")}
        </button>
        <button
          type="button"
          className="btn btn-secondary w-full sm:flex-1"
          onClick={() => {
            downloadRecoveryBackup(mnemonic);
            setDownloaded(true);
          }}
        >
          {downloaded ? t("walletSetup.downloaded") : t("walletSetup.download")}
        </button>
      </div>
      <p className="text-xs leading-5 text-slate">
        {t("walletSetup.fileLead")}{" "}
        <code className="text-[10px]">pesasense-wallet-recovery-*.txt</code>
        {t("walletSetup.fileRest")}
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-surface p-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-pine"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <span className="leading-6 text-ink-soft">
          {t("walletSetup.ackLead")} <strong>{t("walletSetup.ackStrong")}</strong>
          {t("walletSetup.ackRest")}
        </span>
      </label>

      {acknowledged && savedHint ? (
        <p className="text-xs text-brass">{t("walletSetup.tip")}</p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={busy || !canContinue}
        onClick={onConfirm}
      >
        {busy ? t("walletSetup.openingWallet") : t("walletSetup.savedOpen")}
      </button>
    </div>
  );
}
