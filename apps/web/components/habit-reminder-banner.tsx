"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  acknowledgeReminderForCurrentMonth,
  armHabitReminderOnLoad,
  isReminderDue,
  readHabitReminder,
  type HabitReminder,
} from "../lib/habit-reminder";
import { formatKes } from "../lib/format";

/**
 * Visible when the app is open on/after the 1st and a reminder was saved
 * in a prior month. Complements Notification + setTimeout (which browsers
 * cannot guarantee a month ahead without push/SW).
 */
export function HabitReminderBanner() {
  const [due, setDue] = useState<HabitReminder | null>(null);

  useEffect(() => {
    function refresh() {
      const reminder = readHabitReminder();
      if (reminder && isReminderDue(reminder)) {
        setDue(reminder);
      } else {
        setDue(null);
      }
    }

    armHabitReminderOnLoad();
    refresh();

    const onDue = () => refresh();
    window.addEventListener("pesasense:habit-reminder-due", onDue);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        armHabitReminderOnLoad();
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pesasense:habit-reminder-due", onDue);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!due) return null;

  return (
    <div
      role="status"
      className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-[20px] border border-teal/30 bg-mint px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Reminder for the 1st</p>
        <p className="mt-0.5 text-sm leading-5 text-ink">
          Review {formatKes(due.amountKes)} ({due.cadence}). You approve each
          purchase — nothing is sent on its own.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href="/habit" className="btn btn-accent px-3 py-2 text-xs">
          Open habit
        </Link>
        <button
          type="button"
          className="btn btn-secondary px-3 py-2 text-xs"
          onClick={() => {
            acknowledgeReminderForCurrentMonth();
            setDue(null);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
