import { parseDestination, resolveLightningAddress } from "@pesasense/wallet";
import { apiError } from "../../../../lib/api-error";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { address?: string };
    if (!body.address?.trim()) {
      return apiError("errors.enterLightning", 400);
    }
    const parsed = parseDestination(body.address);
    if (parsed.kind === "lightning_address") {
      const result = await resolveLightningAddress(body.address.trim());
      return Response.json(result);
    }
    return Response.json({
      ok: true,
      domain: parsed.kind,
      message: "Destination format looks valid.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not verify address.";
    return Response.json({ error: message }, { status: 400 });
  }
}
