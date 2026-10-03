"use client";

import { useEffect, useState } from "react";
import type { BuyCadence } from "@pesasense/core";
import { formatKes } from "./format";
import { translate, type Locale } from "./i18n";

const STORAGE_KEY = "pesasense.habit-reminder.v1";

/**
 * A reminder the user chose on this phone.
 * Status "chosen" means they asked to be reminded. It is not a payment.
 */
export type HabitReminder = {
  dayOfMonth: 1;
  amountKes: number;
  cadence: BuyCadence;
  status: "chosen";
  setAt: string;
};

function isReminder(value: unknown): value is HabitReminder {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HabitReminder>;
  return (
    row.dayOfMonth === 1 &&
    typeof row.amountKes === "number" &&
    Number.isInteger(row.amountKes) &&
    row.amountKes > 0 &&
    (row.cadence === "weekly" || row.cadence === "monthly") &&
    row.status === "chosen" &&
    typeof row.setAt === "string"
  );
}

export function readHabitReminder(): HabitReminder | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isReminder(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Saves the reminder. Does not open Invest or send money. */
export function writeHabitReminder(input: {
  amountKes: number;
  cadence: BuyCadence;
}): HabitReminder {
  const reminder: HabitReminder = {
    dayOfMonth: 1,
    amountKes: input.amountKes,
    cadence: input.cadence,
    status: "chosen",
    setAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminder));
  return reminder;
}

function nextFirst(from: Date): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), 1, 9, 0, 0, 0);
  if (next.getTime() <= from.getTime()) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * Asks to show a notification if the browser allows it.
 * A missing API or a denied permission leaves the saved in-app reminder in place.
 * The text never says money was sent.
 */
export async function requestReminderNotification(
  amountKes: number,
  locale: Locale,
): Promise<void> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;

  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (permission !== "granted") return;

  const when = nextFirst(new Date());
  const amount = formatKes(amountKes, locale);
  const title = translate(locale, "habit.reminder.title");
  const body = translate(locale, "habit.reminder.body", { amount });
  const host = globalThis as { TimestampTrigger?: new (timestamp: number) => unknown };
  const TimestampTrigger = host.TimestampTrigger;

  if (TimestampTrigger && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          showTrigger: new TimestampTrigger(when.getTime()),
        } as NotificationOptions);
        return;
      }
    } catch {
      // The in-app reminder is already saved.
    }
  }

  try {
    new Notification(title, {
      body: translate(locale, "habit.reminder.saved", { amount }),
    });
  } catch {
    // Showing the notification can still fail. The in-app reminder stands.
  }
}

export function useHabitReminder(): HabitReminder | null {
  const [reminder, setReminder] = useState<HabitReminder | null>(null);
  useEffect(() => {
    setReminder(readHabitReminder());
  }, []);
  return reminder;
}
