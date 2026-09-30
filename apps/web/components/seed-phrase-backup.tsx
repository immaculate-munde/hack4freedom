"use client";

import { useMemo, useState } from "react";
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
        <p className="font-semibold text-ink">Save your recovery phrase now</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-6 text-ink/85">
          <li>
            <strong>These 12 words are your wallet.</strong> If you lose them, your
            sats are gone. PesaSense cannot reset them.
          </li>
          <li>Do not screenshot this screen or store the phrase in email or chat.</li>
          <li>
            Write it on paper, or download the backup file and move it to a safe place
            on <strong>this device only</strong> (not a shared folder).
          </li>
        </ul>
      </div>

      <div className="card border-pine/20">
        <p className="text-xs font-semibold tracking-wide text-moss uppercase">
          Your 12 words
        </p>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {words.map((word, index) => (
            <li
              key={`${index}-${word}`}
              className="flex items-center gap-2 rounded-xl bg-sand/50 px-2.5 py-2 font-mono text-xs"
            >
              <span className="text-ink/40 tabular-nums">{index + 1}.</span>
              <span className="text-ink">{word}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 break-words rounded-xl border border-dashed border-sand bg-paper/80 px-3 py-2 font-mono text-[11px] leading-5 text-ink/70">
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
                window.alert("Could not copy. Select the phrase and copy it manually.");
              },
            );
          }}
        >
          {copied ? "Copied" : "Copy phrase"}
        </button>
        <button
          type="button"
          className="btn btn-secondary w-full sm:flex-1"
          onClick={() => {
            downloadRecoveryBackup(mnemonic);
            setDownloaded(true);
          }}
        >
          {downloaded ? "Downloaded" : "Download backup file"}
        </button>
      </div>
      <p className="text-xs leading-5 text-ink/55">
        The file is named{" "}
        <code className="text-[10px]">pesasense-wallet-recovery-*.txt</code>. Keep it
        private; delete it from Downloads if that folder is synced or shared.
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-white/50 p-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-pine"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <span className="leading-6 text-ink/85">
          I understand that losing this phrase means losing access to my Bitcoin, and
          I have <strong>written it down or saved the backup file</strong> in a safe
          place.
        </span>
      </label>

      {acknowledged && savedHint ? (
        <p className="text-xs text-brass">
          Tip: copy or download the backup file before opening your wallet, even if you
          wrote the words on paper.
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={busy || !canContinue}
        onClick={onConfirm}
      >
        {busy ? "Opening wallet…" : "I saved my phrase — open wallet"}
      </button>
    </div>
  );
}
