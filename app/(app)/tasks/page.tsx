import { Suspense } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDistinctTags,
  getTaskDueDates,
  getTaskStats,
  getTasks,
} from "@/features/tasks/server/queries";
import {
  type Filter,
  type Sort,
  FILTERS,
  SORTS,
} from "@/features/tasks/schema";
import { FilterChips } from "@/features/tasks/components/filter-chips";
import { SortButton } from "@/features/tasks/components/sort-button";
import { NewTaskDialog } from "@/features/tasks/components/new-task-dialog";
import { TaskTable } from "@/features/tasks/components/task-row";
import { Pagination } from "@/features/tasks/components/pagination";
import { MiniCalendar } from "@/features/tasks/components/mini-calendar";
import { TaskSummaryDonut } from "@/features/charts/lazy";
import { FilterPanel } from "@/features/tasks/components/filter-panel";
import { DailyProgressCard } from "@/features/tasks/components/daily-progress-card";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";

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

export default async function TasksPage({
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
  const page = Math.max(1, Number(pickStr(sp.page)) || 1);
  const search = pickStr(sp.q) ?? undefined;
  const priority = pickStr(sp.priority) as
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | undefined;
  const status = pickStr(sp.status) as
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "OVERDUE"
    | undefined;
  const tag = pickStr(sp.tag);

  const flatSearchParams: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    flatSearchParams[k] = pickStr(v);
  }

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={null}>
        {/* Daily Progress streams in independently */}
        <SidebarDailyProgress />
      </Suspense>

      <PageHeader
        title="Tasks"
        subtitle="Stay organized and get things done 💪"
        searchPlaceholder="Search tasks…"
        actions={<NewTaskDialog />}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 lg:px-5">
          <div className="space-y-3.5">
            {/* KPI row — streams */}
            <Suspense fallback={<KpiSkeleton />}>
              <StatsRow />
            </Suspense>

            {/* Tabs + sort — pure URL state, instant */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterChips active={filter} />
              <SortButton active={sort} />
            </div>

            {/* Task table — streams */}
            <Suspense fallback={<TableSkeleton />}>
              <TaskListSection
                filter={filter}
                sort={sort}
                page={page}
                search={search}
                priority={priority}
                status={status}
                tag={tag}
                flatSearchParams={flatSearchParams}
              />
            </Suspense>

            {/* Right-rail content folds below the table on narrow screens so
                nothing gets squeezed off-screen. */}
            <div className="grid gap-3.5 pt-2 md:grid-cols-2 xl:hidden">
              <Suspense fallback={<PanelSkeleton h={290} />}>
                <CalendarSection />
              </Suspense>
              <Suspense fallback={<PanelSkeleton h={170} />}>
                <DonutSection />
              </Suspense>
              <Suspense fallback={<PanelSkeleton h={260} />}>
                <FilterSection
                  priority={priority}
                  status={status}
                  tag={tag}
                />
              </Suspense>
            </div>
          </div>
        </div>

        <aside className="hidden w-[290px] shrink-0 overflow-y-auto border-l border-border px-3.5 py-4 xl:block">
          <div className="space-y-3.5">
            <Suspense fallback={<PanelSkeleton h={290} />}>
              <CalendarSection />
            </Suspense>
            <Suspense fallback={<PanelSkeleton h={170} />}>
              <DonutSection />
            </Suspense>
            <Suspense fallback={<PanelSkeleton h={260} />}>
              <FilterSection
                priority={priority}
                status={status}
                tag={tag}
              />
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Streaming sub-components ────────────────────────────────────────────────

async function SidebarDailyProgress() {
  const stats = await getTaskStats();
  return (
    <SidebarBottomSlot>
      <DailyProgressCard completed={stats.completed} total={stats.total} />
    </SidebarBottomSlot>
  );
}

async function StatsRow() {
  const stats = await getTaskStats();
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard
        label="All Tasks"
        value={stats.total}
        sub="Total tasks"
        color="blue"
        icon={<ClipboardList className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Completed"
        value={stats.completed}
        sub={`${stats.completionPct}% completed`}
        subTone="green"
        color="green"
        icon={<CheckCircle2 className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Pending"
        value={stats.pending}
        sub={`${stats.pendingPct}% pending`}
        subTone="orange"
        color="orange"
        icon={<Clock className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Overdue"
        value={stats.overdue}
        sub={`${stats.overduePct}% overdue`}
        subTone="red"
        color="red"
        icon={<CalendarDays className="h-[22px] w-[22px]" />}
      />
    </div>
  );
}

async function TaskListSection(props: {
  filter: Filter;
  sort: Sort;
  page: number;
  search?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  tag?: string;
  flatSearchParams: Record<string, string | undefined>;
}) {
  const { rows, totalPages } = await getTasks({
    filter: props.filter,
    sort: props.sort,
    page: props.page,
    search: props.search,
    priorityFilter: props.priority ?? null,
    statusFilter: props.status ?? null,
    tagFilter: props.tag ?? null,
  });
  return (
    <>
      <TaskTable rows={rows} />
      <Pagination
        page={props.page}
        totalPages={totalPages}
        searchParams={props.flatSearchParams}
      />
    </>
  );
}

async function CalendarSection() {
  const dueDays = await getTaskDueDates({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  return <MiniCalendar dueDays={dueDays} />;
}

async function DonutSection() {
  const stats = await getTaskStats();
  return (
    <TaskSummaryDonut
      completed={stats.completed}
      pending={stats.pending}
      overdue={stats.overdue}
      total={stats.total}
    />
  );
}

async function FilterSection({
  priority,
  status,
  tag,
}: {
  priority?: string;
  status?: string;
  tag?: string;
}) {
  const tags = await getDistinctTags();
  return <FilterPanel initial={{ priority, status, tag }} tags={tags} />;
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

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-[34px] rounded-md" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[52px] rounded-md" />
      ))}
    </div>
  );
}

function PanelSkeleton({ h }: { h: number }) {
  return <Skeleton className="rounded-[14px]" style={{ height: h }} />;
}
