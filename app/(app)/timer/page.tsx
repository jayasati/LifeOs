import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";
import {
  getAchievements,
  getFocusStats,
  getRecentSessions,
  getTodaysFocus,
} from "@/features/timer/server/queries";
import { ModeTabs } from "@/features/timer/components/mode-tabs";
import { TimerClock } from "@/features/timer/components/timer-clock";
import { TodaysFocusCard } from "@/features/timer/components/todays-focus-card";
import { CurrentTaskCard } from "@/features/timer/components/current-task-card";
import { SessionsList } from "@/features/timer/components/sessions-list";
import { FocusStatsChart } from "@/features/charts/lazy";
import { AchievementsCard } from "@/features/timer/components/achievements-card";
import { HowItWorks } from "@/features/timer/components/how-it-works";
import { FocusTipCard } from "@/features/timer/components/focus-tip-card";
import { SoundToggle } from "@/features/timer/components/sound-toggle";

export default function TimerPage() {
  return (
    <div className="flex h-screen flex-col">
      <SidebarBottomSlot>
        <FocusTipCard />
      </SidebarBottomSlot>

      <PageHeader
        title="Timer"
        subtitle="Stay focused. Beat distraction."
        actions={<SoundToggle />}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 lg:px-5">
          <div className="space-y-4">
            <ModeTabs />

            <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_220px]">
              <Suspense fallback={<Skeleton className="h-[460px] rounded-2xl" />}>
                <TodaysFocusSection />
              </Suspense>

              <TimerClock />

              <CurrentTaskCard />
            </div>

            <HowItWorks />

            {/* Right-rail content folds in below for narrower screens */}
            <div className="grid gap-4 xl:hidden">
              <Suspense fallback={<Skeleton className="h-[280px] rounded-2xl" />}>
                <SessionsSection />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
                <StatsSection />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
                <AchievementsSection />
              </Suspense>
            </div>
          </div>
        </div>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border px-4 py-4 xl:block">
          <div className="space-y-5">
            <Suspense fallback={<Skeleton className="h-[280px] rounded-2xl" />}>
              <SessionsSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
              <StatsSection />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
              <AchievementsSection />
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function TodaysFocusSection() {
  const f = await getTodaysFocus();
  return (
    <TodaysFocusCard
      sessions={f.sessionsToday}
      totalSec={f.totalSecToday}
      goalPct={f.goalPct}
      goalMinutes={f.goalMinutes}
    />
  );
}

async function SessionsSection() {
  const rows = await getRecentSessions({ limit: 6 });
  return <SessionsList rows={rows} />;
}

async function StatsSection() {
  const stats = await getFocusStats({ range: "WEEK" });
  return <FocusStatsChart stats={stats} />;
}

async function AchievementsSection() {
  const a = await getAchievements();
  return <AchievementsCard a={a} />;
}
