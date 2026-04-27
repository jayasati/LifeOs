"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export function TaskCompletionDonut({
  rate,
  breakdown,
}: {
  rate: number;
  breakdown: { completed: number; pending: number; overdue: number };
}) {
  const slices = [
    { label: "Completed", value: breakdown.completed, color: "hsl(var(--kpi-green))" },
    { label: "Pending", value: breakdown.pending, color: "hsl(var(--kpi-orange))" },
    { label: "Overdue", value: breakdown.overdue, color: "hsl(var(--kpi-red))" },
  ];
  const total = breakdown.completed + breakdown.pending + breakdown.overdue;
  const data =
    total > 0
      ? slices
      : [{ label: "Empty", value: 1, color: "hsl(var(--surface-2))" }];

  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card p-4">
      <h3 className="mb-2 text-[14px] font-bold">Task Completion Rate</h3>
      <div className="flex items-center justify-center">
        <div className="relative h-[130px] w-[130px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={42}
                outerRadius={60}
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
            <div className="text-[22px] font-bold">{rate}%</div>
            {total > 0 && (
              <div className="text-[10px] text-muted-foreground-strong">
                {breakdown.completed} of {total}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="flex-1 text-muted-foreground">{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
