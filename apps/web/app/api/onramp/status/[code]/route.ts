import { getBitikaRamp } from "../../../../../lib/bitika";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    if (!code || code === "undefined") {
      return Response.json({ error: "Missing transaction code." }, { status: 400 });
    }
    const ramp = getBitikaRamp();
    const purchase = await ramp.checkStatus(code);
    return Response.json(purchase);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status check failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
