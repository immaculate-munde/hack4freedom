/**
 * Add M-Pesa history.
 * The parsers still throw. A failure stays a failure, then the demo profile opens.
 * The password is whatever the user types. It is not saved.
 */
"use client";

import { parseSmsBatch, parseStatement } from "@pesasense/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Two ways in. Neither pretends a parse succeeded. */
export default function ImportPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [messages, setMessages] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function fallBack(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Not implemented")) {
      setNotice("Reading your own statement is coming soon. Here is a demo.");
      router.push("/overview");
      return;
    }
    setNotice(message || "That could not be read.");
  }

  function analysePdf() {
    try {
      parseStatement({ text: "", source: "mpesa_pdf" });
    } catch (error) {
      fallBack(error);
    }
  }

  function analyseSms() {
    const batch = messages
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    try {
      parseSmsBatch(batch);
    } catch (error) {
      fallBack(error);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
        Step 2 of 3 · Safe surplus
      </p>
      <h1 className="text-[28px] leading-9 font-bold tracking-tight text-ink">
        Add your M-Pesa history
      </h1>
      <p className="text-sm leading-6 text-slate">
        Your statements never leave your phone. Backups are encrypted with your key.
      </p>

      <section className="space-y-3 rounded-[20px] bg-white p-5 shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">
          A · Statement
        </p>
        <h2 className="text-base font-semibold text-ink">Upload the M-Pesa PDF</h2>
        <p className="text-sm leading-5 text-slate">
          About six months, from the M-Pesa app. The file stays on this phone.
        </p>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-pearl px-4 py-5 text-center text-sm text-slate">
          <span className="font-semibold text-ink">Tap to choose the PDF</span>
          <span className="mt-1 text-xs">Encrypted PDFs are fine</span>
          <input type="file" accept="application/pdf" className="sr-only" />
        </label>
        <label className="block text-sm text-ink">
          Statement password
          <span className="mt-1 flex gap-2">
            <input
              className="field"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
        <p className="text-xs leading-5 text-slate">
          The password is whatever you type. It is not your ID, and it is not saved.
        </p>
      </section>

      <section className="space-y-3 rounded-[20px] bg-white p-5 shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">
          B · Messages
        </p>
        <h2 className="text-base font-semibold text-ink">Paste your M-Pesa messages</h2>
        <textarea
          className="field min-h-32"
          placeholder="Paste the messages here"
          value={messages}
          onChange={(event) => setMessages(event.target.value)}
        />
        <button type="button" className="btn btn-secondary w-full" onClick={analyseSms}>
          Read my messages
        </button>
      </section>

      <p className="rounded-[18px] bg-mint px-4 py-3 text-sm leading-6 text-ink">
        About 6 months gives the most realistic picture of seasonal spending.
      </p>

      {notice ? (
        <p className="text-sm leading-6 text-ink" role="status">
          {notice}
        </p>
      ) : null}

      <button type="button" className="btn btn-primary w-full" onClick={analysePdf}>
        Analyse on my phone
      </button>
      <button
        type="button"
        className="btn min-h-11 text-sm font-semibold text-slate"
        onClick={() => router.push("/overview")}
      >
        Try with Amina&apos;s demo data
      </button>
      <p className="text-center text-xs leading-5 text-slate">
        PesaSense is an independent tool, not affiliated with Safaricom.
      </p>
    </main>
  );
}
