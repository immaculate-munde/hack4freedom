import { describe, expect, it } from "vitest";
import { demoProfile } from "@pesasense/core";
import { generateSecretKey, getPublicKey, type Event } from "nostr-tools";
import {
  loadProfile,
  PROFILE_D_TAG,
  PROFILE_KIND,
  publishSurplusAggregate,
  saveProfile,
  surplusAggregateTemplate,
  type ProfileDirectory,
} from "./profile-store";

function memoryDirectory(): ProfileDirectory & { events: Event[] } {
  const events: Event[] = [];
  return {
    events,
    async publish(event) {
      events.push(event);
    },
    async fetchLatest(author) {
      return events.find((event) => event.pubkey === author && event.kind === PROFILE_KIND) ?? null;
    },
  };
}

describe("encrypted profile storage", () => {
  it("round-trips a profile without putting the plaintext on the relay", async () => {
    const secret = generateSecretKey();
    const directory = memoryDirectory();
    const saved = await saveProfile(demoProfile, secret, directory);
    const loaded = await loadProfile(getPublicKey(secret), secret, directory);

    expect(saved.eventId).toBe(directory.events[0]?.id);
    expect(directory.events[0]?.kind).toBe(PROFILE_KIND);
    expect(directory.events[0]?.tags).toContainEqual(["d", PROFILE_D_TAG]);
    expect(directory.events[0]?.content).not.toContain("monthlyKes");
    expect(directory.events[0]?.content).not.toContain("walletdemo");
    expect(loaded?.surplus.monthlyKes.floor).toBe(demoProfile.surplus.monthlyKes.floor);
    expect(loaded?.walletEvents).toEqual(demoProfile.walletEvents);
  });

  it("returns null when nothing has been saved", async () => {
    const secret = generateSecretKey();
    await expect(loadProfile(getPublicKey(secret), secret, memoryDirectory())).resolves.toBeNull();
  });
});

describe("anonymous surplus job", () => {
  it("publishes only the surplus range and horizon, from a fresh key", async () => {
    const profileKey = generateSecretKey();
    const template = surplusAggregateTemplate(demoProfile);
    const text = JSON.stringify(template);

    expect(text).not.toContain("@");
    expect(text).not.toContain("254");
    expect(text).not.toMatch(/statement|sms|raw/i);
    expect(template.content).toBe("");
    expect(template.tags).toContainEqual(["param", "surplusFloorKes", "2000"]);

    const directory = memoryDirectory();
    const published = await publishSurplusAggregate(demoProfile, directory);
    expect(published.pubkey).not.toBe(getPublicKey(profileKey));
    expect(directory.events[0]?.content).toBe("");
    expect(JSON.stringify(directory.events[0]?.tags)).not.toContain("@");
  });
});
