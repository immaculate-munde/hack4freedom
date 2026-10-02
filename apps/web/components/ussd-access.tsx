"use client";

/**
 * Link this browser's demo profile to the M-Pesa number that will dial USSD.
 * Buys from either side show up in the list below.
 */

import { useCallback, useEffect, useState } from "react";

type ProfileId = "amina" | "brian";

interface ActivityPurchase {
  purchaseId: string;
  amountKes: number;
  status: string;
  source: "web" | "ussd";
  at: string;
}

interface Activity {
  phoneMasked: string;
  linked: boolean;
  profileId: ProfileId | null;
  hasDestination: boolean;
  serviceCode: string;
  serviceCodeConfigured: boolean;
  purchases: ActivityPurchase[];
}

const STORAGE_KEY = "pesasense.ussd-phone.v1";

function statusLabel(status: string): string {
  switch (status) {
    case "awaiting_mpesa":
      return "Waiting for M-Pesa PIN";
    case "sending_sats":
      return "Sending sats";
    case "filled":
      return "Filled";
    case "failed":
      return "Did not finish";
    case "paid_not_delivered":
      return "Paid, sats not sent yet";
    case "cannot_fill":
      return "Could not fill";
    default:
      return "In progress";
  }
}

function readSaved(profileId: ProfileId): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Partial<Record<ProfileId, string>>;
    return typeof parsed[profileId] === "string" ? parsed[profileId] : "";
  } catch {
    return "";
  }
}

function writeSaved(profileId: ProfileId, phone: string): void {
  const current = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();
  current[profileId] = phone;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function UssdAccess({ profileId }: { profileId: ProfileId }) {
  const label = profileId === "brian" ? "Brian" : "Amina";
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serviceCode, setServiceCode] = useState("*384*40401#");
  const [serviceConfigured, setServiceConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ussd/config")
      .then((res) => res.json())
      .then((body: { serviceCode?: string; serviceCodeConfigured?: boolean }) => {
        if (cancelled) return;
        if (typeof body.serviceCode === "string") setServiceCode(body.serviceCode);
        setServiceConfigured(Boolean(body.serviceCodeConfigured));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const loadActivity = useCallback(async (nextPhone: string) => {
    const res = await fetch(`/api/ussd/activity?phone=${encodeURIComponent(nextPhone)}`);
    const body = (await res.json()) as Activity & { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Could not load USSD activity.");
    setActivity(body);
    if (body.serviceCode) setServiceCode(body.serviceCode);
    setServiceConfigured(body.serviceCodeConfigured);
  }, []);

  useEffect(() => {
    const saved = readSaved(profileId);
    setPhone(saved);
    setActivity(null);
    setCode(null);
    setError(null);
    if (!saved) return;
    void loadActivity(saved).catch(() => undefined);
  }, [loadActivity, profileId]);

  useEffect(() => {
    if (!phone.trim() || !activity) return;
    const timer = window.setInterval(() => {
      void loadActivity(phone).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activity, loadActivity, phone]);

  async function linkPhone() {
    setBusy(true);
    setError(null);
    setCode(null);
    try {
      const res = await fetch("/api/ussd/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          profileId,
          destination: destination.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not link this number.");
      writeSaved(profileId, phone.trim());
      await loadActivity(phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link this number.");
    } finally {
      setBusy(false);
    }
  }

  async function createCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ussd/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          destination: destination.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok || !body.code) throw new Error(body.error ?? "Could not create a code.");
      setCode(body.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">USSD</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Use this on a handset</h2>
      <p className="mt-2 text-sm leading-6 text-slate">
        Dial from the M-Pesa line you link to {label}. Surplus, habit, and buys use the same
        rules as this screen. Statements stay on this phone. You confirm every buy.
      </p>
      <p className="mt-3 text-sm font-semibold text-ink">
        Dial {serviceCode}
        {serviceConfigured ? "" : " (example until USSD_SERVICE_CODE is set)"}
      </p>

      <label className="mt-4 block text-xs text-moss uppercase" htmlFor="ussd-phone">
        M-Pesa phone
      </label>
      <input
        id="ussd-phone"
        className="field mt-1"
        inputMode="tel"
        autoComplete="tel"
        placeholder="07XX XXX XXX"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <label className="mt-4 block text-xs text-moss uppercase" htmlFor="ussd-address">
        Lightning address
      </label>
      <input
        id="ussd-address"
        className="field mt-1"
        autoComplete="off"
        placeholder="name@wallet.com"
        value={destination}
        onChange={(event) => setDestination(event.target.value)}
      />
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || phone.trim() === ""}
          onClick={() => void linkPhone()}
        >
          {busy ? "Saving…" : "Link this number"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => void createCode()}
        >
          Get a 6-digit code
        </button>
      </div>
      {code ? (
        <p className="mt-3 text-sm text-ink">
          On the handset choose <span className="font-semibold">Link with code</span> and enter{" "}
          <span className="font-semibold tabular-nums">{code}</span>. It lasts 15 minutes.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
      {activity?.linked ? (
        <p className="mt-3 text-sm text-slate">
          {activity.phoneMasked} is linked
          {activity.profileId ? ` to ${activity.profileId === "brian" ? "Brian" : "Amina"}` : ""}.
          {activity.hasDestination
            ? " A Lightning address is set."
            : " Set a Lightning address before a USSD buy."}
        </p>
      ) : null}
      {activity && activity.purchases.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand text-sm">
          {activity.purchases.map((purchase) => (
            <li key={purchase.purchaseId} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-ink">KES {purchase.amountKes}</p>
                <p className="mt-0.5 text-xs text-ink/55">
                  {purchase.source === "ussd" ? "USSD" : "App"} · {purchase.purchaseId}
                </p>
              </div>
              <p className="shrink-0 text-xs font-semibold text-pine">
                {statusLabel(purchase.status)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
