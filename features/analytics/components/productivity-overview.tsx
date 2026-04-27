"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type Series = "tasks" | "habits" | "hours";

const SERIES_META: Record<
  Series,
  {
    label: string;
    color: string;
    dotClass: string;
    activeClass: string;
  }
> = {
  tasks: {
    label: "Tasks",
    color: "hsl(var(--primary-soft))",
    dotClass: "bg-primary-soft",
    activeClass: "bg-primary/20 text-primary-soft border-primary/40",
  },
  habits: {
    label: "Habits",
    color: "hsl(var(--kpi-green))",
    dotClass: "bg-kpi-green",
    activeClass: "bg-kpi-green/15 text-kpi-green border-kpi-green/40",
  },
  hours: {
    label: "Hours",
    color: "hsl(var(--kpi-blue))",
    dotClass: "bg-kpi-blue",
    activeClass: "bg-kpi-blue/15 text-kpi-blue border-kpi-blue/40",
  },
};

export function ProductivityOverview({
  data,
}: {
  data: { date: string; label: string; tasks: number; habits: number; hours: number }[];
}) {
  const [active, setActive] = useState<Set<Series>>(
    new Set<Series>(["tasks", "habits", "hours"]),
  );

  function toggle(s: Series) {
    const next = new Set(active);
    if (next.has(s) && next.size > 1) next.delete(s);
    else next.add(s);
    setActive(next);
  }

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold">Productivity Overview</h3>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SERIES_META) as Series[]).map((s) => {
            const isOn = active.has(s);
            const meta = SERIES_META[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                  isOn
                    ? meta.activeClass
                    : "border-border text-muted-foreground-strong hover:text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    meta.dotClass,
                  )}
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-[220px]">
        {data.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground-strong))" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground-strong))" }}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              {active.has("tasks") && (
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke={SERIES_META.tasks.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )}
              {active.has("habits") && (
                <Line
                  type="monotone"
                  dataKey="habits"
                  stroke={SERIES_META.habits.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )}
              {active.has("hours") && (
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke={SERIES_META.hours.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground-strong">
      No data yet.
    </div>
  );
}
