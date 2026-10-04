"use client";

import type { FinancialProfile } from "@pesasense/core";
import {
  createNostrSecret,
  directoryForRelays,
  loadProfile,
  nostrPubkey,
  publishSurplusAggregate,
  relaysFromEnv,
  saveProfile,
} from "@pesasense/nostr";
import { useState } from "react";
import { useFormat, useI18n } from "../contexts/language-context";
import { isOnline } from "../lib/network";
import { loadWalletEvents, replaceWalletEvents } from "../lib/wallet-events";

const SECRET_KEY = "pesasense.nostr-secret.v1";

const SYNC_ERRORS: Record<string, string> = {
  "No Nostr relay is configured.": "import.sync.noRelay",
  "The saved profile could not be read.": "import.sync.unreadable",
  "Could not save the profile.": "import.sync.saveFailed",
  "Could not load the profile.": "import.sync.loadFailed",
  "Could not share the surplus range.": "import.sync.shareFailed",
};

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function deviceSecret(): Uint8Array {
  const existing = window.localStorage.getItem(SECRET_KEY);
  if (existing && /^[0-9a-f]{64}$/i.test(existing)) {
    return hexToBytes(existing);
  }
  const created = createNostrSecret();
  window.localStorage.setItem(SECRET_KEY, bytesToHex(created));
  return created;
}

export function ProfileSync({
  profile,
  profileId,
}: {
  profile: FinancialProfile;
  profileId: string;
}) {
  const { t } = useI18n();
  const { kes } = useFormat();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function explain(error: unknown, fallbackKey: string): string {
    if (!(error instanceof Error)) return t(fallbackKey);
    const text = error.message.trim();
    if (!text) return t(fallbackKey);
    if (!/\s/.test(text)) {
      const translated = t(text);
      if (translated !== text) return translated;
    }
    const key = SYNC_ERRORS[text];
    if (key) return t(key);
    return t(fallbackKey);
  }

  function directory() {
    return directoryForRelays(relaysFromEnv(process.env.NEXT_PUBLIC_NOSTR_RELAYS));
  }

  async function onSave() {
    if (!isOnline()) {
      setMessage(t("common.offlineAction"));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const secret = deviceSecret();
      const merged: FinancialProfile = {
        ...profile,
        walletEvents: loadWalletEvents(profileId),
      };
      const result = await saveProfile(merged, secret, directory());
      setMessage(t("import.sync.saved", { id: result.eventId.slice(0, 8) }));
    } catch (error) {
      setMessage(explain(error, "import.sync.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onLoad() {
    if (!isOnline()) {
      setMessage(t("common.offlineAction"));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const secret = deviceSecret();
      const loaded = await loadProfile(nostrPubkey(secret), secret, directory());
      if (!loaded) {
        setMessage(t("import.sync.none"));
        return;
      }
      replaceWalletEvents(profileId, loaded.walletEvents);
      setMessage(t("import.sync.loaded", { amount: kes(loaded.surplus.monthlyKes.floor) }));
    } catch (error) {
      setMessage(explain(error, "import.sync.loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!isOnline()) {
      setMessage(t("common.offlineAction"));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await publishSurplusAggregate(profile, directory());
      setMessage(t("import.sync.shared"));
    } catch (error) {
      setMessage(explain(error, "import.sync.shareFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4">
      <h2 className="font-serif text-xl text-pine">{t("import.sync.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/75">{t("import.sync.body")}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onSave()}>
          {t("import.sync.save")}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onLoad()}>
          {t("import.sync.load")}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onShare()}>
          {t("import.sync.share")}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-ink/80">{message}</p> : null}
    </section>
  );
}
