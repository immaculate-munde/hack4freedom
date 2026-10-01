/**
 * Purchases recorded on this device, keyed by demo profile id.
 * The hand-written profile fixtures stay unchanged.
 */

import type { WalletEvent } from "@pesasense/core";

export const WALLET_EVENTS_KEY = "pesasense.wallet-events.v1";
export const WALLET_EVENTS_CHANGED = "pesasense-wallet-events";

type Store = Record<string, WalletEvent[]>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(WALLET_EVENTS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  window.localStorage.setItem(WALLET_EVENTS_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(WALLET_EVENTS_CHANGED));
}

export function loadWalletEvents(profileId: string): WalletEvent[] {
  const list = readStore()[profileId];
  return Array.isArray(list) ? list : [];
}

export function upsertWalletEvent(profileId: string, event: WalletEvent): WalletEvent[] {
  const store = readStore();
  const list = Array.isArray(store[profileId]) ? store[profileId] : [];
  const existing = list.find((item) => item.id === event.id);
  const saved = existing ? { ...event, at: existing.at } : event;
  const next = existing
    ? list.map((item) => (item.id === event.id ? saved : item))
    : [...list, saved];
  store[profileId] = next;
  writeStore(store);
  return next;
}

/** Drop a quote id once Bitika has issued a transaction code. */
export function replaceWalletEvent(
  profileId: string,
  previousId: string,
  event: WalletEvent,
): WalletEvent[] {
  const store = readStore();
  const list = Array.isArray(store[profileId]) ? store[profileId] : [];
  const previous = list.find((item) => item.id === previousId);
  const without = list.filter((item) => item.id !== previousId && item.id !== event.id);
  const saved = { ...event, at: previous?.at ?? event.at };
  const next = [...without, saved];
  store[profileId] = next;
  writeStore(store);
  return next;
}

export function latestSubmittedPurchase(profileId: string): WalletEvent | null {
  const list = loadWalletEvents(profileId);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const event = list[i];
    if (event?.status === "submitted") return event;
  }
  return null;
}
