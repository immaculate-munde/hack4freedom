/**
 * Encrypted profile storage.
 *
 * Nostr is the backbone, not a login button. The profile is encrypted with
 * the user's key and stored as a parameterized replaceable event so it
 * survives if this web app is offline. Raw transactions never leave the device.
 *
 * TODO: verify current nostr-tools support for NIP-44 before implementing.
 * NIP-90 jobs, when added, may send only aggregates (income band, surplus range, horizon).
 * NIP-58 reliability badges stay mocked and opt-in. Do not publish one by default.
 */

import type { FinancialProfile } from "@pesasense/core";

/** Result of writing an encrypted profile event. */
export interface SaveProfileResult {
  /** Id of the replaceable event, once storage is implemented. */
  eventId: string;
}

/**
 * Encrypt `profile` with the user's key and store it.
 * `secretKey` stays on the device. This function must not upload the raw statement.
 *
 * TODO: NIP-44 encrypt, then publish a parameterized replaceable event.
 */
export async function saveProfile(
  profile: FinancialProfile,
  secretKey: Uint8Array,
): Promise<SaveProfileResult> {
  throw new Error(
    `Not implemented: saveProfile (version ${profile.version}, key bytes ${secretKey.byteLength})`,
  );
}

/**
 * Load and decrypt the profile stored for `pubkey`.
 * Returns null when no event exists. That is a normal case, not a failure.
 *
 * TODO: fetch the replaceable event and NIP-44 decrypt it on the device.
 */
export async function loadProfile(pubkey: string): Promise<FinancialProfile | null> {
  throw new Error(`Not implemented: loadProfile (${pubkey})`);
}
