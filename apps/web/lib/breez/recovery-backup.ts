/** Build a plain-text recovery file the user can save on their device. */
export function buildRecoveryBackupText(mnemonic: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `PesaSense wallet recovery phrase
Created: ${date}

IMPORTANT
- Anyone with these 12 words can spend your Bitcoin.
- PesaSense cannot reset or recover this phrase for you.
- Store this file offline. Do not email it or upload it to the cloud.
- Delete this file from shared or public folders after you copy it somewhere safe.

Recovery phrase (12 words):
${mnemonic}

Lightning wallet powered by Breez SDK Spark (non-custodial).
`;
}

export function downloadRecoveryBackup(mnemonic: string): void {
  const text = buildRecoveryBackupText(mnemonic);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pesasense-wallet-recovery-${date}.txt`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
