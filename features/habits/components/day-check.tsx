"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleHabitLog } from "@/features/habits/server/actions";
import { HABIT_COLOR_HEX, type HabitColor } from "@/features/habits/schema";

export function DayCheck({
  habitId,
  date,
  done,
  future,
  required = true,
  color,
}: {
  habitId: string;
  date: Date;
  done: boolean;
  future: boolean;
  /** false = this weekday is not part of the habit's schedule (CUSTOM mode) */
  required?: boolean;
  color: string;
}) {
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(done);
  const hex = HABIT_COLOR_HEX[(color as HabitColor) ?? "purple"] ?? "#7c5cf6";

  // Non-required days render as a small dash and are not interactive.
  if (!required) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center text-[14px] text-muted-foreground-strong/50"
        aria-label="Not scheduled"
      >
        —
      </span>
    );
  }

  function onClick() {
    if (future) return;
    const next = !optimistic;
    start(async () => {
      setOptimistic(next);
      await toggleHabitLog(habitId, date);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={future}
      aria-label={done ? "Logged" : "Not logged"}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-transform",
        !future && "hover:scale-110",
        future && "opacity-30",
      )}
      style={
        optimistic
          ? { backgroundColor: hex, color: "#fff" }
          : { border: "2px solid #5a607a" }
      }
    >
      {optimistic ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </button>
  );
}
