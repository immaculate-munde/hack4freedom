/**
 * Checks that the synthetic fixtures stay fake, complete, and internally consistent.
 * Wording follows published M-Pesa receipt shapes, not guessed phrases.
 * These people are invented. Do not replace the files with a real statement.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoProfile } from "./demo-profile";
import { PAST_PERFORMANCE_DISCLAIMER } from "./financial-profile.schema";

const smsDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "sms");

const DATE_SOURCE = String.raw`on (\d{1,2})/(\d{1,2})/(\d{2,4})`;

/** A fresh global regex. Reusing one /g pattern across messages skips later dates. */
function datePattern(): RegExp {
  return new RegExp(DATE_SOURCE, "g");
}

/** Split a fixture into messages. A blank line separates messages. A single newline does not. */
function messagesIn(file: string): string[] {
  return readFileSync(join(smsDir, file), "utf8")
    .split(/\n\s*\n/)
    .map((message) => message.trim())
    .filter((message) => message.length > 0);
}

/** Months touched by dated lines, as YYYY-MM. Two-digit years are 20xx. */
function monthsIn(file: string): Set<string> {
  const months = new Set<string>();
  for (const message of messagesIn(file)) {
    for (const match of message.matchAll(datePattern())) {
      const month = Number(match[2]);
      const rawYear = Number(match[3]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      months.add(`${year}-${String(month).padStart(2, "0")}`);
    }
  }
  return months;
}

describe("synthetic M-Pesa SMS fixtures", () => {
  it("uses published receipt shapes and includes awkward cases", () => {
    const amina = messagesIn("amina-wanjiku.txt").join("\n");
    const brian = messagesIn("brian-otieno.txt").join("\n");
    const chebet = messagesIn("chebet-langat.txt").join("\n");

    for (const text of [amina, brian, chebet]) {
      expect(text).toContain("paid to");
      expect(text).toContain("Fuliza M-PESA");
      expect(text).toContain("outstanding Fuliza M-PESA balance");
      expect(text).not.toContain("Buy Goods payment");
      expect(text).not.toContain("withdrawn");
    }

    expect(amina).toContain("for account");
    expect(amina).toContain("has been reversed");
    expect(amina).toContain("Failed.");
    expect(amina).toContain("To reverse, forward this message to 456.");
    expect(amina).toContain("KSh8,000.00");
    expect(amina).toContain("M-Shwari account");
    expect(amina).not.toContain("Paybill");

    expect(brian).toContain("Withdraw Ksh");
    expect(brian).toContain("Give Ksh1,000.00 cash to");
    expect(brian).toContain("reversal request has been received");
    expect(brian).toContain("Failed.");
    expect(brian).toContain("clear your outstanding Fuliza M-PESA");

    expect(chebet).toContain("for account TERM-2");
    expect(chebet).toContain("for account TERM-3");
    expect(chebet).toContain("has been reversed");
    expect(chebet).toContain("unable to authorise airtime");
    expect(chebet).not.toContain("Paybill");
  });

  it("covers six months, monthly rent, and a termly fee", () => {
    const aminaMonths = monthsIn("amina-wanjiku.txt");
    const brianMonths = monthsIn("brian-otieno.txt");
    const chebetMonths = monthsIn("chebet-langat.txt");

    expect(aminaMonths.size).toBeGreaterThanOrEqual(6);
    expect(brianMonths.size).toBeGreaterThanOrEqual(6);
    expect(chebetMonths.size).toBeGreaterThanOrEqual(6);

    const rentMonths = new Set<string>();
    for (const message of messagesIn("amina-wanjiku.txt")) {
      if (!message.includes("GREENVIEW APARTMENTS for account RENT")) continue;
      for (const match of message.matchAll(datePattern())) {
        rentMonths.add(`${match[3]}-${match[2]}`);
      }
    }
    expect(rentMonths.size).toBe(6);

    const feeMonths = [
      ...monthsInText(messagesIn("chebet-langat.txt"), "HILLTOP ACADEMY DEMO"),
    ];
    expect(feeMonths).toEqual(["2026-05", "2026-08"]);
  });
});

/** Months on messages that mention a counterparty. */
function monthsInText(messages: string[], needle: string): string[] {
  const months = new Set<string>();
  for (const message of messages) {
    if (!message.includes(needle)) continue;
    for (const match of message.matchAll(datePattern())) {
      const rawYear = Number(match[3]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      months.add(`${year}-${String(Number(match[2])).padStart(2, "0")}`);
    }
  }
  return [...months].sort();
}

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
