"use client";

import { useEffect, useState } from "react";
import type { BuyCadence } from "@pesasense/core";

const STORAGE_KEY = "pesasense.habit-reminder.v1";
const LAST_FIRED_KEY = "pesasense.habit-reminder-fired.v1";

/** Browsers clamp setTimeout above ~24.8 days. Longer delays are not reliable. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * A reminder the user chose on this phone.
 * Status "chosen" means they asked to be reminded. It is not a payment.
 *
 * Limits (honest):
 * - Preference always lives in localStorage on this device.
 * - Browser Notification needs permission; denied still keeps the in-app banner.
 * - setTimeout can arm the next 1st only when it is within ~24 days.
 * - Month-ahead delivery without a service worker + push (or Notification Triggers)
 *   is not guaranteed. This repo has no service worker yet.
 * - Prefer in-app banner when the app is open on/after the 1st. No SMS gateway.
 */
export type HabitReminder = {
  dayOfMonth: 1;
  amountKes: number;
  cadence: BuyCadence;
  status: "chosen";
  setAt: string;
};

export type ReminderArmResult = {
  permission: NotificationPermission | "unsupported";
  scheduled: boolean;
  /** Human note for the habit screen. */
  note: string;
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

function monthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function readLastFiredMonth(): string | null {
  try {
    return localStorage.getItem(LAST_FIRED_KEY);
  } catch {
    return null;
  }
}

function writeLastFiredMonth(key: string): void {
  try {
    localStorage.setItem(LAST_FIRED_KEY, key);
  } catch {
    // Banner may still show this visit.
  }
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

function reminderTitle(): string {
  return "PesaSense reminder";
}

function dueBody(amountKes: number): string {
  return `The 1st is a day to review KES ${amountKes}. You approve each purchase. Nothing is sent on its own.`;
}

function showNotification(title: string, body: string): boolean {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return false;
  }
  try {
    new Notification(title, { body });
    return true;
  } catch {
    return false;
  }
}

/**
 * True when the saved reminder should surface for this calendar month:
 * on/after the 1st, not yet acknowledged this month, and not set earlier this month
 * (so "Remind me on the 1st" mid-month waits for the next 1st).
 */
export function isReminderDue(reminder: HabitReminder, now = new Date()): boolean {
  if (now.getDate() < 1) return false;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (new Date(reminder.setAt).getTime() >= startOfMonth) return false;
  return readLastFiredMonth() !== monthKey(now);
}

export function acknowledgeReminderForCurrentMonth(now = new Date()): void {
  writeLastFiredMonth(monthKey(now));
}

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Arms a one-shot timer for the next 1st when the delay fits in setTimeout.
 * Returns whether a timer was scheduled.
 */
export function scheduleReminderTimeout(amountKes: number, from = new Date()): boolean {
  if (typeof window === "undefined") return false;
  const when = nextFirst(from);
  const delay = when.getTime() - from.getTime();
  if (delay <= 0 || delay > MAX_TIMEOUT_MS) return false;

  if (scheduledTimer != null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }

  scheduledTimer = setTimeout(() => {
    scheduledTimer = null;
    const reminder = readHabitReminder();
    if (!reminder || !isReminderDue(reminder)) return;
    showNotification(reminderTitle(), dueBody(amountKes));
    // Leave last-fired unset so the in-app banner still appears if the tab is open.
    window.dispatchEvent(new CustomEvent("pesasense:habit-reminder-due"));
  }, delay);

  return true;
}

/**
 * Asks for Notification permission, confirms save, and schedules when possible.
 * A missing API or a denied permission leaves the saved in-app reminder in place.
 */
export async function requestReminderNotification(amountKes: number): Promise<ReminderArmResult> {
  if (typeof window === "undefined") {
    return {
      permission: "unsupported",
      scheduled: false,
      note: "Reminder saved on this phone. Open the app on the 1st to see it.",
    };
  }

  if (typeof Notification === "undefined") {
    const scheduled = scheduleReminderTimeout(amountKes);
    return {
      permission: "unsupported",
      scheduled,
      note: scheduled
        ? "Reminder saved. This browser has no Notification API; a timer is armed until you close the tab."
        : "Reminder saved on this phone. Open PesaSense on/after the 1st for an in-app banner.",
    };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = "denied";
    }
  }

  const scheduled = scheduleReminderTimeout(amountKes);
  showNotification(
    reminderTitle(),
    `Reminder saved for the 1st (KES ${amountKes}). You approve each purchase.`,
  );

  if (permission !== "granted") {
    return {
      permission,
      scheduled,
      note: scheduled
        ? "Reminder saved. Allow notifications anytime for an alert; a timer is also armed while this tab stays open."
        : "Reminder saved on this phone. Open PesaSense on/after the 1st for an in-app banner. Browsers cannot promise a month-ahead alert without push.",
    };
  }

  return {
    permission,
    scheduled,
    note: scheduled
      ? "Reminder saved. A notification is armed for the next 1st while this tab stays open."
      : "Reminder saved. The next 1st is too far for a reliable timer — open the app on/after the 1st for a banner or notification.",
  };
}

/** Re-arm timer + surface due state when the shell mounts. */
export function armHabitReminderOnLoad(): void {
  const reminder = readHabitReminder();
  if (!reminder) return;
  scheduleReminderTimeout(reminder.amountKes);
  if (isReminderDue(reminder)) {
    showNotification(reminderTitle(), dueBody(reminder.amountKes));
  }
}

export function useHabitReminder(): HabitReminder | null {
  const [reminder, setReminder] = useState<HabitReminder | null>(null);
  useEffect(() => {
    setReminder(readHabitReminder());
  }, []);
  return reminder;
}
