import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { assertAppInvestAmount } from "../../../../lib/buffer-gate";

function isParsedOnlyMode(): boolean {
  return (
    process.env.PROFILE_SOURCE === "parsed" ||
    process.env.NEXT_PUBLIC_PROFILE_SOURCE === "parsed"
  );
}

function isFinancialProfile(value: unknown): value is FinancialProfile {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as FinancialProfile).version === 1 &&
    typeof (value as FinancialProfile).surplus === "object"
  );
}
import {
  clientSafeOnRampError,
  parseDestination,
  toBitikaPhone,
} from "@pesasense/wallet";
import type { ProfileId } from "@pesasense/ussd";
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
      profile?: FinancialProfile;
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

    let allowanceProfile: FinancialProfile;
    let storeProfileId: string;

    if (isFinancialProfile(body.profile)) {
      allowanceProfile = body.profile;
      storeProfileId = "device";
    } else if (body.profileId === "amina" || body.profileId === "brian") {
      if (isParsedOnlyMode()) {
        return Response.json(
          {
            error:
              "Demo profiles are disabled. Import M-Pesa messages and try again.",
          },
          { status: 400 },
        );
      }
      allowanceProfile = demoProfiles[body.profileId];
      storeProfileId = body.profileId;
    } else {
      return Response.json(
        { error: "Missing profile. Import your M-Pesa history on this phone." },
        { status: 400 },
      );
    }

    try {
      assertAppInvestAmount(allowanceProfile, amountKes);
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
      profileId: storeProfileId as ProfileId,
      destination,
      source: "web",
    });

    return Response.json(purchase);
  } catch (e) {
    return Response.json(
      { error: clientSafeOnRampError(e, "Could not start the purchase.") },
      { status: 400 },
    );
  }
}
