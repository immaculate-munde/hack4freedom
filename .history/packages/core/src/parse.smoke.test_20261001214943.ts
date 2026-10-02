/**
 * Temporary smoke test for the parser.
 * Delete this once profile.spec.ts passes.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSmsBatch } from "./parse";

const smsDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "sms");

function readMessages(file: string): string[] {
  return readFileSync(join(smsDir, file), "utf8")
    .split(/\n\s*\n/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

describe("parseSmsBatch smoke test", () => {
  it("parses Amina's SMS into transactions", () => {
    const messages = readMessages("amina-wanjiku.txt");
    const txns = parseSmsBatch(messages);

    // Print for eyeballing
    console.log(`\n=== Amina: ${txns.length} transactions === - parse.smoke.test.ts:27`);
    for (const t of txns) {
      console.log(
        `${t.date}  ${t.direction.padEnd(3)}  ${String(t.amountKes).padStart(7)}  ${t.kind.padEnd(10)}  ${t.counterparty ?? "-"}`,
      );
    }

    // Basic sanity
    expect(txns.length).toBeGreaterThan(15);
    expect(txns.every((t) => t.amountKes > 0)).toBe(true);
    expect(txns.every((t) => t.date.match(/^\d{4}-\d{2}-\d{2}$/))).toBe(true);

    // Should have rent, salary, chama, fuliza
    const kinds = new Set(txns.map((t) => t.kind));
    expect(kinds.has("receive")).toBe(true);
    expect(kinds.has("paybill")).toBe(true);
    expect(kinds.has("fuliza")).toBe(true);
  });

  it("parses Brian's SMS into transactions", () => {
    const txns = parseSmsBatch(readMessages("brian-otieno.txt"));
    console.log(`\n=== Brian: ${txns.length} transactions === - parse.smoke.test.ts:48`);
    for (const t of txns) {
      console.log(
        `${t.date}  ${t.direction.padEnd(3)}  ${String(t.amountKes).padStart(7)}  ${t.kind.padEnd(10)}  ${t.counterparty ?? "-"}`,
      );
    }
    expect(txns.length).toBeGreaterThan(10);
    expect(txns.filter((t) => t.kind === "fuliza").length).toBeGreaterThanOrEqual(4);
  });

  it("parses Chebet's SMS into transactions", () => {
    const txns = parseSmsBatch(readMessages("chebet-langat.txt"));
    console.log(`\n=== Chebet: ${txns.length} transactions === - parse.smoke.test.ts:60`);
    for (const t of txns) {
      console.log(
        `${t.date}  ${t.direction.padEnd(3)}  ${String(t.amountKes).padStart(7)}  ${t.kind.padEnd(10)}  ${t.counterparty ?? "-"}`,
      );
    }
    expect(txns.length).toBeGreaterThan(10);

    // Should see school fees twice
    const fees = txns.filter((t) => /academy/i.test(t.counterparty ?? ""));
    expect(fees.length).toBeGreaterThanOrEqual(2);
  });
});