/**
 * Nostr package entry.
 * Profile encryption lives here. The web app should not build NIP-44 events itself.
 */

export { loadProfile, saveProfile, type SaveProfileResult } from "./profile-store";
