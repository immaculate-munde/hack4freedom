/**
 * NIP-44 profile storage and an anonymous surplus job.
 * The web app should not build these events itself.
 */

import type { FinancialProfile } from "@pesasense/core";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip44,
  SimplePool,
  type Event,
  type EventTemplate,
} from "nostr-tools";

export const PROFILE_KIND = 30078;
export const PROFILE_D_TAG = "pesasense-profile:v1";
export const SURPLUS_JOB_KIND = 5910;
export const DEFAULT_NOSTR_RELAY = "wss://relay.damus.io";

export interface SaveProfileResult {
  eventId: string;
}

/** A stand-in for a relay. Tests pass one that never touches the network. */
export interface ProfileDirectory {
  publish(event: Event): Promise<void>;
  fetchLatest(author: string): Promise<Event | null>;
}

export function relaysFromEnv(value: string | undefined): string[] {
  const raw = value?.trim() || DEFAULT_NOSTR_RELAY;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function directoryForRelays(relays: string[]): ProfileDirectory {
  const pool = new SimplePool();
  return {
    async publish(event) {
      const writes = pool.publish(relays, event);
      if (writes.length === 0) {
        throw new Error("No Nostr relay is configured.");
      }
      await Promise.any(writes);
    },
    fetchLatest(author) {
      return pool.get(relays, {
        kinds: [PROFILE_KIND],
        authors: [author],
        "#d": [PROFILE_D_TAG],
      });
    },
  };
}

export function createNostrSecret(): Uint8Array {
  return generateSecretKey();
}

export function nostrPubkey(secretKey: Uint8Array): string {
  return getPublicKey(secretKey);
}

function conversationKey(secretKey: Uint8Array): Uint8Array {
  return nip44.v2.utils.getConversationKey(secretKey, getPublicKey(secretKey));
}

function encryptProfile(profile: FinancialProfile, secretKey: Uint8Array): string {
  return nip44.v2.encrypt(JSON.stringify(profile), conversationKey(secretKey));
}

function decryptProfile(payload: string, secretKey: Uint8Array): FinancialProfile {
  const text = nip44.v2.decrypt(payload, conversationKey(secretKey));
  const value = JSON.parse(text) as FinancialProfile;
  if (!value || value.version !== 1 || !value.surplus) {
    throw new Error("The saved profile could not be read.");
  }
  return value;
}

function profileEvent(profile: FinancialProfile, secretKey: Uint8Array): Event {
  return finalizeEvent(
    {
      kind: PROFILE_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["d", PROFILE_D_TAG]],
      content: encryptProfile(profile, secretKey),
    },
    secretKey,
  );
}

/**
 * Encrypt `profile` to the user's own key and publish a replaceable event.
 * `secretKey` stays on the device. Raw statement text is not part of this object.
 */
export async function saveProfile(
  profile: FinancialProfile,
  secretKey: Uint8Array,
  directory: ProfileDirectory,
): Promise<SaveProfileResult> {
  const event = profileEvent(profile, secretKey);
  await directory.publish(event);
  return { eventId: event.id };
}

/**
 * Load and decrypt the profile stored for `pubkey`.
 * Returns null when no event exists. That is a normal case, not a failure.
 */
export async function loadProfile(
  pubkey: string,
  secretKey: Uint8Array,
  directory: ProfileDirectory,
): Promise<FinancialProfile | null> {
  const event = await directory.fetchLatest(pubkey);
  if (!event) return null;
  return decryptProfile(event.content, secretKey);
}

/** Tags and empty content for one anonymous surplus job. No destination, phone, or statement. */
export function surplusAggregateTemplate(profile: FinancialProfile): EventTemplate {
  const horizon = profile.onboarding?.goal.horizonMonths;
  return {
    kind: SURPLUS_JOB_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["param", "surplusFloorKes", String(profile.surplus.monthlyKes.floor)],
      ["param", "surplusTypicalKes", String(profile.surplus.monthlyKes.typical)],
      ["param", "surplusCeilingKes", String(profile.surplus.monthlyKes.ceiling)],
      ["param", "horizonMonths", horizon === undefined ? "" : String(horizon)],
    ],
    content: "",
  };
}

/**
 * Publish the surplus range from a fresh key, so it is not tied to the saved profile.
 */
export async function publishSurplusAggregate(
  profile: FinancialProfile,
  directory: Pick<ProfileDirectory, "publish">,
  secretKey: Uint8Array = generateSecretKey(),
): Promise<{ eventId: string; pubkey: string }> {
  const event = finalizeEvent(surplusAggregateTemplate(profile), secretKey);
  await directory.publish(event);
  return { eventId: event.id, pubkey: event.pubkey };
}
