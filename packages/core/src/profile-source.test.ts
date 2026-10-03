/**
 * The demo flag must not pretend a parsed profile exists.
 */

import { describe, expect, it } from "vitest";
import { demoProfile } from "./demo-profile";
import { profileSourceFromEnv, selectProfile } from "./profile-source";

describe("profile source", () => {
  it("treats only the parsed flag as parsed", () => {
    expect(profileSourceFromEnv(undefined)).toBe("demo");
    expect(profileSourceFromEnv("demo")).toBe("demo");
    expect(profileSourceFromEnv("parsed")).toBe("parsed");
  });

  it("returns the hand-written profile only in demo mode", () => {
    const selected = selectProfile({ source: "demo", profile: demoProfile });
    expect(selected.status).toBe("ready");
    if (selected.status === "ready") {
      expect(selected.isDemo).toBe(true);
      expect(selected.profile.surplus.monthlyKes.floor).toBe(2000);
    }
  });

  it("does not fall back to demo numbers when parsing is not ready", () => {
    const empty = selectProfile({ source: "parsed", messages: [] });
    expect(empty.status).toBe("not-ready");

    const stub = selectProfile({
      source: "parsed",
      messages: ["Not an M-Pesa receipt. No money moved here."],
    });
    expect(stub.status).toBe("not-ready");
    if (stub.status === "not-ready") {
      expect(stub.reason).toMatch(/zero transactions|Could not build/);
      expect(stub.reason).not.toMatch(/2,000/);
    }
  });
});
