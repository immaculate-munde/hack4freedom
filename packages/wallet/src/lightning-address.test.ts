import { describe, expect, it } from "vitest";
import { parseDestination } from "./lightning-address";

describe("parseDestination", () => {
  it("accepts lightning address", () => {
    const p = parseDestination("satoshi@blink.sv");
    expect(p.kind).toBe("lightning_address");
    expect(p.domain).toBe("blink.sv");
  });

  it("rejects empty", () => {
    expect(() => parseDestination("  ")).toThrow(/Enter a Lightning/);
  });
});
