import { publicServiceCode, ussdConfigFromEnv } from "@pesasense/ussd";

export const dynamic = "force-dynamic";

export function GET() {
  const service = publicServiceCode(process.env);
  const config = ussdConfigFromEnv(process.env, process.env.NODE_ENV);
  return Response.json(
    {
      serviceCode: service.code,
      serviceCodeConfigured: service.configured,
      provider: config.provider,
      callbackPath: "/api/ussd",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
