import type { UssdInbound } from "./types";

export class UssdParseError extends Error {
  constructor() {
    super("Could not read this request.");
    this.name = "UssdParseError";
  }
}

export function parseUssdBody(
  contentType: string | null,
  bodyText: string,
): UssdInbound {
  if (bodyText.length > 4096) throw new UssdParseError();
  const type = contentType?.toLowerCase() ?? "";
  try {
    if (type.includes("application/json") || bodyText.trim().startsWith("{")) {
      return fromRecord(JSON.parse(bodyText) as unknown);
    }
    return fromRecord(Object.fromEntries(new URLSearchParams(bodyText)));
  } catch (error) {
    if (error instanceof UssdParseError) throw error;
    throw new UssdParseError();
  }
}

function fromRecord(value: unknown): UssdInbound {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UssdParseError();
  }
  const record = value as Record<string, unknown>;
  const sessionId = stringField(record, ["sessionId", "session_id"]);
  const serviceCode = stringField(record, ["serviceCode", "service_code"]);
  const phoneNumber = stringField(record, [
    "phoneNumber",
    "phone_number",
    "msisdn",
    "phone",
  ]);
  const textRaw = stringField(record, ["text"]) ?? "";
  if (!sessionId || !serviceCode || !phoneNumber) throw new UssdParseError();
  return {
    sessionId: sessionId.trim(),
    serviceCode: serviceCode.trim(),
    phoneNumber: phoneNumber.trim(),
    text: textRaw.trim(),
  };
}

function stringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}
