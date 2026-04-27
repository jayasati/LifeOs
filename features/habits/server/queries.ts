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
import type { Frequency } from "@/features/habits/schema";

export type HabitWeekRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: Frequency;
  targetPerWeek: number | null;
  customDays: number[];
  /** 7 entries Mon..Sun: true=done */
  days: boolean[];
  /** future days marked separately so the UI can render them muted */
  future: boolean[];
  /** required days for THIS habit's mode (DAILY=all, WEEKLY=all, CUSTOM=customDays only) */
  required: boolean[];
  /** mode-aware percent toward the week's target */
  percent: number;
  /** done count this week (used by WEEKLY label "3 / 4") */
  doneThisWeek: number;
  /** target this week (DAILY=7, WEEKLY=targetPerWeek, CUSTOM=count of customDays) */
  weeklyTarget: number;
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
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        frequency: true,
        targetPerWeek: true,
        customDays: true,
        currentStreak: true,
        longestStreak: true,
        createdAt: true,
        logs: {
          where: { date: { gte: wkStart, lte: wkEnd }, completed: true },
          select: { date: true },
        },
      },
    });

    return habits.map((h) => {
      const dayDates = weekDays(wkStart);
      const created = startOfDay(h.createdAt);
      const completedSet = new Set(
        h.logs.map((l) => startOfDay(l.date).getTime()),
      );
      const days = dayDates.map((d) =>
        completedSet.has(startOfDay(d).getTime()),
      );
      const future = dayDates.map(
        (d) => differenceInCalendarDays(d, today) > 0,
      );
      // Days BEFORE the habit was created render the same as future days
      // (muted, non-interactive) and are excluded from percent math.
      const predates = dayDates.map((d) => d.getTime() < created.getTime());

      // `required[i]` = day i is part of this habit's schedule AND post-creation
      const required: boolean[] = dayDates.map((_, i) => {
        if (predates[i]) return false;
        if (h.frequency === "CUSTOM") return h.customDays.includes(i);
        return true;
      });

      const doneThisWeek = days.filter((v) => v).length;

      let weeklyTarget: number;
      let percent: number;
      if (h.frequency === "DAILY") {
        // 7 minus days that predate the habit
        weeklyTarget = 7 - predates.filter(Boolean).length || 1;
        const possibleSoFar = days.filter(
          (_, i) => !future[i] && !predates[i],
        ).length || 1;
        percent = Math.round((doneThisWeek / possibleSoFar) * 100);
      } else if (h.frequency === "WEEKLY") {
        // Pro-rate the target if the habit was created mid-week — user can't be
        // expected to hit "4×/wk" if only 3 days remain.
        const remainingInWeek = 7 - predates.filter(Boolean).length;
        weeklyTarget = Math.min(
          h.targetPerWeek ?? 3,
          remainingInWeek > 0 ? remainingInWeek : 1,
        );
        percent = Math.round(
          Math.min(1, doneThisWeek / weeklyTarget) * 100,
        );
      } else {
        // CUSTOM — required count already excludes pre-creation days
        weeklyTarget = required.filter(Boolean).length || 1;
        const requiredSoFar = required.filter((r, i) => r && !future[i]).length;
        const doneOnRequired = days.filter(
          (v, i) => v && required[i],
        ).length;
        percent =
          requiredSoFar > 0
            ? Math.round((doneOnRequired / requiredSoFar) * 100)
            : 0;
      }

      // Fold "predates" into "future" for the day-cell renderer — both are
      // non-interactive, faded states.
      const cellFuture = future.map((f, i) => f || predates[i]);

      return {
        id: h.id,
        name: h.name,
        description: h.description,
        icon: h.icon ?? "🌱",
        color: h.color ?? "purple",
        frequency: h.frequency,
        targetPerWeek: h.targetPerWeek,
        customDays: h.customDays,
        days,
        future: cellFuture,
        required,
        percent,
        doneThisWeek,
        weeklyTarget,
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
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        frequency: true,
        customDays: true,
      },
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
  const currentStreak = habits.reduce(
    (m, h) => Math.max(m, h.currentStreak),
    0,
  );
  const bestStreak = habits.reduce(
    (m, h) => Math.max(m, h.longestStreak),
    0,
  );

  // "Perfect day" = day where every habit that REQUIRES that weekday was logged.
  const dayMap = new Map<string, Set<string>>();
  for (const log of monthLogs) {
    const key = startOfDay(log.date).toISOString();
    if (!dayMap.has(key)) dayMap.set(key, new Set());
    dayMap.get(key)!.add(log.habitId);
  }
  let perfectDaysThisMonth = 0;
  if (totalHabits > 0) {
    for (const [key, set] of dayMap.entries()) {
      const dt = new Date(key);
      const wd = (dt.getDay() + 6) % 7; // Mon=0..Sun=6
      const requiredOn = habits.filter((h) => {
        if (h.frequency === "CUSTOM") return h.customDays.includes(wd);
        return true;
      });
      if (
        requiredOn.length > 0 &&
        requiredOn.every((h) => set.has(h.id))
      ) {
        perfectDaysThisMonth++;
      }
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
  perfectWeekAgo: number | null;
};

export const getHabitInsights = cache(async (): Promise<HabitInsights> => {
  const userId = await requireDbUserId();
  const habits = await db.habit.findMany({
    where: { userId, archivedAt: null },
    select: {
      id: true,
      name: true,
      frequency: true,
      targetPerWeek: true,
      customDays: true,
      createdAt: true,
    },
  });

  if (habits.length === 0) {
    return {
      mostConsistent: null,
      needsImprovement: null,
      perfectWeekAgo: null,
    };
  }

  const today = startOfDay(new Date());
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const lookbackWeeks = 4;
  const perfectScanWeeks = 12;
  const oldestStart = addDays(thisWeekStart, -7 * (perfectScanWeeks - 1));

  const logs = await db.habitLog.findMany({
    where: {
      completed: true,
      date: { gte: oldestStart, lte: today },
      habit: { userId, archivedAt: null },
    },
    select: { date: true, habitId: true },
  });

  // habitId -> weekStartMs -> Set<dayMs>
  const grouped = new Map<string, Map<number, Set<number>>>();
  for (const l of logs) {
    const dayMs = startOfDay(l.date).getTime();
    const wsMs = startOfWeek(new Date(dayMs), { weekStartsOn: 1 }).getTime();
    if (!grouped.has(l.habitId)) grouped.set(l.habitId, new Map());
    const m = grouped.get(l.habitId)!;
    if (!m.has(wsMs)) m.set(wsMs, new Set());
    m.get(wsMs)!.add(dayMs);
  }

  // Pure helper: weekly percent for (habit, completed-day-set, weekStart).
  // Clamped to [createdAt, today] so weeks before creation/future don't pollute.
  function weekPct(
    h: (typeof habits)[number],
    daySet: Set<number> | undefined,
    wsMs: number,
  ): number | null {
    const created = startOfDay(h.createdAt).getTime();
    const wsEnd = wsMs + 6 * 86_400_000;
    if (wsEnd < created) return null; // habit didn't exist this week

    const ws = new Date(wsMs);
    const isThisWeek = wsMs === thisWeekStart.getTime();
    const todayMs = today.getTime();

    // For CUSTOM, walk per-day so we can exclude pre-creation/future weekdays.
    if (h.frequency === "CUSTOM") {
      const required = new Set(h.customDays);
      let reqSoFar = 0;
      let doneOnReq = 0;
      for (let d = 0; d < 7; d++) {
        const dayDate = addDays(ws, d);
        const dayMs = startOfDay(dayDate).getTime();
        if (dayMs < created) continue;
        if (dayMs > todayMs) break;
        const wd = (dayDate.getDay() + 6) % 7;
        if (required.has(wd)) {
          reqSoFar++;
          if (daySet?.has(dayMs)) doneOnReq++;
        }
      }
      return reqSoFar > 0 ? (doneOnReq / reqSoFar) * 100 : 0;
    }

    // DAILY / WEEKLY share a "possible days in window" computation.
    let possible = 7;
    const startMs = Math.max(wsMs, created);
    const endMs = isThisWeek ? Math.min(wsEnd, todayMs) : wsEnd;
    possible = Math.floor((endMs - startMs) / 86_400_000) + 1;
    if (possible <= 0) return null;

    // Count only logs that fall within this clamped window.
    let done = 0;
    if (daySet) {
      for (const t of daySet) if (t >= startMs && t <= endMs) done++;
    }

    if (h.frequency === "DAILY") {
      return (done / possible) * 100;
    }
    // WEEKLY — pro-rate the target if window is shorter than a full week.
    const target = Math.min(h.targetPerWeek ?? 3, possible);
    return Math.min(1, done / target) * 100;
  }

  // 4-week rolling average per habit. Drops weeks where the habit didn't exist
  // (weekPct returns null) so brand-new habits don't get padded with zeros.
  const ranked = habits
    .map((h) => {
      const byWeek = grouped.get(h.id) ?? new Map<number, Set<number>>();
      const wsMsList: number[] = [];
      for (let i = 0; i < lookbackWeeks; i++) {
        wsMsList.push(addDays(thisWeekStart, -7 * i).getTime());
      }
      const pcts = wsMsList
        .map((wsMs) => weekPct(h, byWeek.get(wsMs), wsMs))
        .filter((p): p is number => p !== null);
      const avg =
        pcts.length > 0
          ? pcts.reduce((a, b) => a + b, 0) / pcts.length
          : 0;
      return {
        name: h.name,
        percent: Math.round(avg),
        samples: pcts.length,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  // Strip habits with zero samples (brand new, no week of data yet) — they
  // shouldn't be ranked as either most-consistent or needing improvement.
  const ranked2 = ranked.filter((r) => r.samples > 0);
  const mostConsistent =
    ranked2[0] ? { name: ranked2[0].name, percent: ranked2[0].percent } : null;

  const candidate = ranked2.length > 1 ? ranked2[ranked2.length - 1] : null;
  const needsImprovement =
    candidate &&
    candidate.percent < 60 &&
    (mostConsistent?.percent ?? 0) - candidate.percent >= 10
      ? { name: candidate.name, percent: candidate.percent }
      : null;

  // Perfect week — most recent week where every habit that EXISTED that week
  // hit its (pro-rated) weekly target.
  let perfectWeekAgo: number | null = null;
  for (let i = 0; i < perfectScanWeeks; i++) {
    const wsMs = addDays(thisWeekStart, -7 * i).getTime();
    const checks = habits
      .map((h) => weekPct(h, grouped.get(h.id)?.get(wsMs), wsMs))
      .filter((p): p is number => p !== null);
    if (checks.length > 0 && checks.every((p) => p >= 100)) {
      perfectWeekAgo = i;
      break;
    }
  }

  return { mostConsistent, needsImprovement, perfectWeekAgo };
});

// ─── Consistency % (sidebar gauge) ───────────────────────────────────────────
export const getConsistencyPct = cache(async (): Promise<number> => {
  const rows = await getHabitsWithWeek();
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, r) => acc + r.percent, 0);
  return Math.round(sum / rows.length);
});

export function startOfMondayWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export const _MS_DAY = MS_DAY;
export const _subDays = subDays;
