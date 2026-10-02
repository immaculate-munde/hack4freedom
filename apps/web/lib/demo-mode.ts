/** When false, invented Amina/Brian fixtures are not shown in the UI. */
export function isDemoProfileMode(): boolean {
  const source =
    process.env.NEXT_PUBLIC_PROFILE_SOURCE ??
    process.env.PROFILE_SOURCE ??
    "demo";
  return source !== "parsed";
}

export const DEVICE_PROFILE_ID = "device";
