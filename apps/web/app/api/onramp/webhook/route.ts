import { normalizeBitikaTransaction, purchaseFromBitika, verifyBitikaWebhook } from "@pesasense/wallet";
import { claimWebhookEvent, releaseWebhookEvent } from "../../../../lib/onramp-purchases";
import { syncSharedStatus } from "../../../../lib/shared-purchases";

export async function POST(req: Request) {
  const secret = process.env.BITIKA_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook secret is not configured." }, { status: 500 });
  }

  const raw = await req.text();
  if (!(await verifyBitikaWebhook(raw, req.headers.get("x-bitika-signature"), secret))) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let body: { id?: unknown; data?: unknown };
  try {
    body = JSON.parse(raw) as { id?: unknown; data?: unknown };
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (typeof body.id !== "string" || body.id.trim() === "") {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  let purchase;
  try {
    purchase = purchaseFromBitika(normalizeBitikaTransaction(body.data));
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (!claimWebhookEvent(body.id)) {
    return Response.json({ ok: true, duplicate: true });
  }
  try {
    syncSharedStatus(purchase);
  } catch {
    releaseWebhookEvent(body.id);
    return Response.json({ error: "Could not store the update." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
