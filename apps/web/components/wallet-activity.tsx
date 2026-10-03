"use client";

import type { WalletEvent, WalletEventStatus } from "@pesasense/core";
import { useEffect, useState } from "react";
import { useFormat, useI18n } from "../contexts/language-context";
import { loadWalletEvents, WALLET_EVENTS_CHANGED } from "../lib/wallet-events";
import { SensiAvatar } from "./sensi-avatar";
import { SensiBubble } from "./sensi-bubble";

const STATUS_KEYS: Record<WalletEventStatus, string> = {
  quoted: "wallet.activity.status.quoted",
  submitted: "wallet.activity.status.submitted",
  filled: "wallet.activity.status.filled",
  failed: "wallet.activity.status.failed",
  cannot_fill: "wallet.activity.status.cannot_fill",
  pending_approval: "wallet.activity.status.pending_approval",
};

export function WalletActivity({ profileId }: { profileId: string }) {
  const { t } = useI18n();
  const { kes, number } = useFormat();
  const [events, setEvents] = useState<WalletEvent[] | null>(null);

  useEffect(() => {
    const refresh = () => {
      setTimeout(() => {
        setEvents(loadWalletEvents(profileId));
      }, 400);
    };
    refresh();
    window.addEventListener(WALLET_EVENTS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WALLET_EVENTS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [profileId]);

  if (events === null) {
    return (
      <section className="card mt-4">
        <h2 className="font-serif text-xl text-pine">{t("wallet.activity.title")}</h2>
        <ul className="mt-3 divide-y divide-sand text-sm animate-pulse">
          <li className="flex flex-col gap-2 py-3">
            <div className="h-4 w-32 rounded-full bg-pearl" />
            <div className="h-3 w-48 rounded-full bg-pearl" />
          </li>
          <li className="flex flex-col gap-2 py-3">
            <div className="h-4 w-24 rounded-full bg-pearl" />
            <div className="h-3 w-40 rounded-full bg-pearl" />
          </li>
        </ul>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="card mt-4 flex flex-col items-center justify-center py-8 text-center">
        <SensiAvatar size="sm" mood="happy" />
        <h2 className="mt-4 font-serif text-xl text-pine">{t("wallet.activity.emptyTitle")}</h2>
        <SensiBubble tailPosition="bottom">
          <p className="text-sm text-slate">{t("wallet.activity.emptyBody")}</p>
        </SensiBubble>
      </section>
    );
  }

  return (
    <section className="card mt-4">
      <h2 className="font-serif text-xl text-pine">{t("wallet.activity.title")}</h2>
      <ul className="mt-3 divide-y divide-sand text-sm">
        {events.map((event) => (
          <li key={event.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-ink">
                {event.amountKes !== undefined ? kes(event.amountKes) : t("wallet.activity.purchase")}
                {event.amountSats
                  ? ` · ${t("wallet.activity.sats", { sats: number(event.amountSats) })}`
                  : ""}
              </p>
              {event.destination ? (
                <p className="mt-0.5 break-all text-xs text-ink/55">{event.destination}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-xs font-semibold text-pine">{t(STATUS_KEYS[event.status])}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
