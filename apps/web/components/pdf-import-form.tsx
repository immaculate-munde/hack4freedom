"use client";

import { useRef, useState } from "react";
import { parseStatement, type FinancialProfile } from "@pesasense/core";
import { extractTextFromMpesaPdf } from "../lib/mpesa-pdf";
import {
  buildProfileFromTransactions,
  clearOnboardingDraft,
} from "../lib/profile-from-import";

export function PdfImportForm({
  onProfileReady,
  onDemoFallback,
}: {
  onProfileReady: (profile: FinancialProfile) => void;
  onDemoFallback: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose your M-Pesa statement PDF first.");
      return;
    }
    if (!password.trim()) {
      setError("Enter the password you use to open this PDF.");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await extractTextFromMpesaPdf(file, password);
      const transactions = parseStatement({ text, source: "mpesa_pdf" });
      if (transactions.length === 0) {
        throw new Error(
          "We opened the PDF but could not read transaction rows. Try pasting the same period as M-Pesa SMS messages below, or export a statement with a text table (not a scan).",
        );
      }
      const profile = buildProfileFromTransactions(transactions);
      clearOnboardingDraft();
      onProfileReady(profile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Not implemented")) {
        setError("Reading a real statement is coming soon. Falling back to the demo profile...");
        setTimeout(() => {
          onDemoFallback();
          setLoading(false);
        }, 1500);
        return;
      }
      setError(
        message ||
          "We could not read that PDF. Check the password, or paste SMS messages instead.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 w-full">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          const name = e.target.files?.[0]?.name ?? null;
          setFileName(name);
          setError(null);
        }}
      />
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sand/80 bg-paper/50 py-10 transition hover:border-teal/40 hover:bg-mint/5"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        <svg
          className="h-8 w-8 text-teal"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="mt-3 text-sm font-semibold text-ink">
          {fileName ?? "Choose PDF statement"}
        </p>
        <p className="mt-1 text-xs text-ink/55">Processed on this phone only</p>
      </button>

      <label className="block text-sm">
        Statement password
        <span className="mt-1 flex gap-2">
          <input
            className="field flex-1"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Whatever opens the file"
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn-secondary shrink-0"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      <p className="text-[11px] leading-4 text-ink/55">
        Used once to decrypt on your phone. Not your ID. Not saved.
      </p>

      {error ? (
        <p className="rounded-xl bg-brass/10 px-3 py-2 text-xs font-medium text-brass">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleAnalyze()}
        disabled={loading || !fileName}
        className="btn btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Reading PDF…
          </>
        ) : (
          "Analyze PDF"
        )}
      </button>
    </div>
  );
}
