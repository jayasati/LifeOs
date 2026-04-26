import "server-only";
import { cache } from "react";
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  endOfMonth,
} from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";

export type HabitWeekRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  /** 7 entries Mon..Sun: true=done, false=missed (or future) */
  days: boolean[];
  /** future days marked separately so the UI can render them muted */
  future: boolean[];
  percent: number;
  currentStreak: number;
  longestStreak: number;
};

const MS_DAY = 86_400_000;

function weekDays(weekStart: Date) {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
  return days;
}

// ─── getHabitsWithWeek ───────────────────────────────────────────────────────
export const getHabitsWithWeek = cache(
  async (opts: { weekStart?: Date } = {}): Promise<HabitWeekRow[]> => {
    const userId = await requireDbUserId();
    const wkStart = startOfDay(
      opts.weekStart ?? startOfWeek(new Date(), { weekStartsOn: 1 }),
    );
    const wkEnd = endOfDay(addDays(wkStart, 6));
    const today = startOfDay(new Date());

    const habits = await db.habit.findMany({
      where: { userId, archivedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        logs: {
          where: { date: { gte: wkStart, lte: wkEnd }, completed: true },
          select: { date: true },
        },
      },
    });

    return habits.map((h) => {
      const dayDates = weekDays(wkStart);
      const completedSet = new Set(
        h.logs.map((l) => startOfDay(l.date).getTime()),
      );
      const days = dayDates.map((d) =>
        completedSet.has(startOfDay(d).getTime()),
      );
      const future = dayDates.map(
        (d) => differenceInCalendarDays(d, today) > 0,
      );
      const totalPossible = days.filter((_, i) => !future[i]).length || 1;
      const completedThisWeek = days.filter((v) => v).length;
      const percent = Math.round((completedThisWeek / totalPossible) * 100);
      return {
        id: h.id,
        name: h.name,
        description: h.description,
        icon: h.icon ?? "🌱",
        color: h.color ?? "purple",
        days,
        future,
        percent,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
      };
    });
  },
);

// ─── getHabitStats ───────────────────────────────────────────────────────────
export type HabitStats = {
  totalHabits: number;
  completedThisWeek: number;
  currentStreak: number;
  bestStreak: number;
  perfectDaysThisMonth: number;
};

export const getHabitStats = cache(async (): Promise<HabitStats> => {
  const userId = await requireDbUserId();
  const now = new Date();
  const wkStart = startOfWeek(now, { weekStartsOn: 1 });
  const wkEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [habits, completedThisWeek, monthLogs] = await Promise.all([
    db.habit.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, currentStreak: true, longestStreak: true },
    }),
    db.habitLog.count({
      where: {
        completed: true,
        date: { gte: wkStart, lte: wkEnd },
        habit: { userId, archivedAt: null },
      },
    }),
    db.habitLog.findMany({
      where: {
        completed: true,
        date: { gte: monthStart, lte: monthEnd },
        habit: { userId, archivedAt: null },
      },
      select: { date: true, habitId: true },
    }),
  ]);

  const totalHabits = habits.length;
  const currentStreak =
    habits.reduce((m, h) => Math.max(m, h.currentStreak), 0) ?? 0;
  const bestStreak =
    habits.reduce((m, h) => Math.max(m, h.longestStreak), 0) ?? 0;

  // Perfect day this month = day where every active habit was logged.
  const habitIds = habits.map((h) => h.id);
  const dayMap = new Map<string, Set<string>>();
  for (const log of monthLogs) {
    const key = startOfDay(log.date).toISOString();
    if (!dayMap.has(key)) dayMap.set(key, new Set());
    dayMap.get(key)!.add(log.habitId);
  }
  let perfectDaysThisMonth = 0;
  if (totalHabits > 0) {
    for (const set of dayMap.values()) {
      if (habitIds.every((id) => set.has(id))) perfectDaysThisMonth++;
    }
  }

  return {
    totalHabits,
    completedThisWeek,
    currentStreak,
    bestStreak,
    perfectDaysThisMonth,
  };
});

// ─── Calendar dots — days this month with at least one habit log ─────────────
export const getHabitLogDays = cache(
  async (opts: {
    year: number;
    month: number; // 0-11
  }): Promise<number[]> => {
    const userId = await requireDbUserId();
    const start = new Date(opts.year, opts.month, 1);
    const end = new Date(opts.year, opts.month + 1, 1);
    const rows = await db.habitLog.findMany({
      where: {
        completed: true,
        date: { gte: start, lt: end },
        habit: { userId, archivedAt: null },
      },
      select: { date: true },
    });
    const set = new Set<number>();
    for (const r of rows) set.add(startOfDay(r.date).getDate());
    return [...set];
  },
);

// ─── Insights (most consistent, needs improvement, perfect week recency) ─────
export type HabitInsights = {
  mostConsistent: { name: string; percent: number } | null;
  needsImprovement: { name: string; percent: number } | null;
  perfectWeekAgo: number | null; // weeks ago (0 = this week, 1 = last week, etc.)
};

export const getHabitInsights = cache(async (): Promise<HabitInsights> => {
  const userId = await requireDbUserId();
  const now = new Date();
  const wkStart = startOfWeek(now, { weekStartsOn: 1 });
  const wkEnd = endOfDay(addDays(wkStart, 6));
  const today = startOfDay(now);

  const habits = await db.habit.findMany({
    where: { userId, archivedAt: null },
    include: {
      logs: {
        where: { date: { gte: wkStart, lte: wkEnd }, completed: true },
        select: { date: true },
      },
    },
  });

  if (habits.length === 0) {
    return { mostConsistent: null, needsImprovement: null, perfectWeekAgo: null };
  }

  const possibleSoFar = Math.max(
    1,
    differenceInCalendarDays(today, wkStart) + 1,
  );

  const ranked = habits
    .map((h) => ({
      name: h.name,
      percent: Math.round(
        (h.logs.length / Math.min(7, possibleSoFar)) * 100,
      ),
    }))
    .sort((a, b) => b.percent - a.percent);

  // Find most-recent "perfect week" — a Mon..Sun where every habit logged every day.
  // Cheap version: scan back ~12 weeks.
  let perfectWeekAgo: number | null = null;
  const lookback = 12;
  const habitIds = habits.map((h) => h.id);
  if (habitIds.length > 0) {
    const oldestStart = startOfDay(
      addDays(startOfWeek(now, { weekStartsOn: 1 }), -7 * lookback),
    );
    const allLogs = await db.habitLog.findMany({
      where: {
        completed: true,
        date: { gte: oldestStart },
        habit: { userId, archivedAt: null },
      },
      select: { date: true, habitId: true },
    });
    const byKey = new Map<string, Set<string>>();
    for (const l of allLogs) {
      const key = startOfDay(l.date).toISOString();
      if (!byKey.has(key)) byKey.set(key, new Set());
      byKey.get(key)!.add(l.habitId);
    }
    for (let w = 0; w < lookback; w++) {
      const ws = startOfDay(
        addDays(startOfWeek(now, { weekStartsOn: 1 }), -7 * w),
      );
      let perfect = true;
      for (let d = 0; d < 7; d++) {
        const dayDate = addDays(ws, d);
        if (differenceInCalendarDays(dayDate, today) > 0) {
          perfect = false;
          break;
        }
        const set = byKey.get(dayDate.toISOString());
        if (!set || !habitIds.every((id) => set.has(id))) {
          perfect = false;
          break;
        }
      }
      if (perfect) {
        perfectWeekAgo = w;
        break;
      }
    }
  }

  return {
    mostConsistent: ranked[0] ?? null,
    needsImprovement: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    perfectWeekAgo,
  };
});

// ─── Consistency % (sidebar gauge) ───────────────────────────────────────────
export const getConsistencyPct = cache(async (): Promise<number> => {
  const rows = await getHabitsWithWeek();
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, r) => acc + r.percent, 0);
  return Math.round(sum / rows.length);
});

// helper for export — also used by client when paging weeks
export function startOfMondayWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

// helper for action consumers
export const _MS_DAY = MS_DAY;
export const _subDays = subDays;
