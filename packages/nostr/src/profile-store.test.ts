/**
 * Profile storage must not pretend a write or a read succeeded.
 */

import { describe, expect, it } from "vitest";
import { demoProfile } from "@pesasense/core";
import { loadProfile, saveProfile } from "./profile-store";

describe("Nostr profile stubs", () => {
  it("does not save or load until NIP-44 storage exists", async () => {
    await expect(saveProfile(demoProfile, new Uint8Array(32))).rejects.toThrow(
      /Not implemented: saveProfile/,
    );
    await expect(loadProfile("npub1demo")).rejects.toThrow(
      /Not implemented: loadProfile/,
    );
  });
});
