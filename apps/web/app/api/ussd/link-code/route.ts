/**
 * A short code the handset can enter when the browser and the SIM are not linked yet.
 */

import { isProfileId, newLinkCode, publicServiceCode, ussdDestination } from "@pesasense/ussd";
import { isCrossSite } from "../../../../lib/same-origin";
import { getUssdStore } from "../../../../lib/ussd-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (isCrossSite(req)) {
    return Response.json({ error: "This request was refused." }, { status: 403 });
  }
  let body: { profileId?: unknown; destination?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Could not read this request." }, { status: 400 });
  }
  if (typeof body.profileId !== "string" || !isProfileId(body.profileId)) {
    return Response.json({ error: "Choose a known demo profile." }, { status: 400 });
  }

  const destination =
    typeof body.destination === "string" && body.destination.trim() !== ""
      ? ussdDestination(body.destination)
      : null;
  if (typeof body.destination === "string" && body.destination.trim() !== "" && !destination) {
    return Response.json(
      { error: "Enter a Lightning address like name@wallet.com." },
      { status: 400 },
    );
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
      break;
    } catch {
      code = "";
    }
  }
  if (!code) {
    return Response.json({ error: "Could not create a code. Try again." }, { status: 500 });
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
