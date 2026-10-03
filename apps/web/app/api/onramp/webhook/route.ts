import {
  normalizeBitikaTransaction,
  purchaseFromBitika,
  verifyBitikaWebhook,
} from "@pesasense/wallet";
import { apiError } from "../../../../lib/api-error";
import {
  claimWebhookEvent,
  releaseWebhookEvent,
} from "../../../../lib/onramp-purchases";
import { syncSharedStatus } from "../../../../lib/shared-purchases";

export async function POST(req: Request) {
  const secret = process.env.BITIKA_WEBHOOK_SECRET;
  if (!secret) {
    return apiError("errors.webhookSecret", 500);
  }

  const raw = await req.text();
  if (
    !(await verifyBitikaWebhook(raw, req.headers.get("x-bitika-signature"), secret))
  ) {
    return apiError("errors.webhookSignature", 401);
  }

  let body: { id?: unknown; data?: unknown };
  try {
    body = JSON.parse(raw) as { id?: unknown; data?: unknown };
  } catch {
    return apiError("errors.webhookPayload", 400);
  }

  if (typeof body.id !== "string" || body.id.trim() === "") {
    return apiError("errors.webhookPayload", 400);
  }

  let purchase;
  try {
    purchase = purchaseFromBitika(normalizeBitikaTransaction(body.data));
  } catch {
    return apiError("errors.webhookPayload", 400);
  }
  if (!claimWebhookEvent(body.id)) {
    return Response.json({ ok: true, duplicate: true });
  }
  try {
    syncSharedStatus(purchase);
  } catch {
    releaseWebhookEvent(body.id);
    return apiError("errors.webhookStore", 500);
  }

  return Response.json({ ok: true });
}
