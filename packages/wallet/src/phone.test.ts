import { describe, expect, it } from "vitest";
import { maskPhone, toBitikaPhone, toBitcoinCoKeLightningAddress } from "./phone";

describe("phone", () => {
  it("normalizes 07… to 254…", () => {
    expect(toBitikaPhone("0712 345 678")).toBe("254712345678");
  });

  it("builds bitcoin.co.ke address", () => {
    expect(toBitcoinCoKeLightningAddress("254712345678")).toBe(
      "0712345678@bitcoin.co.ke",
    );
  });

  it("masks phone for display", () => {
    expect(maskPhone("0712345678")).toMatch(/\*\*\*/);
  });
});
