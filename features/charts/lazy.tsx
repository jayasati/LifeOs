"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy-loaded chart barrel.
 *
 * Every chart file imports recharts (~80kb gzipped). If parents imported them
 * statically, recharts would ship in each route's initial JS bundle. Routing
 * those imports through this `"use client"` barrel + `next/dynamic({ ssr: false })`
 * splits each chart (and its share of recharts) into its own JS chunk that's
 * fetched on demand AFTER the route paints.
 *
 * Net effect: smaller initial bundle, faster TTI on /analytics, /dashboard,
 * /goals, /integrations — at the cost of a brief skeleton flash for each
 * chart on first render.
 *
 * Each entry returns a component with the same prop signature as the
 * underlying chart. TypeScript infers the props through the import().then()
 * pattern, so call-sites stay type-safe.
 */

const skeleton = (h: number) => () => (
  <Skeleton className="rounded-[14px]" style={{ height: h }} />
);

// ─── Analytics page charts ────────────────────────────────────────────────────
export const ProductivityOverview = dynamic(
  () =>
    import("@/features/analytics/components/productivity-overview").then(
      (m) => m.ProductivityOverview,
    ),
  { ssr: false, loading: skeleton(280) },
);

export const TimeDistributionDonut = dynamic(
  () =>
    import("@/features/analytics/components/time-distribution-donut").then(
      (m) => m.TimeDistributionDonut,
    ),
  { ssr: false, loading: skeleton(280) },
);

export const HabitSuccessBar = dynamic(
  () =>
    import("@/features/analytics/components/habit-success-bar").then(
      (m) => m.HabitSuccessBar,
    ),
  { ssr: false, loading: skeleton(260) },
);

export const TaskCompletionDonut = dynamic(
  () =>
    import("@/features/analytics/components/task-completion-donut").then(
      (m) => m.TaskCompletionDonut,
    ),
  { ssr: false, loading: skeleton(260) },
);

export const ProductiveHoursBar = dynamic(
  () =>
    import("@/features/analytics/components/productive-hours-bar").then(
      (m) => m.ProductiveHoursBar,
    ),
  { ssr: false, loading: skeleton(260) },
);

export const MoodOverviewMini = dynamic(
  () =>
    import("@/features/analytics/components/mood-overview-mini").then(
      (m) => m.MoodOverviewMini,
    ),
  { ssr: false, loading: skeleton(260) },
);

// ─── Dashboard charts ─────────────────────────────────────────────────────────
export const ProductivityChart = dynamic(
  () =>
    import("@/features/dashboard/components/productivity-chart").then(
      (m) => m.ProductivityChart,
    ),
  { ssr: false, loading: skeleton(230) },
);

// ─── Goals charts ─────────────────────────────────────────────────────────────
export const GoalsOverviewDonut = dynamic(
  () =>
    import("@/features/goals/components/goals-overview-donut").then(
      (m) => m.GoalsOverviewDonut,
    ),
  { ssr: false, loading: skeleton(260) },
);

// ─── Integrations charts ──────────────────────────────────────────────────────
export const GithubActivityBar = dynamic(
  () =>
    import("@/features/integrations/components/github-bar").then(
      (m) => m.GithubActivityBar,
    ),
  { ssr: false, loading: skeleton(230) },
);

export const LeetcodeProgress = dynamic(
  () =>
    import("@/features/integrations/components/leetcode-donut").then(
      (m) => m.LeetcodeProgress,
    ),
  { ssr: false, loading: skeleton(230) },
);

export const TimeBreakdownDonut = dynamic(
  () =>
    import("@/features/integrations/components/time-breakdown-donut").then(
      (m) => m.TimeBreakdownDonut,
    ),
  { ssr: false, loading: skeleton(230) },
);

// ─── Journal charts ───────────────────────────────────────────────────────────
export const MoodOverviewDonut = dynamic(
  () =>
    import("@/features/journal/components/mood-overview-donut").then(
      (m) => m.MoodOverviewDonut,
    ),
  { ssr: false, loading: skeleton(260) },
);

// ─── Tasks charts ─────────────────────────────────────────────────────────────
export const TaskSummaryDonut = dynamic(
  () =>
    import("@/features/tasks/components/task-summary-donut").then(
      (m) => m.TaskSummaryDonut,
    ),
  { ssr: false, loading: skeleton(170) },
);

// ─── Timer charts ─────────────────────────────────────────────────────────────
export const FocusStatsChart = dynamic(
  () =>
    import("@/features/timer/components/focus-stats-chart").then(
      (m) => m.FocusStatsChart,
    ),
  { ssr: false, loading: skeleton(220) },
);
