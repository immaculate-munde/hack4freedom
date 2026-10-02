"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FinancialProfile } from "@pesasense/core";

interface ProfileContextType {
  profile: FinancialProfile | null;
  setProfile: (profile: FinancialProfile | null) => void;
  isDemo: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<FinancialProfile | null>(null);
  // Default to true until we confirm a valid profile exists in storage
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pesasense.profile");
      if (stored) {
        setProfileState(JSON.parse(stored));
        setIsDemo(false);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const setProfile = (newProfile: FinancialProfile | null) => {
    setProfileState(newProfile);
    if (newProfile) {
      localStorage.setItem("pesasense.profile", JSON.stringify(newProfile));
      setIsDemo(false);
    } else {
      localStorage.removeItem("pesasense.profile");
      setIsDemo(true);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isDemo }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
