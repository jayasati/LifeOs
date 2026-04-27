import "server-only";
import { cache } from "react";
import {
  addDays,
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";
import {
  type Filter,
  type Sort,
  type State,
  deriveState,
} from "@/features/goals/schema";

export type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string;
  color: string;
  targetDate: Date | null;
  startedAt: Date | null;
  totalMilestones: number;
  completedMilestones: number;
  percent: number;
  state: State;
  createdAt: Date;
  milestones: {
    id: string;
    title: string;
    completedAt: Date | null;
    position: number;
  }[];
};

export const getGoals = cache(
  async (
    opts: { filter?: Filter; sort?: Sort } = {},
  ): Promise<GoalRow[]> => {
    const userId = await requireDbUserId();
    const filter: Filter = opts.filter ?? "ALL";
    const sort: Sort = opts.sort ?? "PRIORITY";

    const rows = await db.goal.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        icon: true,
        color: true,
        endDate: true,
        startedAt: true,
        createdAt: true,
        milestones: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            completedAt: true,
            position: true,
          },
        },
      },
      orderBy:
        sort === "TARGET_DATE"
          ? [{ endDate: "asc" }, { createdAt: "desc" }]
          : sort === "CREATED"
            ? [{ createdAt: "desc" }]
            : [{ endDate: "asc" }, { createdAt: "desc" }],
    });

    const mapped: GoalRow[] = rows.map((g) => {
      const total = g.milestones.length;
      const completed = g.milestones.filter((m) => m.completedAt).length;
      const percent =
        total > 0 ? Math.round((completed / total) * 100) : 0;
      const state = deriveState({
        total,
        completed,
        startedAt: g.startedAt,
      });
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        icon: g.icon ?? "🎯",
        color: g.color ?? "purple",
        targetDate: g.endDate,
        startedAt: g.startedAt,
        totalMilestones: total,
        completedMilestones: completed,
        percent,
        state,
        createdAt: g.createdAt,
        milestones: g.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          completedAt: m.completedAt,
          position: m.position,
        })),
      };
    });

    if (filter === "ALL") return mapped;
    return mapped.filter((g) => g.state === filter);
  },
);

export type GoalStats = {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completedPct: number;
  inProgressPct: number;
  notStartedPct: number;
};

export const getGoalStats = cache(async (): Promise<GoalStats> => {
  const goals = await getGoals();
  const total = goals.length;
  const completed = goals.filter((g) => g.state === "COMPLETED").length;
  const inProgress = goals.filter((g) => g.state === "IN_PROGRESS").length;
  const notStarted = goals.filter((g) => g.state === "NOT_STARTED").length;
  const safe = total === 0 ? 1 : total;
  return {
    total,
    completed,
    inProgress,
    notStarted,
    completedPct: Math.round((completed / safe) * 100),
    inProgressPct: Math.round((inProgress / safe) * 100),
    notStartedPct: Math.round((notStarted / safe) * 100),
  };
});

export type DeadlineRow = {
  id: string;
  title: string;
  category: string | null;
  targetDate: Date;
  daysAway: number;
};

export const getUpcomingDeadlines = cache(
  async (limit = 3): Promise<DeadlineRow[]> => {
    const userId = await requireDbUserId();
    const now = startOfDay(new Date());
    const rows = await db.goal.findMany({
      where: {
        userId,
        endDate: { gte: now },
      },
      orderBy: { endDate: "asc" },
      take: limit * 2, // we'll filter out completed in JS via milestones
      select: {
        id: true,
        title: true,
        category: true,
        endDate: true,
        milestones: { select: { completedAt: true } },
      },
    });
    const items: DeadlineRow[] = [];
    for (const g of rows) {
      if (!g.endDate) continue;
      const total = g.milestones.length;
      const completed = g.milestones.filter((m) => m.completedAt).length;
      if (total > 0 && completed >= total) continue; // skip completed goals
      const days = Math.max(
        0,
        Math.round((startOfDay(g.endDate).getTime() - now.getTime()) / 86_400_000),
      );
      items.push({
        id: g.id,
        title: g.title,
        category: g.category,
        targetDate: g.endDate,
        daysAway: days,
      });
      if (items.length === limit) break;
    }
    return items;
  },
);

// Heatmap: which days this month had at least one milestone completed.
export type StreakDay = { day: number; intensity: 0 | 1 | 2 | 3 };
export type GoalStreak = {
  current: number;
  best: number;
  days: StreakDay[];
};

export const getGoalStreakDays = cache(
  async (opts: {
    year: number;
    month: number; // 0-11
  }): Promise<GoalStreak> => {
    const userId = await requireDbUserId();
    const start = startOfMonth(new Date(opts.year, opts.month, 1));
    const end = endOfMonth(new Date(opts.year, opts.month, 1));

    const rows = await db.milestone.findMany({
      where: {
        completedAt: { gte: start, lte: end },
        goal: { userId },
      },
      select: { completedAt: true },
    });

    const counts = new Map<number, number>();
    for (const r of rows) {
      if (!r.completedAt) continue;
      const day = startOfDay(r.completedAt).getDate();
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    const days: StreakDay[] = [];
    const totalDays = end.getDate();
    for (let d = 1; d <= totalDays; d++) {
      const c = counts.get(d) ?? 0;
      const intensity: 0 | 1 | 2 | 3 = c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : 3;
      days.push({ day: d, intensity });
    }

    // Streak (across all months) — consecutive days ending today/yesterday.
    const allRows = await db.milestone.findMany({
      where: { completedAt: { not: null }, goal: { userId } },
      select: { completedAt: true },
    });
    const allDays = new Set<string>();
    for (const r of allRows) {
      if (!r.completedAt) continue;
      const d = startOfDay(r.completedAt);
      allDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    const today = startOfDay(new Date());
    const yesterday = startOfDay(addDays(today, -1));
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let cursor = allDays.has(dayKey(today)) ? today : yesterday;
    let current = 0;
    while (allDays.has(dayKey(cursor))) {
      current++;
      cursor = addDays(cursor, -1);
    }

    // Best streak (history)
    const sorted = [...allDays]
      .map((k) => {
        const [y, m, dd] = k.split("-").map(Number);
        return new Date(y, m, dd).getTime();
      })
      .sort((a, b) => a - b);
    let best = 0;
    let run = 0;
    let prev: number | null = null;
    for (const t of sorted) {
      if (prev !== null && t - prev === 86_400_000) run++;
      else run = 1;
      if (run > best) best = run;
      prev = t;
    }

    return { current, best, days };
  },
);

export const _endOfDay = endOfDay;
