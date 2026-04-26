import { ChevronRight } from "lucide-react";
import type { HabitInsights } from "@/features/habits/server/queries";

export function InsightsCard({ insights }: { insights: HabitInsights }) {
  const { mostConsistent, needsImprovement, perfectWeekAgo } = insights;

  return (
    <div className="rounded-[14px] border border-border bg-card p-[14px]">
      <div className="mb-3 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
          💡 Insights
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground-strong">
          4-week avg
        </span>
      </div>

      <div className="flex flex-col">
        <Row
          label="Most consistent habit"
          name={mostConsistent?.name ?? "Add a habit to see this"}
          accent="green"
          right={mostConsistent ? `${mostConsistent.percent}%` : "—"}
          rightAccent="green"
        />
        <Row
          label="Need improvement"
          name={
            needsImprovement?.name ??
            (mostConsistent ? "Everything's on track 🎯" : "—")
          }
          accent={needsImprovement ? "yellow" : "muted"}
          right={needsImprovement ? `${needsImprovement.percent}%` : "—"}
          rightAccent={needsImprovement ? "yellow" : "muted"}
        />
        <div className="flex items-center justify-between pt-2">
          <span className="text-[12px] text-muted-foreground">Perfect week</span>
          <span className="flex items-center gap-1 text-[12px] font-medium text-primary-soft">
            {perfectWeekAgo === null
              ? "Not yet — keep going"
              : perfectWeekAgo === 0
                ? "This week 🎉"
                : perfectWeekAgo === 1
                  ? "1 week ago"
                  : `${perfectWeekAgo} weeks ago`}
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

type Accent = "green" | "yellow" | "muted";

function Row({
  label,
  name,
  accent,
  right,
  rightAccent,
}: {
  label: string;
  name: string;
  accent: Accent;
  right: string;
  rightAccent: Accent;
}) {
  const colorMap: Record<Accent, string> = {
    green: "text-kpi-green",
    yellow: "text-yellow-400",
    muted: "text-muted-foreground-strong",
  };
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={`text-[13px] font-semibold ${colorMap[accent]}`}>
          {name}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[12px] font-semibold">
        <span className={colorMap[rightAccent]}>{right}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
