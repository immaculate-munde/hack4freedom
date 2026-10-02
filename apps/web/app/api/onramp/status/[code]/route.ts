import { clientSafeOnRampError } from "@pesasense/wallet";
import { getBitikaRamp } from "../../../../../lib/bitika";
import {
  isTerminalPurchase,
  recallPurchase,
} from "../../../../../lib/onramp-purchases";
import { syncSharedStatus } from "../../../../../lib/shared-purchases";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    if (!code || code === "undefined") {
      return Response.json({ error: "Missing transaction code." }, { status: 400 });
    }
    const cached = recallPurchase(code);
    if (cached && isTerminalPurchase(cached.status)) {
      return Response.json(cached);
    }
    const ramp = getBitikaRamp();
    const purchase = await ramp.checkStatus(code);
    try {
      syncSharedStatus(purchase);
    } catch {
      return Response.json(purchase);
    }
    return Response.json(purchase);
  } catch (e) {
    return Response.json(
      { error: clientSafeOnRampError(e, "Could not read purchase status.") },
      { status: 502 },
    );
  }
}
