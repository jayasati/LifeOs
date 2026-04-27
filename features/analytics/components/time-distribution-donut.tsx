"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

function fmtHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function TimeDistributionDonut({
  rows,
  totalMinutes,
}: {
  rows: { label: string; minutes: number; color: string }[];
  totalMinutes: number;
}) {
  const safeRows = rows.length > 0 ? rows : [];
  const safe =
    totalMinutes > 0
      ? safeRows
      : [{ label: "No data", minutes: 1, color: "hsl(var(--surface-2))" }];

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <h3 className="mb-3 text-[14px] font-bold">Time Distribution</h3>
      <div className="flex items-center gap-4">
        <div className="relative h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={safe}
                dataKey="minutes"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={1}
                stroke="none"
              >
                {safe.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[18px] font-bold leading-tight">
              {totalMinutes > 0 ? fmtHm(totalMinutes) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground-strong">
              Total focus
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {totalMinutes === 0 ? (
            <div className="text-[12px] text-muted-foreground-strong">
              No focus sessions in this range.
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: r.color }}
                />
                <span className="flex-1 text-muted-foreground">{r.label}</span>
                <span className="font-semibold">{fmtHm(r.minutes)}</span>
                <span className="text-[10.5px] text-muted-foreground-strong">
                  ({Math.round((r.minutes / totalMinutes) * 100)}%)
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
