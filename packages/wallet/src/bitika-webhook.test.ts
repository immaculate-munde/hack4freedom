import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyBitikaWebhook } from "./bitika-webhook";

const secret = "whsec_test";
const raw = '{"id":"evt_1","event":"payment.completed"}';
const timestamp = "1700000000";

function headerFor(body: string, stampedAt = timestamp): string {
  const v1 = createHmac("sha256", secret).update(`${stampedAt}.${body}`).digest("hex");
  return `t=${stampedAt},v1=${v1}`;
}

describe("verifyBitikaWebhook", () => {
  it("accepts a signature over the raw body", async () => {
    await expect(verifyBitikaWebhook(raw, headerFor(raw), secret, 1700000100)).resolves.toBe(true);
  });

  it("rejects a stale timestamp", async () => {
    await expect(verifyBitikaWebhook(raw, headerFor(raw), secret, 1700000000 + 301)).resolves.toBe(
      false,
    );
  });

  it("rejects a body that does not match the signature", async () => {
    await expect(verifyBitikaWebhook(`${raw} `, headerFor(raw), secret, 1700000100)).resolves.toBe(
      false,
    );
  });
});
