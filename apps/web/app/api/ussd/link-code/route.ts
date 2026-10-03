/**
 * A short code the handset can enter when the browser and the SIM are not linked yet.
 */

import {
  isProfileId,
  isUssdLang,
  newLinkCode,
  publicServiceCode,
  ussdDestination,
} from "@pesasense/ussd";
import { apiError } from "../../../../lib/api-error";
import { isCrossSite } from "../../../../lib/same-origin";
import { getUssdStore } from "../../../../lib/ussd-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (isCrossSite(req)) {
    return apiError("errors.refused", 403);
  }
  let body: { profileId?: unknown; destination?: unknown; language?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiError("errors.couldNotRead", 400);
  }
  if (typeof body.profileId !== "string" || !isProfileId(body.profileId)) {
    return apiError("errors.knownProfile", 400);
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
    return apiError("errors.enterLightningExample", 400);
  }

  const store = getUssdStore();
  const expiresAt = Date.now() + CODE_TTL_MS;
  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = newLinkCode();
    try {
      store.createLinkCode({
        code,
        profileId: body.profileId,
        destination,
        expiresAt,
      });
      if (isUssdLang(body.language)) store.setLanguage(`code:${code}`, body.language);
      break;
    } catch {
      code = "";
    }
  }
  if (!code) {
    return apiError("errors.codeFailed", 500);
  }

  const service = publicServiceCode(process.env);
  return Response.json(
    {
      code,
      expiresAt: new Date(expiresAt).toISOString(),
      serviceCode: service.code,
      serviceCodeConfigured: service.configured,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
