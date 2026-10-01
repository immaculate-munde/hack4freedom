import { BITIKA_MAX_KES, BITIKA_MIN_KES, clientSafeOnRampError } from "@pesasense/wallet";
import { getBitikaRamp } from "../../../../lib/bitika";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { amountKes?: number };
    const amountKes = body.amountKes;
    if (typeof amountKes !== "number" || !Number.isInteger(amountKes)) {
      return Response.json({ error: "amountKes must be a whole number." }, { status: 400 });
    }
    if (amountKes < BITIKA_MIN_KES || amountKes > BITIKA_MAX_KES) {
      return Response.json(
        { error: `Amount must be between ${BITIKA_MIN_KES} and ${BITIKA_MAX_KES} KES.` },
        { status: 400 },
      );
    }
    const ramp = getBitikaRamp();
    const quote = await ramp.getQuote({ amountKes });
    return Response.json(quote);
  } catch (e) {
    return Response.json(
      { error: clientSafeOnRampError(e, "Could not fetch a quote.") },
      { status: 502 },
    );
  }
}
