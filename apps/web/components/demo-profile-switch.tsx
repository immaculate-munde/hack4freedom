"use client";

import { demoProfiles } from "@pesasense/core";
import { useI18n } from "../contexts/language-context";
import { useProfile } from "../contexts/profile-context";

/** Switches the profile stored on this phone between the two demo fixtures. */
export function DemoProfileSwitch({ profileId }: { profileId: string }) {
  const { t } = useI18n();
  const { setProfile } = useProfile();
  const thin = profileId === "brian";

  return (
    <button
      type="button"
      className="text-teal underline underline-offset-2"
      onClick={() => setProfile(thin ? demoProfiles.amina : demoProfiles.brian)}
    >
      {thin ? t("common.viewAmina") : t("common.viewThinProfile")}
    </button>
  );
}
