import { Suspense } from "react";
import {
  Bookmark,
  CalendarDays,
  Flame,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";
import {
  getEntries,
  getEntryDays,
  getJournalStats,
  PAGE_SIZE,
} from "@/features/journal/server/queries";
import { NewEntryButton } from "@/features/journal/components/new-entry-button";
import { EntryCard } from "@/features/journal/components/entry-card";
import { JournalCalendar } from "@/features/journal/components/journal-calendar";
import { MoodOverviewDonut } from "@/features/charts/lazy";
import { JournalStatsCard } from "@/features/journal/components/journal-stats-card";
import { DailyReflectionCard } from "@/features/journal/components/daily-reflection-card";

type SP = Record<string, string | string[] | undefined>;

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const search = pickStr(sp.q) ?? undefined;
  const page = Math.max(1, Number(pickStr(sp.page)) || 1);

  const flatSearchParams: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    flatSearchParams[k] = pickStr(v);
  }

  return (
    <div className="flex h-screen flex-col">
      <SidebarBottomSlot>
        <DailyReflectionCard />
      </SidebarBottomSlot>

      <PageHeader
        title="Journal"
        subtitle="Write freely. Reflect deeply. Grow daily."
        searchPlaceholder="Search journal entries…"
        actions={<NewEntryButton />}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 lg:px-5">
          <div className="space-y-4">
            <Suspense fallback={<KpiSkeleton />}>
              <StatsRow />
            </Suspense>

            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold">All Entries</h3>
            </div>

            <Suspense fallback={<ListSkeleton />}>
              <EntryListSection
                search={search}
                page={page}
                flatSearchParams={flatSearchParams}
              />
            </Suspense>

            {/* Right rail content folds in below for narrower screens */}
            <div className="grid gap-4 pt-2 md:grid-cols-2 xl:hidden">
              <div className="rounded-[14px] border border-border bg-card p-4">
                <Suspense fallback={<Skeleton className="h-[260px]" />}>
                  <CalendarSection />
                </Suspense>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4">
                <Suspense fallback={<Skeleton className="h-[140px]" />}>
                  <MoodSection />
                </Suspense>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-4 md:col-span-2">
                <Suspense fallback={<Skeleton className="h-[160px]" />}>
                  <StatsSection />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden w-[260px] shrink-0 overflow-y-auto border-l border-border px-4 py-4 xl:block">
          <div className="space-y-5">
            <Suspense fallback={<Skeleton className="h-[260px]" />}>
              <CalendarSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[140px]" />}>
              <MoodSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[160px]" />}>
              <StatsSection />
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function StatsRow() {
  const s = await getJournalStats();
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <KpiCard
        label="Total Entries"
        value={s.totalEntries}
        sub="All time"
        color="purple"
        icon={<Bookmark className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="This Month"
        value={s.thisMonthCount}
        sub="Entries"
        color="blue"
        icon={<CalendarDays className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Writing Streak"
        value={s.writingStreak}
        sub="Days"
        subTone="green"
        color="orange"
        icon={<Flame className="h-[22px] w-[22px]" />}
      />
      <KpiCard
        label="Longest Streak"
        value={s.longestStreak}
        sub="Days"
        color="green"
        icon={<Trophy className="h-[22px] w-[22px]" />}
      />
    </div>
  );
}

async function EntryListSection({
  search,
  page,
  flatSearchParams,
}: {
  search?: string;
  page: number;
  flatSearchParams: Record<string, string | undefined>;
}) {
  const { rows, totalPages } = await getEntries({ search, page });
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <div className="text-3xl">📝</div>
        <div className="text-[15px] font-semibold">
          {search ? "No entries match your search." : "No journal entries yet."}
        </div>
        <div className="max-w-xs text-[12.5px] text-muted-foreground">
          Start with a single line — even one word counts.
        </div>
        <NewEntryButton />
      </div>
    );
  }
  return (
    <>
      <div className="space-y-3">
        {rows.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
      <PaginationWrapper
        page={page}
        totalPages={totalPages}
        flatSearchParams={flatSearchParams}
      />
    </>
  );
}

function PaginationWrapper(props: {
  page: number;
  totalPages: number;
  flatSearchParams: Record<string, string | undefined>;
}) {
  // Reuse the tasks pagination component but rewrite its base path via a
  // wrapper because it hardcodes /tasks. Cheaper option: inline a small one.
  // For now we render numeric Links manually here.
  if (props.totalPages <= 1) return null;
  const pages = Array.from({ length: props.totalPages }, (_, i) => i + 1);
  return (
    <nav className="flex items-center justify-center gap-1.5 pt-1">
      {pages.map((p) => {
        const params = new URLSearchParams(
          Object.entries(props.flatSearchParams).filter(
            ([, v]) => v !== undefined,
          ) as [string, string][],
        );
        if (p === 1) params.delete("page");
        else params.set("page", String(p));
        const qs = params.toString();
        const href = `/journal${qs ? `?${qs}` : ""}`;
        const active = p === props.page;
        return (
          <a
            key={p}
            href={href}
            className={`flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border text-[12.5px] font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-white"
                : "border-border bg-sidebar text-muted-foreground hover:bg-primary/15 hover:text-foreground"
            }`}
          >
            {p}
          </a>
        );
      })}
    </nav>
  );
}

async function CalendarSection() {
  const now = new Date();
  const days = await getEntryDays({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  return <JournalCalendar entryDays={days} />;
}

async function MoodSection() {
  const s = await getJournalStats();
  return <MoodOverviewDonut moodCounts={s.moodCounts} />;
}

async function StatsSection() {
  const s = await getJournalStats();
  return (
    <JournalStatsCard
      mostActiveDay={s.mostActiveDay}
      avgWords={s.avgWords}
      totalWords={s.totalWords}
      totalTimeWritingMin={s.totalTimeWritingMin}
    />
  );
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
    <div className="space-y-3">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <Skeleton key={i} className="h-[120px] rounded-[14px]" />
      ))}
    </div>
  );
}
