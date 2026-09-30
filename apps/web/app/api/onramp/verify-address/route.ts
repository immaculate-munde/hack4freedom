import { parseDestination, resolveLightningAddress } from "@pesasense/wallet";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { address?: string };
    if (!body.address?.trim()) {
      return Response.json({ error: "Enter a Lightning address." }, { status: 400 });
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
