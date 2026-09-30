/**
 * Checks that the synthetic fixtures stay fake, complete, and internally consistent.
 * These tests guard the demo data. They do not exercise the parser, which is still a stub.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoProfile } from "./demo-profile";
import { PAST_PERFORMANCE_DISCLAIMER } from "./financial-profile.schema";

const smsDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "sms");

/** Personas the parser will be tested against later. All invented. */
const FIXTURES = [
  {
    file: "amina-wanjiku.txt",
    mustInclude: ["have received", "Fuliza", "airtime", "Buy Goods", "for account"],
  },
  {
    file: "brian-otieno.txt",
    mustInclude: ["Fuliza", "airtime", "Buy Goods", "withdrawn"],
  },
  {
    file: "chebet-langat.txt",
    mustInclude: ["Paybill", "HILLTOP ACADEMY DEMO", "MWANGAZA CHAMA", "Fuliza"],
  },
] as const;

function readFixture(file: string): string {
  return readFileSync(join(smsDir, file), "utf8");
}

describe("synthetic M-Pesa fixtures", () => {
  it("has three invented statement files with the keywords the parser must learn", () => {
    for (const fixture of FIXTURES) {
      const text = readFixture(fixture.file);
      const messages = text
        .split(/\n\s*\n/)
        .map((message) => message.trim())
        .filter((message) => message.length > 0);

      expect(messages.length).toBeGreaterThanOrEqual(8);
      for (const keyword of fixture.mustInclude) {
        expect(text).toContain(keyword);
      }
    }
  });
});

describe("demo financial profile", () => {
  it("is a complete version-1 profile with a surplus range and no trading fields", () => {
    expect(demoProfile.version).toBe(1);
    expect(demoProfile.window.monthsCovered).toBe(6);
    expect(demoProfile.window.sources).toEqual(["mpesa"]);

    const { floor, typical, ceiling } = demoProfile.surplus.monthlyKes;
    expect(floor).toBeLessThan(typical);
    expect(typical).toBeLessThan(ceiling);
    expect(demoProfile.surplus.bufferFirst).toBe(false);

    const plan = demoProfile.investmentPlan;
    expect(plan).toBeDefined();
    expect(plan && plan.amountKes).toBeLessThan(floor);

    expect(demoProfile.scenarios).toEqual([]);
    expect(demoProfile).not.toHaveProperty("orders");
    expect(demoProfile).not.toHaveProperty("priceTarget");
    expect(demoProfile).not.toHaveProperty("sellSignal");
    expect(PAST_PERFORMANCE_DISCLAIMER).toMatch(/not indicate future results/i);
  });
});
