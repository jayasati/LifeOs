import { Sparkles } from "lucide-react";

export function AiInsights({
  insights,
}: {
  insights: { emoji: string; title: string; body: string }[];
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary-soft" />
        <h3 className="text-[14px] font-bold">AI Insights</h3>
        <span className="text-[10.5px] text-muted-foreground-strong">
          Computed from your data
        </span>
      </div>
      <div className="space-y-1.5">
        {insights.map((i, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 rounded-md bg-surface-2 px-3 py-2"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-base">
              {i.emoji}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold leading-snug">
                {i.title}
              </div>
              {i.body ? (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {i.body}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
