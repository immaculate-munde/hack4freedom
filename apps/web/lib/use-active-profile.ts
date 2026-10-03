"use client";

import { demoProfiles, type FinancialProfile } from "@pesasense/core";
import { useSearchParams } from "next/navigation";
import { useProfile } from "../contexts/profile-context";
import { DEVICE_PROFILE_ID, isDemoProfileMode } from "./demo-mode";

export type ActiveProfile =
  | {
      ready: true;
      profile: FinancialProfile;
      profileId: string;
      isDemo: boolean;
      displayName: string;
    }
  | { ready: false };

/** The two hand-written fixtures keep these commitment labels even after a habit edit. */
function fixtureIdentity(profile: FinancialProfile): "amina" | "brian" | null {
  if (profile.commitments.some((item) => item.label === "Greenview Apartments")) return "amina";
  if (profile.commitments.some((item) => item.label === "Landlord Demo")) return "brian";
  return null;
}

export function useActiveProfile(): ActiveProfile {
  const { profile: stored } = useProfile();
  const searchParams = useSearchParams();
  const demoMode = isDemoProfileMode();

  if (stored) {
    const fixture = fixtureIdentity(stored);
    return {
      ready: true,
      profile: stored,
      profileId: fixture ?? DEVICE_PROFILE_ID,
      isDemo: fixture !== null,
      displayName: fixture === "brian" ? "Brian" : fixture === "amina" ? "Amina" : "there",
    };
  }

  if (!demoMode) {
    return { ready: false };
  }

  const demoId = searchParams?.get("profile") === "brian" ? "brian" : "amina";
  return {
    ready: true,
    profile: demoProfiles[demoId],
    profileId: demoId,
    isDemo: true,
    displayName: demoId === "brian" ? "Brian" : "Amina",
  };
}
