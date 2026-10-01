"use client";

import type { WalletEvent, WalletEventStatus } from "@pesasense/core";
import { useEffect, useState } from "react";
import { loadWalletEvents, WALLET_EVENTS_CHANGED } from "../lib/wallet-events";

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
  const [events, setEvents] = useState<WalletEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(loadWalletEvents(profileId));
    refresh();
    window.addEventListener(WALLET_EVENTS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WALLET_EVENTS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [profileId]);

  if (events.length === 0) return null;

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
