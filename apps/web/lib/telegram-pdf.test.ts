/**
 * End-to-end: demo fixture password opens amina-statement.pdf and parseStatement builds rows.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_STATEMENT_FILE,
  DEMO_STATEMENT_PASSWORD,
  parseStatement,
} from "@pesasense/core";
import { describe, expect, it } from "vitest";
import { extractTextFromMpesaPdfBytes } from "./telegram-pdf";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/core/src/fixtures/statements",
  DEMO_STATEMENT_FILE,
);

describe("extractTextFromMpesaPdfBytes (Telegram server path)", () => {
  it("opens the encrypted demo fixture with DEMO_STATEMENT_PASSWORD", async () => {
    expect(DEMO_STATEMENT_PASSWORD).toBe("demo-statement");
    const bytes = new Uint8Array(readFileSync(fixturePath));

    await expect(
      extractTextFromMpesaPdfBytes(bytes, "wrong-pin"),
    ).rejects.toThrow(/password/i);

    const text = await extractTextFromMpesaPdfBytes(
      bytes,
      DEMO_STATEMENT_PASSWORD,
    );
    expect(text).toMatch(/GREENVIEW/);
    expect(text).toMatch(/Pay Bill/);

    const txns = parseStatement({ text, source: "mpesa_pdf" });
    expect(txns.length).toBeGreaterThanOrEqual(8);
    expect(txns.some((t) => t.kind === "paybill" && t.amountKes === 15_000)).toBe(
      true,
    );
    expect(txns.some((t) => t.kind === "receive" && t.amountKes === 45_000)).toBe(
      true,
    );
  }, 60_000);
});
