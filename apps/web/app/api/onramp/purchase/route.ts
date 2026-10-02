import { assertInvestAmount, demoProfiles } from "@pesasense/core";
import {
  clientSafeOnRampError,
  parseDestination,
  toBitikaPhone,
} from "@pesasense/wallet";
import { getBitikaRamp } from "../../../../lib/bitika";
import { rememberSharedPurchase } from "../../../../lib/shared-purchases";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      amountKes?: number;
      payerPhone?: string;
      destination?: string;
      approvedByUser?: boolean;
      idempotencyKey?: string;
      profileId?: string;
    };

    if (body.approvedByUser !== true) {
      return Response.json(
        { error: "Purchase must be approved by the user." },
        { status: 400 },
      );
    }

    const amountKes = body.amountKes;
    if (typeof amountKes !== "number" || !Number.isInteger(amountKes)) {
      return Response.json(
        { error: "amountKes must be a whole number." },
        { status: 400 },
      );
    }

    if (body.profileId !== "amina" && body.profileId !== "brian") {
      return Response.json({ error: "Choose a known demo profile." }, { status: 400 });
    }
    try {
      assertInvestAmount(demoProfiles[body.profileId], amountKes);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "This amount is not allowed.";
      return Response.json({ error: message }, { status: 400 });
    }

    if (!body.destination || !body.payerPhone || !body.idempotencyKey) {
      return Response.json({ error: "Missing purchase fields." }, { status: 400 });
    }

    parseDestination(body.destination);
    const payerPhone = toBitikaPhone(body.payerPhone);

    const ramp = getBitikaRamp();
    const destination = body.destination.trim();
    const purchase = await ramp.startPurchase({
      amountKes,
      payerPhone,
      destination,
      approvedByUser: true,
      idempotencyKey: body.idempotencyKey,
    });
    rememberSharedPurchase({
      purchase,
      phone: payerPhone,
      profileId: body.profileId,
      destination,
      source: "web",
    });

    return Response.json(purchase);
  } catch (e) {
    const upstream =
      e instanceof Error && e.message.startsWith("Bitika request failed");
    return Response.json(
      { error: clientSafeOnRampError(e, "Could not start the purchase.") },
      { status: upstream ? 502 : 400 },
    );
  }
}
