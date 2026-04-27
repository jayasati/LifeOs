import { Fragment } from "react";
import { format, getDay } from "date-fns";
import { cn } from "@/lib/utils";

function intensityClass(score: number): string {
  if (score === 0) return "bg-white/[0.04]";
  if (score < 20) return "bg-primary/20";
  if (score < 40) return "bg-primary/40";
  if (score < 70) return "bg-primary/70";
  return "bg-primary";
}

export function ProductivityHeatmap({
  cells,
}: {
  cells: { date: string; score: number }[];
}) {
  // Build a 7-row × 53-column grid (Mon-Sun rows; columns = weeks).
  // First column may be partial — we leave leading days empty until day 0 hits Mon.
  if (cells.length === 0) {
    return (
      <div className="rounded-[14px] border border-border bg-card p-4">
        <h3 className="mb-2 text-[14px] font-bold">Heatmap: Productivity</h3>
        <div className="flex h-[120px] items-center justify-center text-[12px] text-muted-foreground-strong">
          No activity recorded.
        </div>
      </div>
    );
  }

  const firstWeekday = (getDay(new Date(cells[0].date)) + 6) % 7; // Mon=0..Sun=6
  const grid: ({ date: string; score: number } | null)[][] = Array.from(
    { length: 7 },
    () => [],
  );

  let col = 0;
  for (let row = 0; row < firstWeekday; row++) grid[row].push(null);

  for (const c of cells) {
    const wd = (getDay(new Date(c.date)) + 6) % 7;
    grid[wd].push(c);
    if (wd === 6) col++;
    void col;
  }

  // Pad each row to the same length.
  const maxLen = Math.max(...grid.map((r) => r.length));
  for (const row of grid) {
    while (row.length < maxLen) row.push(null);
  }

  // Month labels — show on the first column of each new month.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let c = 0; c < maxLen; c++) {
    const cell = grid.find((row) => row[c] && row[c]!.date)?.[c];
    if (!cell) continue;
    const m = new Date(cell.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: c, label: format(new Date(cell.date), "MMM") });
      lastMonth = m;
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <h3 className="mb-1 text-[14px] font-bold">Heatmap: Productivity</h3>
      <p className="mb-3 text-[11px] text-muted-foreground-strong">
        Each cell is one day. Higher intensity = more done.
      </p>

      <div className="overflow-x-auto">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `auto repeat(${maxLen}, minmax(10px, 1fr))`,
            gridTemplateRows: "auto repeat(7, 12px)",
          }}
        >
          {/* corner */}
          <div />
          {/* month labels row */}
          {Array.from({ length: maxLen }).map((_, c) => {
            const label = monthLabels.find((m) => m.col === c)?.label;
            return (
              <div
                key={`m-${c}`}
                className="text-[8.5px] font-semibold text-muted-foreground-strong"
              >
                {label ?? ""}
              </div>
            );
          })}

          {grid.map((row, r) => (
            <Fragment key={`row-${r}`}>
              <div className="pr-1 text-[8.5px] text-muted-foreground-strong">
                {["Mon", "", "Wed", "", "Fri", "", "Sun"][r]}
              </div>
              {row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  title={
                    cell
                      ? `${cell.date} — ${cell.score} pts`
                      : ""
                  }
                  className={cn(
                    "aspect-square rounded-[2.5px]",
                    cell ? intensityClass(cell.score) : "opacity-0",
                  )}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground-strong">
        <span>Low</span>
        <div className="flex gap-[2px]">
          {[0, 18, 38, 65, 90].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2.5 w-3 rounded-[2px]",
                intensityClass(s),
              )}
            />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
