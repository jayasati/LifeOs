"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/features/analytics/server/queries";

const TABS: { key: AnalyticsRange; label: string }[] = [
  { key: "WEEK", label: "Week" },
  { key: "MONTH", label: "Month" },
];

export function RangeTabs({ active }: { active: AnalyticsRange }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function pick(key: AnalyticsRange) {
    const params = new URLSearchParams(sp);
    if (key === "WEEK") params.delete("range");
    else params.set("range", key);
    start(() => router.push(`/analytics?${params.toString()}`));
  }

  return (
    <div className="flex gap-0.5 rounded-[10px] border border-border bg-card p-1">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => pick(t.key)}
            disabled={pending && isActive}
            className={cn(
              "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              isActive
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
