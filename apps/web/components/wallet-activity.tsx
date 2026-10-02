"use client";

import type { WalletEvent, WalletEventStatus } from "@pesasense/core";
import { useEffect, useState } from "react";
import { loadWalletEvents, WALLET_EVENTS_CHANGED } from "../lib/wallet-events";
import { Sensi } from "./sensi";

function statusLabel(status: WalletEventStatus): string {
  switch (status) {
    case "quoted":
      return "Quoted";
    case "submitted":
      return "Waiting on M-Pesa";
    case "filled":
      return "Filled";
    case "failed":
      return "Did not finish";
    case "cannot_fill":
      return "Could not fill";
    case "pending_approval":
      return "Waiting for approval";
  }
}

export function WalletActivity({ profileId }: { profileId: string }) {
  const [events, setEvents] = useState<WalletEvent[] | null>(null);

  useEffect(() => {
    // Artificial small delay to show off the skeleton UI as requested by user
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
        <h2 className="font-serif text-xl text-pine">Purchases on this device</h2>
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
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint">
          <Sensi className="h-8 w-8" />
        </span>
        <h2 className="mt-4 font-serif text-xl text-pine">No activity yet</h2>
        <p className="mt-1 text-sm text-slate">Your first habit starts here.</p>
      </section>
    );
  }

  return (
    <section className="card mt-4">
      <h2 className="font-serif text-xl text-pine">Purchases on this device</h2>
      <ul className="mt-3 divide-y divide-sand text-sm">
        {events.map((event) => (
          <li key={event.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-ink">
                {event.amountKes !== undefined ? `KES ${event.amountKes}` : "Purchase"}
                {event.amountSats ? ` · ${event.amountSats} sats` : ""}
              </p>
              {event.destination ? (
                <p className="mt-0.5 break-all text-xs text-ink/55">{event.destination}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-xs font-semibold text-pine">{statusLabel(event.status)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
