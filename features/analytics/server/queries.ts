import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";
import { MOODS } from "@/features/journal/schema";

export type AnalyticsRange = "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

const VIOLET = "hsl(var(--primary))";
const VIOLET_SOFT = "hsl(var(--primary-soft))";

export type Analytics = {
  range: AnalyticsRange;
  from: Date;
  to: Date;
  // Top KPIs
  score: number;
  scoreDelta: number | null;
  tasksCompleted: number;
  tasksDelta: number | null;
  focusTimeMin: number;
  focusDelta: number | null;
  habitSuccessPct: number;
  habitDelta: number | null;
  journalEntries: number;
  journalDelta: number | null;
  // Charts
  productivityOverview: {
    date: string;
    label: string;
    tasks: number;
    habits: number;
    hours: number;
  }[];
  timeDistribution: { label: string; minutes: number; color: string }[];
  habitSuccessByDay: {
    day: string;
    completed: number;
    missed: number;
    pct: number;
  }[];
  taskCompletionRate: number;
  taskCompletionBreakdown: {
    completed: number;
    pending: number;
    overdue: number;
  };
  productiveHours: { hour: number; minutes: number }[];
  productiveHoursPeak: { startHour: number; endHour: number } | null;
  moodOverview: { mood: string; count: number; pct: number; color: string; emoji: string }[];
  // Heatmap moved to its own slim getAnalyticsHeatmap() — not on Analytics
  // anymore so the main pipeline doesn't pull a year of data per render.
  aiInsights: { emoji: string; title: string; body: string }[];
  weeklySummary: {
    tasks: number;
    focusH: number;
    habitsPct: number;
    journals: number;
  };
};

function rangeBounds(
  range: AnalyticsRange,
  fromOpt?: Date,
  toOpt?: Date,
): { from: Date; to: Date } {
  const now = new Date();
  if (range === "CUSTOM" && fromOpt && toOpt) {
    return { from: startOfDay(fromOpt), to: endOfDay(toOpt) };
  }
  if (range === "WEEK") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
  if (range === "MONTH") {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  // YEAR
  return { from: addMonths(startOfMonth(now), -11), to: endOfMonth(now) };
}

// React cache() compares args with Object.is — passing { range } from the
// page creates a fresh object each call, so the cache always misses and the
// pipeline runs once per Suspense section. We key the cache on primitives
// instead and expose the original object signature as a thin wrapper.
//
// Cross-request layer: unstable_cache keeps results across renders for 60s,
// invalidated by bumpTag('analytics') in any task/habit/journal/session
// mutation. userId is part of keyParts so each user's cache is isolated.
const _getAnalyticsCoreCached = unstable_cache(
  async (
    userId: string,
    range: AnalyticsRange,
    fromMs: number | null,
    toMs: number | null,
  ): Promise<Analytics> => {
    const { from, to } = rangeBounds(
      range,
      fromMs != null ? new Date(fromMs) : undefined,
      toMs != null ? new Date(toMs) : undefined,
    );

    // Previous period for deltas (same length, immediately before).
    const periodMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodMs);

    const today = startOfDay(new Date());

    // Pull all the raw data in parallel. (Heatmap moved to getAnalyticsHeatmap
    // so this pipeline doesn't pay for 365 days of data on every render.)
    const [
      tasksInRange,
      tasksPrev,
      habitsAll,
      habitLogsRange,
      habitLogsPrev,
      sessionsRange,
      sessionsPrev,
      sessionsHourBucket,
      journalRange,
      journalPrev,
    ] = await Promise.all([
      db.task.findMany({
        where: { userId, completedAt: { gte: from, lte: to } },
        select: { completedAt: true },
      }),
      db.task.count({
        where: { userId, completedAt: { gte: prevFrom, lte: prevTo } },
      }),
      db.habit.findMany({
        where: { userId, archivedAt: null },
        select: {
          id: true,
          name: true,
          frequency: true,
          customDays: true,
          targetPerWeek: true,
          createdAt: true,
          currentStreak: true,
        },
      }),
      db.habitLog.findMany({
        where: {
          completed: true,
          date: { gte: from, lte: to },
          habit: { userId, archivedAt: null },
        },
        select: { date: true, habitId: true },
      }),
      db.habitLog.count({
        where: {
          completed: true,
          date: { gte: prevFrom, lte: prevTo },
          habit: { userId, archivedAt: null },
        },
      }),
      db.pomodoroSession.findMany({
        where: { userId, completed: true, startedAt: { gte: from, lte: to } },
        select: { type: true, startedAt: true, endedAt: true },
      }),
      db.pomodoroSession.findMany({
        where: {
          userId,
          completed: true,
          startedAt: { gte: prevFrom, lte: prevTo },
        },
        select: { startedAt: true, endedAt: true },
      }),
      // For "productive hours" we always look at the last 30 days (range-agnostic
      // — too noisy on a 1-week window).
      db.pomodoroSession.findMany({
        where: {
          userId,
          completed: true,
          type: { in: ["FOCUS", "CUSTOM"] },
          startedAt: { gte: subDays(today, 29) },
        },
        select: { startedAt: true, endedAt: true },
      }),
      db.journalEntry.findMany({
        where: { userId, date: { gte: from, lte: to } },
        select: { date: true, mood: true },
      }),
      db.journalEntry.count({
        where: { userId, date: { gte: prevFrom, lte: prevTo } },
      }),
    ]);

    // ─── KPIs ────────────────────────────────────────────────────────────────
    const tasksCompleted = tasksInRange.length;
    const tasksDelta = pctDelta(tasksCompleted, tasksPrev);

    const focusSec = sessionsRange
      .filter((s) => s.type === "FOCUS" || s.type === "CUSTOM")
      .reduce(
        (a, s) =>
          a +
          (s.endedAt
            ? Math.max(0, (s.endedAt.getTime() - s.startedAt.getTime()) / 1000)
            : 0),
        0,
      );
    const focusTimeMin = Math.round(focusSec / 60);
    const focusPrevSec = sessionsPrev.reduce(
      (a, s) =>
        a +
        (s.endedAt
          ? Math.max(0, (s.endedAt.getTime() - s.startedAt.getTime()) / 1000)
          : 0),
      0,
    );
    const focusDelta = pctDelta(focusTimeMin, Math.round(focusPrevSec / 60));

    const habitSuccessPct = computeHabitSuccessPct(habitsAll, habitLogsRange, from, to);
    const habitPrevPct = computeHabitSuccessPct(habitsAll, [], prevFrom, prevTo);
    // ^ no prev-logs query separately; rough approximation: compute against the
    // logs we already have for the previous range. Fetch them here:
    const habitLogsPrevDetailed = habitLogsPrev > 0
      ? await db.habitLog.findMany({
          where: {
            completed: true,
            date: { gte: prevFrom, lte: prevTo },
            habit: { userId, archivedAt: null },
          },
          select: { date: true, habitId: true },
        })
      : [];
    const habitPrevSuccess = computeHabitSuccessPct(
      habitsAll,
      habitLogsPrevDetailed,
      prevFrom,
      prevTo,
    );
    const habitDelta = pctDelta(habitSuccessPct, habitPrevSuccess);
    void habitPrevPct; // unused fallback

    const journalEntries = journalRange.length;
    const journalDelta = pctDelta(journalEntries, journalPrev);

    // Productivity score: weighted blend of the above against "ideal" targets.
    const score = computeScore({
      tasksCompleted,
      focusTimeMin,
      habitSuccessPct,
      journalEntries,
      rangeDays: Math.max(
        1,
        Math.round((to.getTime() - from.getTime()) / 86_400_000),
      ),
    });
    const prevScore = computeScore({
      tasksCompleted: tasksPrev,
      focusTimeMin: Math.round(focusPrevSec / 60),
      habitSuccessPct: habitPrevSuccess,
      journalEntries: journalPrev,
      rangeDays: Math.max(
        1,
        Math.round((prevTo.getTime() - prevFrom.getTime()) / 86_400_000),
      ),
    });
    const scoreDelta = pctDelta(score, prevScore);

    // ─── Productivity Overview (per-day series) ──────────────────────────────
    const dayList = enumerateDays(from, to);
    const tasksByDay = new Map<string, number>();
    for (const t of tasksInRange) {
      if (t.completedAt) {
        const k = format(startOfDay(t.completedAt), "yyyy-MM-dd");
        tasksByDay.set(k, (tasksByDay.get(k) ?? 0) + 1);
      }
    }
    const habitsByDay = new Map<string, number>();
    for (const l of habitLogsRange) {
      const k = format(startOfDay(l.date), "yyyy-MM-dd");
      habitsByDay.set(k, (habitsByDay.get(k) ?? 0) + 1);
    }
    const focusByDay = new Map<string, number>();
    for (const s of sessionsRange) {
      if (!s.endedAt) continue;
      if (s.type !== "FOCUS" && s.type !== "CUSTOM") continue;
      const k = format(startOfDay(s.startedAt), "yyyy-MM-dd");
      const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      focusByDay.set(k, (focusByDay.get(k) ?? 0) + min);
    }
    const productivityOverview = dayList.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return {
        date: k,
        label:
          dayList.length <= 7
            ? format(d, "EEE")
            : dayList.length <= 31
              ? format(d, "d")
              : format(d, "MMM d"),
        tasks: tasksByDay.get(k) ?? 0,
        habits: habitsByDay.get(k) ?? 0,
        hours: Math.round(((focusByDay.get(k) ?? 0) / 60) * 10) / 10,
      };
    });

    // ─── Time Distribution ───────────────────────────────────────────────────
    const distMap = new Map<string, number>();
    for (const s of sessionsRange) {
      if (!s.endedAt) continue;
      const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      const label =
        s.type === "FOCUS"
          ? "Deep Work"
          : s.type === "CUSTOM"
            ? "Custom"
            : s.type === "SHORT_BREAK"
              ? "Short Breaks"
              : "Long Breaks";
      distMap.set(label, (distMap.get(label) ?? 0) + min);
    }
    const TIME_COLORS: Record<string, string> = {
      "Deep Work": VIOLET,
      Custom: "hsl(var(--kpi-blue))",
      "Short Breaks": "hsl(var(--kpi-green))",
      "Long Breaks": "hsl(var(--kpi-orange))",
    };
    const timeDistribution = [...distMap.entries()].map(([label, minutes]) => ({
      label,
      minutes: Math.round(minutes),
      color: TIME_COLORS[label] ?? VIOLET,
    }));

    // ─── Habit Success per weekday ───────────────────────────────────────────
    const habitSuccessByDay = computeHabitSuccessByDay(
      habitsAll,
      habitLogsRange,
      from,
      to,
    );

    // ─── Task Completion Rate ────────────────────────────────────────────────
    const allTasksRange = await db.task.findMany({
      where: {
        userId,
        OR: [
          { completedAt: { gte: from, lte: to } },
          { createdAt: { gte: from, lte: to } },
          { dueDate: { gte: from, lte: to } },
        ],
      },
      select: { status: true, dueDate: true, completedAt: true },
    });
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    const now = new Date();
    for (const t of allTasksRange) {
      if (t.status === "DONE" || t.completedAt) {
        completed++;
      } else if (t.dueDate && t.dueDate.getTime() < now.getTime()) {
        overdue++;
      } else {
        pending++;
      }
    }
    const totalTasks = completed + pending + overdue;
    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    // ─── Productive Hours (last 30 days) ─────────────────────────────────────
    const hourBuckets = new Array(24).fill(0);
    for (const s of sessionsHourBucket) {
      if (!s.endedAt) continue;
      const h = s.startedAt.getHours();
      const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      hourBuckets[h] += min;
    }
    const productiveHours = hourBuckets.map((minutes, hour) => ({
      hour,
      minutes: Math.round(minutes),
    }));
    const peak = findPeakBlock(hourBuckets);

    // ─── Mood Overview ───────────────────────────────────────────────────────
    const moodCounts = [0, 0, 0, 0, 0, 0]; // 0 unused, 1-5
    for (const e of journalRange) {
      if (e.mood && e.mood >= 1 && e.mood <= 5) moodCounts[e.mood]++;
    }
    const moodTotal = moodCounts.reduce((a, b) => a + b, 0);
    const moodOverview = MOODS.map((m) => ({
      mood: m.label,
      emoji: m.emoji,
      count: moodCounts[m.value],
      pct: moodTotal > 0 ? Math.round((moodCounts[m.value] / moodTotal) * 100) : 0,
      color: m.color,
    }));

    // ─── AI Insights (heuristic) ─────────────────────────────────────────────
    const aiInsights = computeInsights({
      productivityOverview,
      productiveHours,
      habits: habitsAll,
    });

    // ─── Weekly Summary (always week-scoped, regardless of range) ────────────
    const weekFrom = startOfWeek(today, { weekStartsOn: 1 });
    const weekTo = endOfWeek(today, { weekStartsOn: 1 });
    const [weekTasks, weekFocus, weekJournals, weekHabitLogs] = await Promise.all([
      db.task.count({
        where: { userId, completedAt: { gte: weekFrom, lte: weekTo } },
      }),
      db.pomodoroSession.findMany({
        where: {
          userId,
          completed: true,
          type: { in: ["FOCUS", "CUSTOM"] },
          startedAt: { gte: weekFrom, lte: weekTo },
        },
        select: { startedAt: true, endedAt: true },
      }),
      db.journalEntry.count({
        where: { userId, date: { gte: weekFrom, lte: weekTo } },
      }),
      db.habitLog.findMany({
        where: {
          completed: true,
          date: { gte: weekFrom, lte: weekTo },
          habit: { userId, archivedAt: null },
        },
        select: { date: true, habitId: true },
      }),
    ]);
    const weekFocusH =
      Math.round(
        (weekFocus.reduce(
          (a, s) =>
            a +
            (s.endedAt ? (s.endedAt.getTime() - s.startedAt.getTime()) / 3_600_000 : 0),
          0,
        )) * 10,
      ) / 10;
    const weekHabitsPct = computeHabitSuccessPct(
      habitsAll,
      weekHabitLogs,
      weekFrom,
      weekTo,
    );
    const weeklySummary = {
      tasks: weekTasks,
      focusH: weekFocusH,
      habitsPct: weekHabitsPct,
      journals: weekJournals,
    };

    return {
      range,
      from,
      to,
      score,
      scoreDelta,
      tasksCompleted,
      tasksDelta,
      focusTimeMin,
      focusDelta,
      habitSuccessPct,
      habitDelta,
      journalEntries,
      journalDelta,
      productivityOverview,
      timeDistribution,
      habitSuccessByDay,
      taskCompletionRate,
      taskCompletionBreakdown: { completed, pending, overdue },
      productiveHours,
      productiveHoursPeak: peak,
      moodOverview,
      aiInsights,
      weeklySummary,
    };
  },
  ["analytics-core"],
  { tags: ["analytics"], revalidate: 60 },
);

// Per-render dedup on top of the cross-request cache. Without this, two
// Suspense sections that both call getAnalytics() inside the same render
// would each call into unstable_cache (cheap but not free).
const _getAnalyticsRequest = cache(
  (userId: string, range: AnalyticsRange, fromMs: number | null, toMs: number | null) =>
    _getAnalyticsCoreCached(userId, range, fromMs, toMs),
);

export async function getAnalytics(opts: {
  range?: AnalyticsRange;
  from?: Date;
  to?: Date;
} = {}): Promise<Analytics> {
  const userId = await requireDbUserId();
  return _getAnalyticsRequest(
    userId,
    opts.range ?? "WEEK",
    opts.from ? opts.from.getTime() : null,
    opts.to ? opts.to.getTime() : null,
  );
}

// Heatmap is range-agnostic (always trailing 365 days) — calling getAnalytics
// just to pull a.heatmap forces the full KPI/chart pipeline. This dedicated
// path runs only the 3 queries the heatmap actually needs, with the same
// 'analytics' cross-request tag.
const _getAnalyticsHeatmapCached = unstable_cache(
  async (
    userId: string,
  ): Promise<{ date: string; score: number }[]> => {
    const today = startOfDay(new Date());
    const yearAgo = subDays(today, 364);

    const [tasks, habitLogs, sessions] = await Promise.all([
      db.task.findMany({
        where: { userId, completedAt: { gte: yearAgo } },
        select: { completedAt: true },
      }),
      db.habitLog.findMany({
        where: {
          completed: true,
          date: { gte: yearAgo },
          habit: { userId, archivedAt: null },
        },
        select: { date: true },
      }),
      db.pomodoroSession.findMany({
        where: {
          userId,
          completed: true,
          type: { in: ["FOCUS", "CUSTOM"] },
          startedAt: { gte: yearAgo },
        },
        select: { startedAt: true, endedAt: true },
      }),
    ]);

    return computeHeatmap({
      tasks: tasks.map((t) => t.completedAt!).filter(Boolean),
      habits: habitLogs.map((l) => l.date),
      sessions: sessions
        .filter((s) => s.endedAt)
        .map((s) => ({
          start: s.startedAt,
          minutes: (s.endedAt!.getTime() - s.startedAt.getTime()) / 60_000,
        })),
    });
  },
  ["analytics-heatmap"],
  { tags: ["analytics"], revalidate: 60 },
);

export const getAnalyticsHeatmap = cache(async () => {
  const userId = await requireDbUserId();
  return _getAnalyticsHeatmapCached(userId);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null;
  return Math.round(((current - previous) / previous) * 100);
}

function enumerateDays(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur.getTime() <= end.getTime()) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function computeHabitSuccessPct(
  habits: { id: string; frequency: string; customDays: number[]; createdAt: Date; targetPerWeek: number | null }[],
  logs: { date: Date; habitId: string }[],
  from: Date,
  to: Date,
): number {
  if (habits.length === 0) return 0;
  const days = enumerateDays(from, to);
  const today = startOfDay(new Date());
  let required = 0;
  let completed = 0;
  const logSet = new Set(
    logs.map((l) => `${l.habitId}:${format(startOfDay(l.date), "yyyy-MM-dd")}`),
  );
  for (const h of habits) {
    const created = startOfDay(h.createdAt);
    for (const d of days) {
      const day = startOfDay(d);
      if (day.getTime() < created.getTime()) continue;
      if (day.getTime() > today.getTime()) continue;
      const wd = (getDay(day) + 6) % 7; // Mon=0..Sun=6
      const isRequired =
        h.frequency === "CUSTOM" ? h.customDays.includes(wd) : true;
      if (!isRequired) continue;
      required++;
      if (logSet.has(`${h.id}:${format(day, "yyyy-MM-dd")}`)) completed++;
    }
  }
  return required > 0 ? Math.round((completed / required) * 100) : 0;
}

function computeHabitSuccessByDay(
  habits: { id: string; frequency: string; customDays: number[]; createdAt: Date }[],
  logs: { date: Date; habitId: string }[],
  from: Date,
  to: Date,
): { day: string; completed: number; missed: number; pct: number }[] {
  const days = enumerateDays(from, to);
  const today = startOfDay(new Date());
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const buckets = dayLabels.map((label) => ({
    label,
    completed: 0,
    missed: 0,
  }));
  const logSet = new Set(
    logs.map((l) => `${l.habitId}:${format(startOfDay(l.date), "yyyy-MM-dd")}`),
  );
  for (const h of habits) {
    const created = startOfDay(h.createdAt);
    for (const d of days) {
      const day = startOfDay(d);
      if (day.getTime() < created.getTime()) continue;
      if (day.getTime() > today.getTime()) continue;
      const wd = (getDay(day) + 6) % 7;
      const isRequired =
        h.frequency === "CUSTOM" ? h.customDays.includes(wd) : true;
      if (!isRequired) continue;
      if (logSet.has(`${h.id}:${format(day, "yyyy-MM-dd")}`)) {
        buckets[wd].completed++;
      } else {
        buckets[wd].missed++;
      }
    }
  }
  return buckets.map((b) => ({
    day: b.label,
    completed: b.completed,
    missed: b.missed,
    pct:
      b.completed + b.missed > 0
        ? Math.round((b.completed / (b.completed + b.missed)) * 100)
        : 0,
  }));
}

function findPeakBlock(
  buckets: number[],
): { startHour: number; endHour: number } | null {
  if (buckets.every((b) => b === 0)) return null;
  // Find best 3-hour window.
  let bestStart = 0;
  let bestSum = 0;
  for (let i = 0; i <= 21; i++) {
    const sum = buckets[i] + buckets[i + 1] + buckets[i + 2];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = i;
    }
  }
  return { startHour: bestStart, endHour: bestStart + 3 };
}

function computeScore(args: {
  tasksCompleted: number;
  focusTimeMin: number;
  habitSuccessPct: number;
  journalEntries: number;
  rangeDays: number;
}): number {
  const { tasksCompleted, focusTimeMin, habitSuccessPct, journalEntries, rangeDays } = args;
  const tasksPerDayTarget = 4;
  const focusPerDayTargetMin = 180;
  const journalsPerDayTarget = 1;
  const tasksScore = Math.min(
    100,
    (tasksCompleted / (tasksPerDayTarget * rangeDays)) * 100,
  );
  const focusScore = Math.min(
    100,
    (focusTimeMin / (focusPerDayTargetMin * rangeDays)) * 100,
  );
  const journalScore = Math.min(
    100,
    (journalEntries / (journalsPerDayTarget * rangeDays)) * 100,
  );
  // Weights: tasks 30%, focus 30%, habits 25%, journal 15%
  const blended =
    tasksScore * 0.3 +
    focusScore * 0.3 +
    habitSuccessPct * 0.25 +
    journalScore * 0.15;
  return Math.round(blended);
}

function computeHeatmap(args: {
  tasks: Date[];
  habits: Date[];
  sessions: { start: Date; minutes: number }[];
}): { date: string; score: number }[] {
  const today = startOfDay(new Date());
  const scoreByDay = new Map<string, number>();
  for (const t of args.tasks) {
    const k = format(startOfDay(t), "yyyy-MM-dd");
    scoreByDay.set(k, (scoreByDay.get(k) ?? 0) + 10);
  }
  for (const h of args.habits) {
    const k = format(startOfDay(h), "yyyy-MM-dd");
    scoreByDay.set(k, (scoreByDay.get(k) ?? 0) + 8);
  }
  for (const s of args.sessions) {
    const k = format(startOfDay(s.start), "yyyy-MM-dd");
    scoreByDay.set(k, (scoreByDay.get(k) ?? 0) + s.minutes / 6); // 30min = 5pts
  }
  // Last 365 days, oldest → newest.
  const cells: { date: string; score: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = subDays(today, i);
    const k = format(d, "yyyy-MM-dd");
    cells.push({
      date: k,
      score: Math.min(100, Math.round(scoreByDay.get(k) ?? 0)),
    });
  }
  return cells;
}

function computeInsights(args: {
  productivityOverview: { date: string; tasks: number; hours: number }[];
  productiveHours: { hour: number; minutes: number }[];
  habits: { name: string; currentStreak: number }[];
}): { emoji: string; title: string; body: string }[] {
  const out: { emoji: string; title: string; body: string }[] = [];

  // Most productive weekday (by tasks completed)
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
  const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const d of args.productivityOverview) {
    const date = new Date(d.date);
    const wd = (getDay(date) + 6) % 7;
    weekdayTotals[wd] += d.tasks;
    weekdayCount[wd]++;
  }
  const weekdayAvg = weekdayTotals.map((t, i) =>
    weekdayCount[i] > 0 ? t / weekdayCount[i] : 0,
  );
  const peakWd = weekdayAvg.indexOf(Math.max(...weekdayAvg));
  if (weekdayAvg[peakWd] > 0) {
    out.push({
      emoji: "📅",
      title: `You are most productive on ${labels[peakWd]}s.`,
      body: "Try scheduling important tasks on this day.",
    });
  }

  // Lowest focus hour (looking at hours with any data, find the dip)
  const nonZero = args.productiveHours.filter((h) => h.minutes > 0);
  if (nonZero.length >= 4) {
    const min = nonZero.reduce((a, b) => (b.minutes < a.minutes ? b : a));
    const fmt = (h: number) =>
      h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
    out.push({
      emoji: "⏰",
      title: `Your focus dips around ${fmt(min.hour)}.`,
      body: "Consider lighter work or a break in this window.",
    });
  }

  // Streak at risk
  const today = startOfDay(new Date());
  const todayK = format(today, "yyyy-MM-dd");
  void todayK;
  const atRisk = args.habits
    .filter((h) => h.currentStreak >= 3)
    .sort((a, b) => b.currentStreak - a.currentStreak)[0];
  if (atRisk) {
    out.push({
      emoji: "🔥",
      title: `Keep your "${atRisk.name}" streak alive.`,
      body: `You're at ${atRisk.currentStreak} days — don't let it slip.`,
    });
  }

  if (out.length === 0) {
    out.push({
      emoji: "✨",
      title: "Not enough data yet.",
      body: "Log a few more days to see personalized insights.",
    });
  }
  return out;
}
