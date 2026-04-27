"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export function MoodOverviewMini({
  rows,
}: {
  rows: { mood: string; emoji: string; count: number; pct: number; color: string }[];
}) {
  const total = rows.reduce((a, b) => a + b.count, 0);
  const data =
    total > 0
      ? rows.filter((r) => r.count > 0)
      : [{ mood: "Empty", count: 1, pct: 100, color: "hsl(var(--surface-2))", emoji: "" }];

  const top = [...rows].sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <h3 className="mb-2 text-[14px] font-bold">Mood Overview</h3>
      <div className="flex items-center gap-3">
        <div className="relative h-[110px] w-[110px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                innerRadius={32}
                outerRadius={50}
                paddingAngle={1}
                stroke="none"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[18px] font-bold">{total}</div>
            <div className="text-[9px] text-muted-foreground-strong">Entries</div>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          {total === 0 ? (
            <div className="text-[12px] text-muted-foreground-strong">
              No journal entries yet.
            </div>
          ) : (
            top.map((r) => (
              <div key={r.mood} className="flex items-center gap-2 text-[12px]">
                <span className="text-[15px] leading-none">{r.emoji}</span>
                <span className="flex-1 text-muted-foreground">{r.mood}</span>
                <span className="font-semibold">{r.pct}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
