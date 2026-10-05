/**
 * Africa's Talking (and the same field names over JSON) posts each USSD step here.
 * Register this path as the callback: https://<host>/api/ussd
 */

import {
  demoFacts,
  handleUssd,
  ussdConfigFromEnv,
  type UssdPurchaseInput,
} from "@pesasense/ussd";
import { getBitikaRamp } from "../../../lib/bitika";
import { isBufferGateEnabled } from "../../../lib/buffer-gate";
import {
  rememberPurchase,
  recallPurchase,
  isTerminalPurchase,
} from "../../../lib/onramp-purchases";
import { getUssdStore } from "../../../lib/ussd-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function providedKey(
  req: Request,
  bodyText: string,
  contentType: string | null,
): string | null {
  const header = req.headers.get("x-ussd-key")?.trim();
  if (header) return header;
  const authorization = req.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  const url = new URL(req.url);
  const query = url.searchParams.get("key")?.trim();
  if (query) return query;
  if (contentType?.toLowerCase().includes("application/json")) {
    try {
      const parsed = JSON.parse(bodyText) as { apiKey?: unknown };
      if (typeof parsed.apiKey === "string" && parsed.apiKey.trim())
        return parsed.apiKey.trim();
    } catch {
      return null;
    }
  }
  if (contentType?.toLowerCase().includes("application/x-www-form-urlencoded")) {
    const formKey = new URLSearchParams(bodyText).get("apiKey")?.trim();
    if (formKey) return formKey;
  }
  return null;
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const contentType = req.headers.get("content-type");
  const respectBufferGate = isBufferGateEnabled();
  const result = await handleUssd(
    {
      contentType,
      bodyText,
      apiKey: providedKey(req, bodyText, contentType),
    },
    {
      now: () => Date.now(),
      store: getUssdStore(),
      facts: (id) => demoFacts(id, { respectBufferGate }),
      respectBufferGate,
      startPurchase,
      checkStatus,
    },
    ussdConfigFromEnv(process.env, process.env.NODE_ENV),
  );
  return new Response(result.body, {
    status: result.status,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "no-store",
    },
  });
}

async function startPurchase(input: UssdPurchaseInput) {
  const purchase = await getBitikaRamp().startPurchase({
    amountKes: input.amountKes,
    payerPhone: input.phone,
    destination: input.destination,
    approvedByUser: true,
    idempotencyKey: input.idempotencyKey,
  });
  rememberPurchase(purchase);
  return {
    purchaseId: purchase.purchaseId,
    status: purchase.status,
    amountKes: purchase.amountKes,
    amountSats: purchase.amountSats,
  };
}

async function checkStatus(purchaseId: string) {
  const cached = recallPurchase(purchaseId);
  if (cached && isTerminalPurchase(cached.status)) {
    return {
      purchaseId: cached.purchaseId,
      status: cached.status,
      amountKes: cached.amountKes,
      amountSats: cached.amountSats,
    };
  }
  const purchase = await getBitikaRamp().checkStatus(purchaseId);
  rememberPurchase(purchase);
  return {
    purchaseId: purchase.purchaseId,
    status: purchase.status,
    amountKes: purchase.amountKes,
    amountSats: purchase.amountSats,
  };
}
