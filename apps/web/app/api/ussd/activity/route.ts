/**
 * Buys started on the web or on USSD for one M-Pesa number.
 */

import { publicServiceCode } from "@pesasense/ussd";
import { maskPhone, toBitikaPhone } from "@pesasense/wallet";
import { isCrossSite } from "../../../../lib/same-origin";
import { getUssdStore } from "../../../../lib/ussd-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (isCrossSite(req)) {
    return Response.json({ error: "This request was refused." }, { status: 403 });
  }
  const url = new URL(req.url);
  const rawPhone = url.searchParams.get("phone") ?? "";
  let phone: string;
  try {
    phone = toBitikaPhone(rawPhone);
  } catch {
    return Response.json({ error: "Enter a Kenyan M-Pesa number." }, { status: 400 });
  }

  const store = getUssdStore();
  const attempts = store.hitRate(`activity:${phone}`, Date.now(), 60_000);
  if (attempts > 40) {
    return Response.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const account = store.getAccount(phone);
  const service = publicServiceCode(process.env);
  const purchases = store.listPurchases(phone, 10).map((purchase) => ({
    purchaseId: purchase.purchaseId,
    amountKes: purchase.amountKes,
    amountSats: purchase.amountSats,
    status: purchase.status,
    source: purchase.source,
    at: purchase.createdAt,
  }));

  return Response.json(
    {
      phoneMasked: maskPhone(phone),
      linked: Boolean(account),
      profileId: account?.profileId ?? null,
      hasDestination: Boolean(account?.destination),
      serviceCode: service.code,
      serviceCodeConfigured: service.configured,
      purchases,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
