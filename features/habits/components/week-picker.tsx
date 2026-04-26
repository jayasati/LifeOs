"use client";

import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";

export function WeekPicker({ weekStart }: { weekStart: Date }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const today = startOfWeek(new Date(), { weekStartsOn: 1 });

  function shift(deltaDays: number) {
    const params = new URLSearchParams(sp);
    const next = addDays(weekStart, deltaDays);
    if (isSameDay(next, today)) params.delete("w");
    else params.set("w", format(next, "yyyy-MM-dd"));
    start(() => router.push(`/habits?${params.toString()}`));
  }

  const isThisWeek = isSameDay(weekStart, today);
  const label = isThisWeek
    ? "This Week"
    : `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-sidebar px-3 text-[12.5px] text-muted-foreground">
        {label}
      </div>
      <button
        type="button"
        onClick={() => shift(-7)}
        disabled={pending}
        aria-label="Previous week"
        className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-sidebar text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground disabled:opacity-50"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => shift(7)}
        disabled={pending || isThisWeek}
        aria-label="Next week"
        className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-sidebar text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
