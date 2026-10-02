"use client";

import { useState } from "react";
import { parseSmsBatch, buildProfile } from "@pesasense/core";
import type { FinancialProfile, OnboardingAnswers } from "@pesasense/core";

export function SmsImportForm({
  onProfileReady,
  onDemoFallback,
}: {
  onProfileReady: (profile: FinancialProfile) => void;
  onDemoFallback: () => void;
}) {
  const [smsData, setSmsData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = () => {
    if (!smsData.trim()) return;
    
    setLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        const batch = smsData
          .split(/\n\s*\n/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        
        const parsed = parseSmsBatch(batch);
        
        let onboardingData: OnboardingAnswers = { 
          debts: [], 
          chamaMemberships: [], 
          goal: { kind: "other" } 
        };
        
        try {
          const raw = sessionStorage.getItem("pesasense.onboarding");
          if (raw) {
            const parsedStorage = JSON.parse(raw);
            if (parsedStorage && parsedStorage.answers) {
              onboardingData = parsedStorage.answers;
            }
          }
        } catch (e) {
        }

        const profile = buildProfile({
          transactions: parsed,
          onboarding: onboardingData,
        });
        
        try {
          sessionStorage.removeItem("pesasense.onboarding");
        } catch (e) {
        }

        onProfileReady(profile);
        setLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Not implemented")) {
          setError("Reading a real statement is coming soon. Falling back to the demo profile...");
          setTimeout(() => {
            onDemoFallback();
            setLoading(false);
          }, 1500);
        } else {
          setError("We couldn't read that data. Try pasting the full SMS, or use the demo profile.");
          setLoading(false);
        }
      }
    }, 800);
  };

  return (
    <div className="space-y-4 w-full">
      {loading ? (
        <div className="animate-pulse flex flex-col gap-3 min-h-[160px] rounded-xl border border-line bg-surface p-4">
          <div className="h-5 w-1/3 rounded-full bg-pearl" />
          <div className="h-3 w-3/4 rounded-full bg-pearl" />
          <div className="h-3 w-5/6 rounded-full bg-pearl" />
          <div className="mt-4 h-3 w-1/2 rounded-full bg-pearl" />
          <div className="h-3 w-full rounded-full bg-pearl" />
        </div>
      ) : (
        <textarea
          className="field min-h-[160px] text-sm leading-6 w-full"
          placeholder="Paste your raw M-Pesa transaction messages here..."
          value={smsData}
          onChange={(e) => setSmsData(e.target.value)}
        />
      )}
      
      {error && (
        <p className="rounded-xl bg-brass/10 px-3 py-2 text-xs font-medium text-brass">
          {error}
        </p>
      )}
      
      {!loading && (
        <button 
          onClick={handleAnalyze} 
          disabled={!smsData.trim()}
          className="btn btn-primary w-full py-4 text-base"
        >
          Analyze Data
        </button>
      )}
    </div>
  );
}
