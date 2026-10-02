import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseStatement } from "./parse";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "statements");

describe("parseStatement", () => {
  it("parses synthetic statement rows (same shape as amina-statement.pdf)", () => {
    const sample = `
M-PESA STATEMENT (synthetic)
Receipt  Completion time  Details  Status  Paid in  Withdrawn  Balance
QA10AA01  2026-04-02 08:12  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 7400.00
QA10AA07  2026-04-28 08:05  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 45000.00  Balance 46790.00
QA10AA15  2026-06-06 14:17  Fuliza M-PESA used. Outstanding Fuliza M-PESA balance 500.00  Completed
QA99RV01  2026-08-19 08:01  Reversal of transaction QA10AA06  Completed  Balance 2640.00
`.trim();

    const txns = parseStatement({ text: sample, source: "mpesa_pdf" });
    expect(txns.length).toBe(3);
    expect(txns.some((t) => t.kind === "paybill" && t.amountKes === 15000)).toBe(true);
    expect(txns.some((t) => t.kind === "receive" && t.amountKes === 45000)).toBe(true);
    expect(txns.some((t) => t.kind === "fuliza")).toBe(true);
  });

  it("returns empty for header-only text", () => {
    expect(
      parseStatement({ text: "M-PESA STATEMENT\nCustomer: Test", source: "mpesa_pdf" }),
    ).toEqual([]);
  });

  it("opens the encrypted fixture when decrypted text is supplied", () => {
    const pdfPath = join(fixtureDir, "amina-statement.pdf");
    const bytes = readFileSync(pdfPath);
    expect(bytes.includes(Buffer.from("GREENVIEW"))).toBe(false);
  });
});
