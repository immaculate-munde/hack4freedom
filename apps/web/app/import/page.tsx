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
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-bold">Add your M-Pesa history</h1>
      <p className="text-sm leading-6 text-slate">
        Your statements never leave your phone. Backups are encrypted with your key.
      </p>

      <section className="card space-y-3">
        <h2 className="font-semibold">Upload the M-Pesa statement PDF</h2>
        <input type="file" accept="application/pdf" className="text-sm" />
        <label className="block text-sm">
          The password for your statement
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
              className="btn btn-secondary"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        <p className="text-xs leading-5 text-slate">
          Your password is used once to open the file on your phone. We never save it.
        </p>
        <button type="button" className="btn btn-primary w-full" onClick={analysePdf}>
          Analyse on my phone
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Paste your M-Pesa messages</h2>
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

      <p className="rounded-card bg-mint px-4 py-3 text-sm text-ink">
        About 6 months gives the most realistic picture.
      </p>

      {notice ? <p className="text-sm leading-6 text-ink">{notice}</p> : null}

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => router.push("/overview")}
      >
        Try with Amina&apos;s demo data
      </button>
      <p className="text-xs leading-5 text-slate">
        PesaSense is an independent tool, not affiliated with Safaricom.
      </p>
    </main>
  );
}
