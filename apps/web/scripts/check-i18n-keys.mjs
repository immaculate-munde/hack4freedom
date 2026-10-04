import fs from "fs";
import path from "path";

const catalogs = {};
for (const file of fs.readdirSync("apps/web/locales/en")) {
  const name = file.replace(".json", "");
  catalogs[name] = JSON.parse(fs.readFileSync(path.join("apps/web/locales/en", file), "utf8"));
}

function dig(key) {
  const parts = key.split(".");
  let cur = catalogs;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return false;
    cur = cur[part];
  }
  return typeof cur === "string";
}

const files = [
  "apps/web/app/invest/invest-flow.tsx",
  "apps/web/app/invest/invest-page-client.tsx",
  "apps/web/app/wallet/page.tsx",
  "apps/web/app/settings/page.tsx",
  "apps/web/app/chama/chama-flow.tsx",
  "apps/web/components/app-shell.tsx",
  "apps/web/components/pwa-experience.tsx",
  "apps/web/components/bitika-purchase-modal.tsx",
  "apps/web/components/withdraw-modal.tsx",
  "apps/web/components/wallet-activity.tsx",
  "apps/web/components/ussd-access.tsx",
  "apps/web/components/breez-wallet-setup.tsx",
  "apps/web/components/seed-phrase-backup.tsx",
  "apps/web/components/import-mpesa-modal.tsx",
  "apps/web/components/sms-import-form.tsx",
  "apps/web/components/pdf-import-form.tsx",
  "apps/web/components/import-trigger.tsx",
  "apps/web/components/profile-sync.tsx",
  "apps/web/components/sensi-avatar.tsx",
  "apps/web/contexts/breez-wallet-context.tsx",
];

const missing = new Set();
const keyRe =
  /["']((?:invest|wallet|chama|import|walletSetup|common|sensi|settings|nav|trust|overview)(?:\.[A-Za-z0-9_]+)+)["']/g;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(keyRe)) {
    if (!dig(match[1])) missing.add(`${match[1]} in ${file}`);
  }
}
console.log(missing.size ? [...missing].join("\n") : "all keys resolve");
process.exit(missing.size ? 1 : 0);
