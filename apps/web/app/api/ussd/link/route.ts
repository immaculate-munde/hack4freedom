/**
 * Link the M-Pesa number that will dial USSD to the demo profile open in this browser.
 */

import { isProfileId, publicServiceCode, ussdDestination } from "@pesasense/ussd";
import { maskPhone, toBitikaPhone } from "@pesasense/wallet";
import { isCrossSite } from "../../../../lib/same-origin";
import { getUssdStore } from "../../../../lib/ussd-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINK_WINDOW_MS = 10 * 60 * 1000;
const LINK_LIMIT = 10;

export async function POST(req: Request) {
  if (isCrossSite(req)) {
    return Response.json({ error: "This request was refused." }, { status: 403 });
  }
  let body: {
    phone?: unknown;
    profileId?: unknown;
    destination?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Could not read this request." }, { status: 400 });
  }
  if (typeof body.profileId !== "string" || !isProfileId(body.profileId)) {
    return Response.json({ error: "Choose a known demo profile." }, { status: 400 });
  }
  if (typeof body.phone !== "string") {
    return Response.json(
      { error: "Enter the M-Pesa number that will dial." },
      { status: 400 },
    );
  }

  let phone: string;
  try {
    phone = toBitikaPhone(body.phone);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enter a Kenyan M-Pesa number.";
    return Response.json({ error: message }, { status: 400 });
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
    return Response.json(
      {
        error:
          "Enter a Lightning address like name@wallet.com. A demo address ending .invalid cannot receive sats.",
      },
      { status: 400 },
    );
  }

  const store = getUssdStore();
  const attempts = store.hitRate(`link:${phone}`, Date.now(), LINK_WINDOW_MS);
  if (attempts > LINK_LIMIT) {
    return Response.json(
      { error: "Too many link attempts. Wait and try again." },
      { status: 429 },
    );
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
