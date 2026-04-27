import { Suspense } from "react";
import { Lock, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";
import {
  getIntegrationOverview,
  getIntegrations,
  getRecentIntegrationActivity,
} from "@/features/integrations/server/queries";
import { ConnectorCard } from "@/features/integrations/components/connector-card";
import {
  TimeBreakdownDonut,
  GithubActivityBar,
  LeetcodeProgress,
} from "@/features/charts/lazy";
import { ActivityFeed } from "@/features/integrations/components/activity-feed";
import { BringEverythingTogetherCard } from "@/features/integrations/components/bring-everything-card";
import { RedirectToast } from "@/features/integrations/components/redirect-toast";

export default function IntegrationsPage() {
  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={null}>
        <RedirectToast />
      </Suspense>
      <SidebarBottomSlot>
        <BringEverythingTogetherCard />
      </SidebarBottomSlot>

      <PageHeader
        title="Integrations"
        subtitle="Connect your favorite tools and supercharge your productivity"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-primary-soft"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Integration
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 lg:px-5">
        <div className="space-y-4">
          <Suspense fallback={<ConnectorRowSkeleton />}>
            <ConnectorRow />
          </Suspense>

          <h3 className="mt-2 px-0.5 text-[13px] font-bold">
            Integration Overview
          </h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <Suspense
              fallback={<Skeleton className="h-[230px] rounded-[14px]" />}
            >
              <OverviewSection />
            </Suspense>
          </div>

          <Suspense
            fallback={<Skeleton className="h-[260px] rounded-[14px]" />}
          >
            <ActivitySection />
          </Suspense>

          <div className="flex items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[11.5px] text-muted-foreground-strong">
            <Lock className="h-3.5 w-3.5 text-kpi-green" />
            Your data is safe and secure — OAuth fetchers are still in
            development, so connected providers show
            <span className="font-semibold text-foreground">
              {" "}
              &ldquo;Awaiting sync&rdquo;
            </span>{" "}
            until real provider data lands.
          </div>
        </div>
      </div>
    </div>
  );
}

async function ConnectorRow() {
  const rows = await getIntegrations();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((r) => (
        <ConnectorCard key={r.provider} row={r} />
      ))}
    </div>
  );
}

async function OverviewSection() {
  const o = await getIntegrationOverview();
  return (
    <>
      <TimeBreakdownDonut
        rows={o.timeBreakdown}
        totalHours={o.totalFocusHours}
        totalMinutesRem={o.totalFocusMinutesRemainder}
      />
      <GithubActivityBar
        bars={o.githubBars}
        total={o.githubCommitsThisWeek}
        connected={o.githubConnected}
      />
      <LeetcodeProgress data={o.leetcode} />
    </>
  );
}

async function ActivitySection() {
  const items = await getRecentIntegrationActivity();
  return <ActivityFeed items={items} />;
}

function ConnectorRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-[290px] rounded-[14px]" />
      ))}
    </div>
  );
}
