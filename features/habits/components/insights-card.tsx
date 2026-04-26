import { ChevronRight } from "lucide-react";
import type { HabitInsights } from "@/features/habits/server/queries";

export function InsightsCard({ insights }: { insights: HabitInsights }) {
  const { mostConsistent, needsImprovement, perfectWeekAgo } = insights;

  return (
    <div className="rounded-[14px] border border-border bg-card p-[14px]">
      <div className="mb-3 flex items-center gap-1.5 text-[13.5px] font-bold">
        💡 Insights
      </div>

      <div className="flex flex-col">
        <Row
          label="Most consistent habit"
          name={mostConsistent?.name ?? "—"}
          accent="green"
          right={mostConsistent ? `${mostConsistent.percent}%` : "—"}
          rightAccent="green"
        />
        <Row
          label="Need improvement"
          name={needsImprovement?.name ?? "—"}
          accent="yellow"
          right={needsImprovement ? `${needsImprovement.percent}%` : "—"}
          rightAccent="yellow"
        />
        <div className="flex items-center justify-between pt-2">
          <span className="text-[12px] text-muted-foreground">Perfect week</span>
          <span className="flex items-center gap-1 text-[12px] font-medium text-primary-soft">
            {perfectWeekAgo === null
              ? "—"
              : perfectWeekAgo === 0
                ? "This week"
                : perfectWeekAgo === 1
                  ? "1 week ago"
                  : `${perfectWeekAgo} Weeks ago`}
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  name,
  accent,
  right,
  rightAccent,
}: {
  label: string;
  name: string;
  accent: "green" | "yellow";
  right: string;
  rightAccent: "green" | "yellow";
}) {
  const nameColor = accent === "green" ? "text-kpi-green" : "text-yellow-400";
  const rightColor =
    rightAccent === "green" ? "text-kpi-green" : "text-yellow-400";
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={`text-[13px] font-semibold ${nameColor}`}>{name}</div>
      </div>
      <div className="flex items-center gap-1 text-[12px] font-semibold">
        <span className={rightColor}>{right}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
