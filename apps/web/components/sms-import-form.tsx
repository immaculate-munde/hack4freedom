"use client";

import { useState } from "react";
import { parseSmsBatch } from "@pesasense/core";
import type { FinancialProfile } from "@pesasense/core";
import { useI18n } from "../contexts/language-context";
import {
  buildProfileFromTransactions,
  clearOnboardingDraft,
} from "../lib/profile-from-import";

export function SmsImportForm({
  onProfileReady,
  onDemoFallback,
  initialText = "",
}: {
  onProfileReady: (profile: FinancialProfile) => void;
  onDemoFallback: () => void;
  initialText?: string;
}) {
  const { t } = useI18n();
  const [smsData, setSmsData] = useState(initialText);
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
        const profile = buildProfileFromTransactions(parsed);
        clearOnboardingDraft();
        onProfileReady(profile);
        setLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Not implemented")) {
          setError(t("import.sms.comingSoon"));
          setTimeout(() => {
            onDemoFallback();
            setLoading(false);
          }, 1500);
        } else {
          setError(explainImport(t, message, "import.sms.unreadable"));
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
          placeholder={t("import.sms.placeholder")}
          aria-label={t("import.sms.placeholder")}
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
          {t("import.sms.analyze")}
        </button>
      )}
    </div>
  );
}

const IMPORT_ERRORS: Record<string, string> = {
  "Could not open the PDF. Check the statement password and try again.": "import.pdf.badPassword",
  "Could not read this PDF. Try exporting a fresh M-Pesa statement.": "import.pdf.freshExport",
  "This PDF has no readable text. Try the SMS paste option instead.": "import.pdf.noText",
  "We opened the PDF but could not read transaction rows. Try pasting the same period as M-Pesa SMS messages below, or export a statement with a text table (not a scan).":
    "import.pdf.noRows",
  "Choose your M-Pesa statement PDF first.": "import.pdf.chooseFirst",
  "Enter the password you use to open this PDF.": "import.pdf.enterPassword",
  "Please upload a PDF file.": "import.pdf.pdfOnly",
  "We could not read that PDF. Check the password, or paste SMS messages instead.": "import.pdf.unreadable",
  "We could not see regular money coming in (salary or transfers). This PDF layout may not be supported yet — paste your M-Pesa SMS messages instead.":
    "import.pdf.noIncome",
  "We could not see enough spending or bill payments. Paste M-Pesa SMS messages for a fuller picture.":
    "import.pdf.noSpending",
  "The numbers do not look like a real six-month picture (income and surplus are near zero). Paste M-Pesa SMS messages instead of this PDF for now.":
    "import.pdf.nearZero",
  "We could not build a surplus range from this PDF. Paste M-Pesa SMS messages — that path works today.":
    "import.pdf.noRange",
  "The profile looks too thin to trust. Try SMS paste, or export a longer statement period.":
    "import.pdf.tooThin",
};

export function explainImport(
  t: (key: string, vars?: Record<string, string | number>) => string,
  message: string,
  fallbackKey: string,
): string {
  const trimmed = message.trim();
  if (!trimmed) return t(fallbackKey);
  if (!/\s/.test(trimmed)) {
    const translated = t(trimmed);
    if (translated !== trimmed) return translated;
  }
  const key = IMPORT_ERRORS[trimmed];
  if (key) return t(key);
  const few = trimmed.match(/^We only found (\d+) transactions/);
  if (few?.[1]) return t("import.pdf.fewTransactions", { count: few[1] });
  return t(fallbackKey);
}
