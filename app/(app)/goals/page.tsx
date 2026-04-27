import { Suspense } from "react";
import { CheckCircle2, Clock, Target, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";
import {
  type Filter,
  type Sort,
  FILTERS,
  SORTS,
} from "@/features/goals/schema";
import {
  getGoals,
  getGoalStats,
  getGoalStreakDays,
  getUpcomingDeadlines,
} from "@/features/goals/server/queries";
import { FilterTabs } from "@/features/goals/components/filter-tabs";
import { SortButton } from "@/features/goals/components/sort-button";
import { GoalDialog } from "@/features/goals/components/goal-dialog";
import { GoalCard } from "@/features/goals/components/goal-card";
import { GoalsOverviewDonut } from "@/features/charts/lazy";
import { UpcomingDeadlinesCard } from "@/features/goals/components/upcoming-deadlines-card";
import { GoalStreakHeatmap } from "@/features/goals/components/goal-streak-heatmap";
import { TipsCard } from "@/features/goals/components/tips-card";
import { SmallStepsCard } from "@/features/goals/components/small-steps-card";

type SP = Record<string, string | string[] | undefined>;

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
function isFilter(s?: string): s is Filter {
  return !!s && (FILTERS as readonly string[]).includes(s);
}
function isSort(s?: string): s is Sort {
  return !!s && (SORTS as readonly string[]).includes(s);
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter: Filter = isFilter(pickStr(sp.filter))
    ? (pickStr(sp.filter) as Filter)
    : "ALL";
  const sort: Sort = isSort(pickStr(sp.sort))
    ? (pickStr(sp.sort) as Sort)
    : "PRIORITY";

  return (
    <div className="flex h-screen flex-col">
      <SidebarBottomSlot>
        <SmallStepsCard />
      </SidebarBottomSlot>

      <PageHeader
        title="Goals"
        subtitle="Set goals, stay consistent and achieve more."
        actions={<GoalDialog />}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 lg:px-5">
          <div className="space-y-4">
            <Suspense fallback={<KpiSkeleton />}>
              <StatsRow />
            </Suspense>

            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-[16px] font-bold">My Goals</h3>
              <FilterTabs active={filter} />
              <div className="ml-auto">
                <SortButton active={sort} />
              </div>
            </div>

            <Suspense fallback={<ListSkeleton />}>
              <GoalListSection filter={filter} sort={sort} />
            </Suspense>

            {/* Right rail folds in below xl */}
            <div className="grid gap-3 pt-2 md:grid-cols-2 xl:hidden">
              <div className="rounded-[14px] border border-border bg-card p-4">
                <Suspense fallback={<Skeleton className="h-[140px]" />}>
                  <DonutSection />
                </Suspense>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4">
                <Suspense fallback={<Skeleton className="h-[140px]" />}>
                  <DeadlinesSection />
                </Suspense>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4 md:col-span-2">
                <Suspense fallback={<Skeleton className="h-[180px]" />}>
                  <StreakSection />
                </Suspense>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4 md:col-span-2">
                <TipsCard />
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border px-4 py-4 xl:block">
          <div className="space-y-5">
            <Suspense fallback={<Skeleton className="h-[140px]" />}>
              <DonutSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[140px]" />}>
              <DeadlinesSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[180px]" />}>
              <StreakSection />
            </Suspense>
            <TipsCard />
          </div>
        </aside>
      </div>
    </div>
  );
}

async function StatsRow() {
  const s = await getGoalStats();
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard
        label="Total Goals"
        value={s.total}
        sub="All time"
        color="purple"
        icon={<Target className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Completed"
        value={s.completed}
        sub={`${s.completedPct}% completed`}
        subTone="green"
        color="green"
        icon={<CheckCircle2 className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="In Progress"
        value={s.inProgress}
        sub={`${s.inProgressPct}% in progress`}
        subTone="orange"
        color="orange"
        icon={<Clock className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Not Started"
        value={s.notStarted}
        sub={`${s.notStartedPct}% not started`}
        subTone="red"
        color="red"
        icon={<XCircle className="h-[22px] w-[22px]" />}
      />
    </div>
  );
}

async function GoalListSection({
  filter,
  sort,
}: {
  filter: Filter;
  sort: Sort;
}) {
  const goals = await getGoals({ filter, sort });
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <div className="text-3xl">🎯</div>
        <div className="text-[15px] font-semibold">
          {filter === "ALL"
            ? "You haven't set any goals yet."
            : "No goals in this category."}
        </div>
        <div className="max-w-xs text-[12.5px] text-muted-foreground">
          Set a target and break it into small milestones.
        </div>
        <GoalDialog />
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
    </div>
  );
}

async function DonutSection() {
  const s = await getGoalStats();
  return <GoalsOverviewDonut stats={s} />;
}
async function DeadlinesSection() {
  const rows = await getUpcomingDeadlines(3);
  return <UpcomingDeadlinesCard rows={rows} />;
}
async function StreakSection() {
  const now = new Date();
  const streak = await getGoalStreakDays({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  return <GoalStreakHeatmap streak={streak} />;
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-[14px]" />
      ))}
    </div>
  );
}
function ListSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[92px] rounded-[14px]" />
      ))}
    </div>
  );
}
