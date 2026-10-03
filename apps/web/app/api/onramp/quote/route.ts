import { BITIKA_MAX_KES, BITIKA_MIN_KES, clientSafeOnRampCode } from "@pesasense/wallet";
import { apiError } from "../../../../lib/api-error";
import { getBitikaRamp } from "../../../../lib/bitika";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { amountKes?: number };
    const amountKes = body.amountKes;
    if (typeof amountKes !== "number" || !Number.isInteger(amountKes)) {
      return apiError("errors.wholeShillings", 400);
    }
    if (amountKes < BITIKA_MIN_KES || amountKes > BITIKA_MAX_KES) {
      return apiError("errors.amountRange", 400, {
        min: BITIKA_MIN_KES,
        max: BITIKA_MAX_KES,
      });
    }
    const ramp = getBitikaRamp();
    const quote = await ramp.getQuote({ amountKes });
    return Response.json(quote);
  } catch (e) {
    return apiError(clientSafeOnRampCode(e) ?? "errors.quoteFailed", 502);
  }
}
