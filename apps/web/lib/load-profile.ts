/**
 * Loads the demo or parsed profile for the designed screens.
 * Parsed mode does not fall back to the hand-written numbers.
 */
import {
  demoProfiles,
  profileSourceFromEnv,
  selectProfile,
  type FinancialProfile,
} from "@pesasense/core";

export type DemoId = "amina" | "brian";

export type LoadedProfile =
  | {
      status: "ready";
      profile: FinancialProfile;
      isDemo: boolean;
      demoId: DemoId;
      persona: string;
    }
  | { status: "not-ready"; reason: string };

/** Read PROFILE_SOURCE and the optional ?profile=brian switch. */
export function loadProfile(profileParam: string | undefined): LoadedProfile {
  const source = profileSourceFromEnv(process.env.PROFILE_SOURCE);
  const demoId: DemoId = profileParam === "brian" ? "brian" : "amina";
  const persona = demoId === "brian" ? "Brian (invented)" : "Amina (invented)";
  const selection =
    source === "parsed"
      ? selectProfile({ source: "parsed", messages: [] })
      : selectProfile({ source: "demo", profile: demoProfiles[demoId] });

  if (selection.status === "not-ready") {
    return { status: "not-ready", reason: selection.reason };
  }

  return {
    status: "ready",
    profile: selection.profile,
    isDemo: selection.isDemo,
    demoId,
    persona,
  };
}
