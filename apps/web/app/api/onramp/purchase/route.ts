import {
  BITIKA_MAX_KES,
  BITIKA_MIN_KES,
  parseDestination,
  toBitikaPhone,
} from "@pesasense/wallet";
import { getBitikaRamp } from "../../../../lib/bitika";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      amountKes?: number;
      payerPhone?: string;
      destination?: string;
      approvedByUser?: boolean;
      idempotencyKey?: string;
      surplusFloorKes?: number;
    };

    if (body.approvedByUser !== true) {
      return Response.json({ error: "Purchase must be approved by the user." }, { status: 400 });
    }

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

    if (typeof body.surplusFloorKes === "number" && amountKes > body.surplusFloorKes) {
      return Response.json(
        { error: "This amount is above your safe surplus floor." },
        { status: 400 },
      );
    }

    if (!body.destination || !body.payerPhone || !body.idempotencyKey) {
      return Response.json({ error: "Missing purchase fields." }, { status: 400 });
    }

    parseDestination(body.destination);
    const payerPhone = toBitikaPhone(body.payerPhone);

    const ramp = getBitikaRamp();
    const purchase = await ramp.startPurchase({
      amountKes,
      payerPhone,
      destination: body.destination.trim(),
      approvedByUser: true,
      idempotencyKey: body.idempotencyKey,
    });

    return Response.json(purchase);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Purchase failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
