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

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export function ProductiveHoursBar({
  rows,
  peak,
}: {
  rows: { hour: number; minutes: number }[];
  peak: { startHour: number; endHour: number } | null;
}) {
  const data = rows.map((r) => ({
    hour: r.hour,
    minutes: r.minutes,
    label:
      r.hour === 0
        ? "12a"
        : r.hour === 6
          ? "6a"
          : r.hour === 12
            ? "12p"
            : r.hour === 18
              ? "6p"
              : "",
    isPeak:
      peak !== null &&
      r.hour >= peak.startHour &&
      r.hour < peak.endHour,
  }));
  const max = Math.max(...rows.map((r) => r.minutes), 1);

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold">Productive Hours</h3>
        <div className="rounded-md border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground-strong">
          Last 30 days
        </div>
      </div>
      {peak ? (
        <>
          <div className="mt-2 text-[11px] text-muted-foreground-strong">
            Peak focus window
          </div>
          <div className="text-[16px] font-extrabold text-primary-soft">
            {fmtHour(peak.startHour)} – {fmtHour(peak.endHour)}
          </div>
        </>
      ) : (
        <div className="mt-2 text-[12px] text-muted-foreground-strong">
          Not enough data yet.
        </div>
      )}
      <div className="mt-2 h-[110px]">
        {peak === null ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground-strong))" }}
                interval={0}
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
                formatter={(v) => [`${v}m`, "Focus"]}
                labelFormatter={(_, items) => {
                  if (!items?.[0]) return "";
                  const idx = items[0].payload.hour as number;
                  return fmtHour(idx);
                }}
              />
              <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.isPeak
                        ? "hsl(var(--primary))"
                        : "hsl(var(--primary) / 0.35)"
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
      Log a few focus sessions to surface your peak hours.
    </div>
  );
}
