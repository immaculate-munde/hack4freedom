/**
 * Link the M-Pesa number that will dial USSD to the demo profile open in this browser.
 */

import { isProfileId, isUssdLang, publicServiceCode, ussdDestination } from "@pesasense/ussd";
import { maskPhone, toBitikaPhone } from "@pesasense/wallet";
import { apiError } from "../../../../lib/api-error";
import { isCrossSite } from "../../../../lib/same-origin";
import { getUssdStore } from "../../../../lib/ussd-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINK_WINDOW_MS = 10 * 60 * 1000;
const LINK_LIMIT = 10;

export async function POST(req: Request) {
  if (isCrossSite(req)) {
    return apiError("errors.refused", 403);
  }
  let body: {
    phone?: unknown;
    profileId?: unknown;
    destination?: unknown;
    language?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiError("errors.couldNotRead", 400);
  }
  if (typeof body.profileId !== "string" || !isProfileId(body.profileId)) {
    return apiError("errors.knownProfile", 400);
  }
  if (typeof body.phone !== "string") {
    return apiError("errors.enterDialPhone", 400);
  }

  let phone: string;
  try {
    phone = toBitikaPhone(body.phone);
  } catch {
    return apiError("errors.enterKenyanPhone", 400);
  }

  const destination =
    typeof body.destination === "string" && body.destination.trim() !== ""
      ? ussdDestination(body.destination)
      : null;
  if (
    typeof body.destination === "string" &&
    body.destination.trim() !== "" &&
    !destination
  ) {
    return apiError("errors.enterLightningInvalid", 400);
  }

  const store = getUssdStore();
  const attempts = store.hitRate(`link:${phone}`, Date.now(), LINK_WINDOW_MS);
  if (attempts > LINK_LIMIT) {
    return apiError("errors.tooManyLinks", 429);
  }

  const existing = store.getAccount(phone);
  const savedDestination = destination ?? existing?.destination ?? null;
  store.saveAccount({
    phone,
    profileId: body.profileId,
    destination: savedDestination,
    linkedAt: new Date().toISOString(),
    source: "web",
  });
  if (isUssdLang(body.language)) store.setLanguage(phone, body.language);

  const service = publicServiceCode(process.env);
  console.info(
    JSON.stringify({
      source: "ussd",
      event: "linked",
      phone: maskPhone(phone),
      profileId: body.profileId,
      via: "web",
      hasDestination: Boolean(savedDestination),
    }),
  );

  return Response.json(
    {
      phoneMasked: maskPhone(phone),
      profileId: body.profileId,
      hasDestination: Boolean(savedDestination),
      serviceCode: service.code,
      serviceCodeConfigured: service.configured,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
