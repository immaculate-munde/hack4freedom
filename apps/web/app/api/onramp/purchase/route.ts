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
  clientSafeOnRampCode,
  parseDestination,
  toBitikaPhone,
} from "@pesasense/wallet";
import { apiError } from "../../../../lib/api-error";
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
      return apiError("errors.notApproved", 400);
    }

    const amountKes = body.amountKes;
    if (typeof amountKes !== "number" || !Number.isInteger(amountKes)) {
      return apiError("errors.wholeShillings", 400);
    }

    let allowanceProfile: FinancialProfile;
    let storeProfileId: string;

    if (isFinancialProfile(body.profile)) {
      allowanceProfile = body.profile;
      storeProfileId = "device";
    } else if (body.profileId === "amina" || body.profileId === "brian") {
      if (isParsedOnlyMode()) {
        return apiError("errors.demoDisabled", 400);
      }
      allowanceProfile = demoProfiles[body.profileId];
      storeProfileId = body.profileId;
    } else {
      return apiError("errors.missingProfile", 400);
    }

    try {
      assertAppInvestAmount(allowanceProfile, amountKes);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Build a buffer before buying Bitcoin.") {
        return apiError("invest.bufferFirst", 400);
      }
      if (message === "The surplus floor is too small for a buy.") {
        return apiError("invest.floorTooSmall", 400);
      }
      if (/whole number/i.test(message)) return apiError("errors.wholeShillings", 400);
      if (/between/i.test(message)) {
        return Response.json({ error: message }, { status: 400 });
      }
      return apiError("errors.amountNotAllowed", 400);
    }

    if (!body.destination || !body.payerPhone || !body.idempotencyKey) {
      return apiError("errors.missingFields", 400);
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
    return apiError(clientSafeOnRampCode(e) ?? "errors.purchaseFailed", 400);
  }
}
