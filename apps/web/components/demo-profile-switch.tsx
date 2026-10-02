"use client";

import { demoProfiles } from "@pesasense/core";
import { useProfile } from "../contexts/profile-context";

/** Switches the profile stored on this phone between the two demo fixtures. */
export function DemoProfileSwitch({ profileId }: { profileId: string }) {
  const { setProfile } = useProfile();
  const thin = profileId === "brian";

  return (
    <button
      type="button"
      className="text-teal underline underline-offset-2"
      onClick={() => setProfile(thin ? demoProfiles.amina : demoProfiles.brian)}
    >
      {thin ? "View Amina" : "View the thin profile"}
    </button>
  );
}
