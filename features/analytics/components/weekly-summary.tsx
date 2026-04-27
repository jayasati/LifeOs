import { CheckSquare, ClipboardList, Repeat, Timer } from "lucide-react";

export function WeeklySummary({
  data,
}: {
  data: { tasks: number; focusH: number; habitsPct: number; journals: number };
}) {
  const rows = [
    {
      icon: <CheckSquare className="h-3.5 w-3.5 text-kpi-green" />,
      text: (
        <>
          You completed <strong>{data.tasks} tasks</strong> this week.
        </>
      ),
    },
    {
      icon: <Timer className="h-3.5 w-3.5 text-kpi-blue" />,
      text: (
        <>
          You focused for <strong>{data.focusH}h</strong> across the week.
        </>
      ),
    },
    {
      icon: <Repeat className="h-3.5 w-3.5 text-kpi-orange" />,
      text: (
        <>
          Habit success rate was <strong>{data.habitsPct}%</strong>.
        </>
      ),
    },
    {
      icon: <ClipboardList className="h-3.5 w-3.5 text-primary-soft" />,
      text: (
        <>
          You wrote <strong>{data.journals} journal entries</strong>.
        </>
      ),
    },
  ];
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <h3 className="mb-3 text-[14px] font-bold">Weekly Summary</h3>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border-b border-border py-1.5 text-[12px] text-muted-foreground last:border-b-0"
          >
            {r.icon}
            <span>{r.text}</span>
          </div>
        ))}
      </div>
      <button className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-[11.5px] font-semibold text-primary-soft hover:bg-primary/10">
        View Full Report →
      </button>
    </div>
  );
}
