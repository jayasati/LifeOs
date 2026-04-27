import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Flame,
  Sparkles,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Cell = {
  label: string;
  value: string;
  delta: number | null;
  color: "purple" | "green" | "blue" | "orange" | "red";
  icon: React.ReactNode;
};

const ICON_BG: Record<Cell["color"], string> = {
  purple: "bg-primary/15 text-primary-soft",
  green: "bg-kpi-green/15 text-kpi-green",
  blue: "bg-kpi-blue/15 text-kpi-blue",
  orange: "bg-kpi-orange/15 text-kpi-orange",
  red: "bg-kpi-red/15 text-kpi-red",
};

function fmtFocus(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function KpiStrip({
  score,
  scoreDelta,
  tasksCompleted,
  tasksDelta,
  focusTimeMin,
  focusDelta,
  habitSuccessPct,
  habitDelta,
  journalEntries,
  journalDelta,
}: {
  score: number;
  scoreDelta: number | null;
  tasksCompleted: number;
  tasksDelta: number | null;
  focusTimeMin: number;
  focusDelta: number | null;
  habitSuccessPct: number;
  habitDelta: number | null;
  journalEntries: number;
  journalDelta: number | null;
}) {
  const cells: Cell[] = [
    {
      label: "Productivity Score",
      value: `${score}%`,
      delta: scoreDelta,
      color: "purple",
      icon: <Sparkles className="h-[18px] w-[18px]" />,
    },
    {
      label: "Tasks Completed",
      value: String(tasksCompleted),
      delta: tasksDelta,
      color: "green",
      icon: <CheckCircle2 className="h-[18px] w-[18px]" />,
    },
    {
      label: "Focus Time",
      value: fmtFocus(focusTimeMin),
      delta: focusDelta,
      color: "blue",
      icon: <Timer className="h-[18px] w-[18px]" />,
    },
    {
      label: "Habit Success",
      value: `${habitSuccessPct}%`,
      delta: habitDelta,
      color: "orange",
      icon: <Flame className="h-[18px] w-[18px]" />,
    },
    {
      label: "Journal Entries",
      value: String(journalEntries),
      delta: journalDelta,
      color: "red",
      icon: <BookOpen className="h-[18px] w-[18px]" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-[14px] border border-border bg-card px-4 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                ICON_BG[c.color],
              )}
            >
              {c.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-medium text-muted-foreground-strong">
                {c.label}
              </div>
              <div className="truncate text-[20px] font-bold leading-tight">
                {c.value}
              </div>
            </div>
          </div>
          {c.delta !== null && (
            <div
              className={cn(
                "mt-1.5 flex items-center gap-0.5 text-[10.5px] font-semibold",
                c.delta > 0
                  ? "text-kpi-green"
                  : c.delta < 0
                    ? "text-kpi-red"
                    : "text-muted-foreground",
              )}
            >
              {c.delta > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : c.delta < 0 ? (
                <ArrowDown className="h-3 w-3" />
              ) : null}
              {c.delta > 0 ? "+" : ""}
              {c.delta}% vs prior
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
