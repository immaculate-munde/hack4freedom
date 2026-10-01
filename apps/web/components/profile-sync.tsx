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
import { loadWalletEvents, replaceWalletEvents } from "../lib/wallet-events";

const SECRET_KEY = "pesasense.nostr-secret.v1";

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
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function directory() {
    return directoryForRelays(relaysFromEnv(process.env.NEXT_PUBLIC_NOSTR_RELAYS));
  }

  async function onSave() {
    setBusy(true);
    setMessage(null);
    try {
      const secret = deviceSecret();
      const merged: FinancialProfile = {
        ...profile,
        walletEvents: loadWalletEvents(profileId),
      };
      const result = await saveProfile(merged, secret, directory());
      setMessage(`Encrypted copy saved (${result.eventId.slice(0, 8)}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the profile.");
    } finally {
      setBusy(false);
    }
  }

  async function onLoad() {
    setBusy(true);
    setMessage(null);
    try {
      const secret = deviceSecret();
      const loaded = await loadProfile(nostrPubkey(secret), secret, directory());
      if (!loaded) {
        setMessage("No encrypted profile is stored yet.");
        return;
      }
      replaceWalletEvents(profileId, loaded.walletEvents);
      setMessage(
        `Loaded a profile. Surplus floor is KES ${loaded.surplus.monthlyKes.floor}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the profile.");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    setMessage(null);
    try {
      await publishSurplusAggregate(profile, directory());
      setMessage(
        "Shared an anonymous surplus range. No phone number or wallet address was included.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not share the surplus range.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4">
      <h2 className="font-serif text-xl text-pine">Private copy</h2>
      <p className="mt-2 text-sm leading-6 text-ink/75">
        Encrypt this profile on this device and store it on Nostr. The key stays in this
        browser. A separate anonymous note can share only the surplus range.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onSave()}>
          Save encrypted copy
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onLoad()}>
          Load encrypted copy
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onShare()}>
          Share surplus range
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-ink/80">{message}</p> : null}
    </section>
  );
}
