"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function HabitSuccessBar({
  pct,
  rows,
}: {
  pct: number;
  rows: { day: string; pct: number; completed: number; missed: number }[];
}) {
  const max = Math.max(100, ...rows.map((r) => r.pct));
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold">Habit Success Rate</h3>
        <div className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
          This Week
        </div>
      </div>
      <div className="mt-2 text-[28px] font-extrabold leading-none">
        {pct}%
      </div>
      <div className="mb-2 text-[11px] text-muted-foreground-strong">
        Average across required days
      </div>
      <div className="h-[120px]">
        {rows.every((r) => r.completed === 0 && r.missed === 0) ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground-strong))" }}
              />
              <YAxis hide domain={[0, max]} />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v) => [`${v}%`, "Success"]}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell
                    key={i}
                    fill={
                      r.pct >= 80
                        ? "hsl(var(--kpi-green))"
                        : "hsl(var(--primary) / 0.65)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground-strong">
      No habit data yet.
    </div>
  );
}
