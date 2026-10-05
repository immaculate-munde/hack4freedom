/**
 * The demo statement must stay encrypted, and the demo password must be the one
 * documented for Dev 1. Opening it is pdf.js work in the browser, not this test.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEMO_STATEMENT_FILE, DEMO_STATEMENT_PASSWORD } from "./statement-fixture";

const pdfPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "statements",
  DEMO_STATEMENT_FILE,
);

describe("synthetic M-Pesa statement PDF", () => {
  it("is an encrypted PDF that does not leak the statement text", () => {
    const bytes = readFileSync(pdfPath);
    expect(bytes.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(bytes.includes(Buffer.from("/Encrypt"))).toBe(true);
    expect(bytes.includes(Buffer.from("GREENVIEW"))).toBe(false);
    expect(bytes.includes(Buffer.from("Pay Bill"))).toBe(false);
    expect(DEMO_STATEMENT_PASSWORD).toBe("demo-statement");
  });

  it("documents the only demo password bots and docs should quote", () => {
    // Keep in lockstep with packages/telegram pdfPasswordPrompt and README.
    expect(DEMO_STATEMENT_PASSWORD).toBe("demo-statement");
    expect(DEMO_STATEMENT_FILE).toBe("amina-statement.pdf");
  });
});
