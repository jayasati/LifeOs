import { Suspense } from "react";
import { parse, isValid } from "date-fns";
import { BarChart3, CheckCircle2, Flame, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";
import {
  getConsistencyPct,
  getHabitInsights,
  getHabitLogDays,
  getHabitsWithWeek,
  getHabitStats,
  startOfMondayWeek,
} from "@/features/habits/server/queries";
import { WeekPicker } from "@/features/habits/components/week-picker";
import { AddHabitDialog } from "@/features/habits/components/add-habit-dialog";
import { HabitGrid } from "@/features/habits/components/habit-grid";
import { HabitCalendar } from "@/features/habits/components/habit-calendar";
import { StreaksCard } from "@/features/habits/components/streaks-card";
import { InsightsCard } from "@/features/habits/components/insights-card";
import { ConsistencyCard } from "@/features/habits/components/consistency-card";
import { ViewAnalyticsButton } from "@/features/habits/components/view-analytics-button";

type SP = Record<string, string | string[] | undefined>;

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseWeekStart(value: string | undefined): Date {
  if (!value) return startOfMondayWeek(new Date());
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed)
    ? startOfMondayWeek(parsed)
    : startOfMondayWeek(new Date());
}

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const weekStart = parseWeekStart(pickStr(sp.w));

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={null}>
        <SidebarConsistencySlot />
      </Suspense>

      <PageHeader
        title="Habits"
        subtitle="Small steps everyday, big changes forever"
        actions={
          <>
            <WeekPicker weekStart={weekStart} />
            <AddHabitDialog />
          </>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 lg:px-5">
          <div className="space-y-3.5">
            <Suspense fallback={<KpiSkeleton />}>
              <StatsRow />
            </Suspense>

            <Suspense fallback={<GridSkeleton />}>
              <GridSection weekStart={weekStart} />
            </Suspense>

            {/* Right rail content folds in below the grid on narrower screens */}
            <div className="grid gap-3.5 pt-2 md:grid-cols-2 xl:hidden">
              <Suspense fallback={<PanelSkeleton h={290} />}>
                <CalendarSection />
              </Suspense>
              <Suspense fallback={<PanelSkeleton h={130} />}>
                <StreaksSection />
              </Suspense>
              <Suspense fallback={<PanelSkeleton h={170} />}>
                <InsightsSection />
              </Suspense>
              <ViewAnalyticsButton />
            </div>
          </div>
        </div>

        <aside className="hidden w-[290px] shrink-0 overflow-y-auto border-l border-border px-3.5 py-4 xl:block">
          <div className="space-y-3.5">
            <Suspense fallback={<PanelSkeleton h={290} />}>
              <CalendarSection />
            </Suspense>
            <Suspense fallback={<PanelSkeleton h={130} />}>
              <StreaksSection />
            </Suspense>
            <Suspense fallback={<PanelSkeleton h={170} />}>
              <InsightsSection />
            </Suspense>
            <ViewAnalyticsButton />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Streaming sections ──────────────────────────────────────────────────────

async function SidebarConsistencySlot() {
  const pct = await getConsistencyPct();
  return (
    <SidebarBottomSlot>
      <ConsistencyCard percent={pct} />
    </SidebarBottomSlot>
  );
}

async function StatsRow() {
  const s = await getHabitStats();
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard
        label="Total Habits"
        value={s.totalHabits}
        sub="Active habits"
        color="green"
        icon={<BarChart3 className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Completed"
        value={s.completedThisWeek}
        sub="This week"
        color="blue"
        icon={<CheckCircle2 className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Current Streak"
        value={s.currentStreak}
        sub="Days"
        subTone="green"
        color="orange"
        icon={<Flame className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Best Streak"
        value={s.bestStreak}
        sub="Days"
        color="purple"
        icon={<Trophy className="h-[22px] w-[22px]" />}
      />
    </div>
  );
}

async function GridSection({ weekStart }: { weekStart: Date }) {
  const rows = await getHabitsWithWeek({ weekStart });
  return <HabitGrid rows={rows} weekStart={weekStart} />;
}

async function CalendarSection() {
  const now = new Date();
  const days = await getHabitLogDays({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  return <HabitCalendar logDays={days} />;
}

async function StreaksSection() {
  const s = await getHabitStats();
  return <StreaksCard current={s.currentStreak} best={s.bestStreak} />;
}

async function InsightsSection() {
  const i = await getHabitInsights();
  return <InsightsCard insights={i} />;
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-[14px]" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return <Skeleton className="h-[420px] rounded-[14px]" />;
}

function PanelSkeleton({ h }: { h: number }) {
  return <Skeleton className="rounded-[14px]" style={{ height: h }} />;
}
