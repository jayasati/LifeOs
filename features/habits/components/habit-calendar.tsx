"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function HabitCalendar({ logDays = [] }: { logDays?: number[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
      out.push(new Date(d));
    }
    return out;
  }, [cursor]);

  const dotSet = new Set(logDays);

  return (
    <div className="rounded-[14px] border border-border bg-card p-[14px]">
      <div className="mb-3 flex items-center gap-1.5 text-[13.5px] font-bold">
        <CalendarDays className="h-[14px] w-[14px]" />
        Habit Calendar
      </div>
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-surface-2 text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-[13px] font-semibold">
          {format(cursor, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-surface-2 text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-semibold text-muted-foreground-strong"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const hasDot = inMonth && dotSet.has(d.getDate());
          return (
            <div
              key={d.toISOString()}
              className="relative flex flex-col items-center justify-center"
            >
              <div
                className={cn(
                  "mx-auto my-px flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[11.5px] transition-colors",
                  !inMonth && "text-muted-foreground-strong/50",
                  inMonth &&
                    !isToday &&
                    "text-muted-foreground hover:bg-primary/15 hover:text-foreground",
                  isToday && "bg-primary font-bold text-white",
                )}
              >
                {d.getDate()}
              </div>
              {hasDot ? (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
