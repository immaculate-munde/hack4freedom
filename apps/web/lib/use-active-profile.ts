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

export function useActiveProfile(): ActiveProfile {
  const { profile: stored } = useProfile();
  const searchParams = useSearchParams();
  const demoMode = isDemoProfileMode();

  if (stored) {
    return {
      ready: true,
      profile: stored,
      profileId: DEVICE_PROFILE_ID,
      isDemo: false,
      displayName: "there",
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
