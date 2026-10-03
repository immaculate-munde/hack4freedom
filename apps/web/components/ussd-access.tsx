"use client";

/**
 * Link this browser's demo profile to the M-Pesa number that will dial USSD.
 * Buys from either side show up in the list below.
 */

import { useCallback, useEffect, useState } from "react";
import { useFormat, useI18n } from "../contexts/language-context";
import { messageFromApi, type ApiErrorBody } from "../lib/api-message";

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

const STATUS_KEYS: Record<string, string> = {
  awaiting_mpesa: "wallet.ussd.status.awaiting_mpesa",
  sending_sats: "wallet.ussd.status.sending_sats",
  filled: "wallet.ussd.status.filled",
  failed: "wallet.ussd.status.failed",
  paid_not_delivered: "wallet.ussd.status.paid_not_delivered",
  cannot_fill: "wallet.ussd.status.cannot_fill",
};

const USSD_ERRORS: Record<string, string> = {
  "This request was refused.": "wallet.ussd.errors.refused",
  "Could not read this request.": "wallet.ussd.errors.unreadable",
  "Choose a known demo profile.": "wallet.ussd.errors.unknownProfile",
  "Enter the M-Pesa number that will dial.": "wallet.ussd.errors.enterDialer",
  "Enter a Kenyan M-Pesa number.": "wallet.ussd.errors.kenyan",
  "Phone number must be a Kenyan M-Pesa number.": "invest.phoneKenyan",
  "Phone number does not look valid.": "invest.phoneInvalid",
  "Enter a Lightning address like name@wallet.com.": "wallet.ussd.errors.badAddress",
  "Enter a Lightning address like name@wallet.com. A demo address ending .invalid cannot receive sats.":
    "wallet.ussd.errors.demoAddress",
  "Too many link attempts. Wait and try again.": "wallet.ussd.errors.tooManyLinks",
  "Could not create a code. Try again.": "wallet.ussd.errors.codeRetry",
  "Could not create a code.": "wallet.ussd.codeFailed",
  "Could not link this number.": "wallet.ussd.linkFailed",
  "Could not load USSD activity.": "wallet.ussd.loadFailed",
  "Too many requests. Wait a minute.": "wallet.ussd.errors.tooManyRequests",
};

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
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  })();
  current[profileId] = phone;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function UssdAccess({ profileId }: { profileId: ProfileId }) {
  const { t, locale } = useI18n();
  const { kes } = useFormat();
  const label = profileId === "brian" ? "Brian" : "Amina";
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serviceCode, setServiceCode] = useState("*384*40401#");
  const [serviceConfigured, setServiceConfigured] = useState(false);

  const explain = useCallback(
    (err: unknown, fallbackKey: string): string => {
      if (!(err instanceof Error)) return t(fallbackKey);
      const message = err.message.trim();
      if (!message) return t(fallbackKey);
      if (!/\s/.test(message)) {
        const translated = t(message);
        if (translated !== message) return translated;
      }
      const key = USSD_ERRORS[message];
      if (key) return t(key);
      return t(fallbackKey);
    },
    [t],
  );

  const resolveBody = useCallback(
    (body: ApiErrorBody, fallbackKey: string): string => {
      if (body.code) {
        const translated = messageFromApi(locale, body, fallbackKey);
        if (translated !== body.code) return translated;
      }
      if (typeof body.error === "string") return explain(new Error(body.error), fallbackKey);
      return t(fallbackKey);
    },
    [explain, locale, t],
  );

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
    const res = await fetch(
      `/api/ussd/activity?phone=${encodeURIComponent(nextPhone)}`,
    );
    const body = (await res.json()) as Activity & ApiErrorBody;
    if (!res.ok) {
      const code = typeof body.code === "string" && !/\s/.test(body.code) ? body.code : "";
      throw new Error(code || (typeof body.error === "string" ? body.error : "wallet.ussd.loadFailed"));
    }
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
          language: locale,
        }),
      });
      const body = (await res.json()) as ApiErrorBody;
      if (!res.ok) {
        setError(resolveBody(body, "wallet.ussd.linkFailed"));
        return;
      }
      writeSaved(profileId, phone.trim());
      await loadActivity(phone);
    } catch (err) {
      setError(explain(err, "wallet.ussd.linkFailed"));
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
          language: locale,
        }),
      });
      const body = (await res.json()) as ApiErrorBody & { code?: string };
      if (!res.ok || !body.code) {
        setError(resolveBody(body, "wallet.ussd.codeFailed"));
        return;
      }
      setCode(body.code);
    } catch (err) {
      setError(explain(err, "wallet.ussd.codeFailed"));
    } finally {
      setBusy(false);
    }
  }

  const linkedName =
    activity?.profileId === "brian" ? "Brian" : activity?.profileId === "amina" ? "Amina" : "";

  return (
    <section className="card">
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">{t("wallet.ussd.kicker")}</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">{t("wallet.ussd.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate">{t("wallet.ussd.body", { name: label })}</p>
      <p className="mt-3 text-sm font-semibold text-ink">
        {t("wallet.ussd.dial", { code: serviceCode })}
        {serviceConfigured ? "" : t("wallet.ussd.example")}
      </p>

      <label className="mt-4 block text-xs text-moss uppercase" htmlFor="ussd-phone">
        {t("wallet.ussd.phoneLabel")}
      </label>
      <input
        id="ussd-phone"
        className="field mt-1"
        inputMode="tel"
        autoComplete="tel"
        placeholder={t("wallet.ussd.phonePlaceholder")}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <label className="mt-4 block text-xs text-moss uppercase" htmlFor="ussd-address">
        {t("wallet.ussd.addressLabel")}
      </label>
      <input
        id="ussd-address"
        className="field mt-1"
        autoComplete="off"
        placeholder={t("wallet.ussd.addressPlaceholder")}
        aria-label={t("wallet.ussd.addressLabel")}
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
          {busy ? t("wallet.ussd.saving") : t("wallet.ussd.link")}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => void createCode()}
        >
          {t("wallet.ussd.getCode")}
        </button>
      </div>
      {code ? (
        <p className="mt-3 text-sm text-ink">
          {t("wallet.ussd.codeHelpLead")} <span className="font-semibold">{t("wallet.ussd.linkWithCode")}</span>{" "}
          {t("wallet.ussd.codeHelpMid")} <span className="font-semibold tabular-nums">{code}</span>
          {t("wallet.ussd.codeHelpEnd")}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
      {activity?.linked ? (
        <p className="mt-3 text-sm text-slate">
          {t("wallet.ussd.linked", { phone: activity.phoneMasked })}
          {linkedName ? t("wallet.ussd.linkedTo", { name: linkedName }) : ""}
          {t("wallet.ussd.period")}
          {activity.hasDestination ? t("wallet.ussd.hasDestination") : t("wallet.ussd.needsDestination")}
        </p>
      ) : null}
      {activity && activity.purchases.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand text-sm">
          {activity.purchases.map((purchase) => (
            <li
              key={purchase.purchaseId}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div>
                <p className="font-semibold text-ink">{kes(purchase.amountKes)}</p>
                <p className="mt-0.5 text-xs text-ink/55">
                  {purchase.source === "ussd" ? t("wallet.ussd.kicker") : t("wallet.ussd.app")} · {purchase.purchaseId}
                </p>
              </div>
              <p className="shrink-0 text-xs font-semibold text-pine">
                {t(STATUS_KEYS[purchase.status] ?? "wallet.ussd.status.in_progress")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
