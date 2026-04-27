import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AnalyticsRange,
  getAnalytics,
  getAnalyticsHeatmap,
} from "@/features/analytics/server/queries";
import { RangeTabs } from "@/features/analytics/components/range-tabs";
import { KpiStrip } from "@/features/analytics/components/kpi-strip";
import { ProductivityOverview } from "@/features/analytics/components/productivity-overview";
import { TimeDistributionDonut } from "@/features/analytics/components/time-distribution-donut";
import { HabitSuccessBar } from "@/features/analytics/components/habit-success-bar";
import { TaskCompletionDonut } from "@/features/analytics/components/task-completion-donut";
import { ProductiveHoursBar } from "@/features/analytics/components/productive-hours-bar";
import { MoodOverviewMini } from "@/features/analytics/components/mood-overview-mini";
import { ProductivityHeatmap } from "@/features/analytics/components/productivity-heatmap";
import { AiInsights } from "@/features/analytics/components/ai-insights";
import { WeeklySummary } from "@/features/analytics/components/weekly-summary";

type SP = Record<string, string | string[] | undefined>;
const RANGES: AnalyticsRange[] = ["WEEK", "MONTH"];

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const rawRange = pickStr(sp.range);
  const range: AnalyticsRange = (RANGES as string[]).includes(rawRange ?? "")
    ? (rawRange as AnalyticsRange)
    : "WEEK";

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Analytics"
        subtitle="Insights to help you improve every day"
        actions={<RangeTabs active={range} />}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 lg:px-5">
        <div className="space-y-4">
          <Suspense fallback={<KpiSkeleton />}>
            <KpiSection range={range} />
          </Suspense>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Suspense fallback={<Skeleton className="h-[280px] rounded-[14px]" />}>
              <ProductivitySection range={range} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[280px] rounded-[14px]" />}>
              <TimeDistSection range={range} />
            </Suspense>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Suspense fallback={<Skeleton className="h-[260px] rounded-[14px]" />}>
              <HabitSuccessSection range={range} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[260px] rounded-[14px]" />}>
              <TaskCompletionSection range={range} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[260px] rounded-[14px]" />}>
              <ProductiveHoursSection range={range} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[260px] rounded-[14px]" />}>
              <MoodSection range={range} />
            </Suspense>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
            <Suspense fallback={<Skeleton className="h-[230px] rounded-[14px]" />}>
              <HeatmapSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[230px] rounded-[14px]" />}>
              <InsightsSection range={range} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[230px] rounded-[14px]" />}>
              <WeeklySection range={range} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Streaming sections — each calls getAnalytics(range), cache() dedupes. ──

async function KpiSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return (
    <KpiStrip
      score={a.score}
      scoreDelta={a.scoreDelta}
      tasksCompleted={a.tasksCompleted}
      tasksDelta={a.tasksDelta}
      focusTimeMin={a.focusTimeMin}
      focusDelta={a.focusDelta}
      habitSuccessPct={a.habitSuccessPct}
      habitDelta={a.habitDelta}
      journalEntries={a.journalEntries}
      journalDelta={a.journalDelta}
    />
  );
}

async function ProductivitySection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return <ProductivityOverview data={a.productivityOverview} />;
}

async function TimeDistSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return (
    <TimeDistributionDonut
      rows={a.timeDistribution}
      totalMinutes={a.timeDistribution.reduce((acc, r) => acc + r.minutes, 0)}
    />
  );
}

async function HabitSuccessSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return (
    <HabitSuccessBar pct={a.habitSuccessPct} rows={a.habitSuccessByDay} />
  );
}

async function TaskCompletionSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return (
    <TaskCompletionDonut
      rate={a.taskCompletionRate}
      breakdown={a.taskCompletionBreakdown}
    />
  );
}

async function ProductiveHoursSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return (
    <ProductiveHoursBar
      rows={a.productiveHours}
      peak={a.productiveHoursPeak}
    />
  );
}

async function MoodSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return <MoodOverviewMini rows={a.moodOverview} />;
}

async function HeatmapSection() {
  // Heatmap is always 365 days regardless of range tab — use the slim path
  // so we don't run the entire WEEK pipeline just for the heatmap field.
  const cells = await getAnalyticsHeatmap();
  return <ProductivityHeatmap cells={cells} />;
}

async function InsightsSection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return <AiInsights insights={a.aiInsights} />;
}

async function WeeklySection({ range }: { range: AnalyticsRange }) {
  const a = await getAnalytics({ range });
  return <WeeklySummary data={a.weeklySummary} />;
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-[14px]" />
      ))}
    </div>
  );
}
