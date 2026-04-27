import "server-only";
import { cache } from "react";
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

export type DashRange = "DAY" | "WEEK" | "MONTH" | "YEAR";

export type DashboardKpis = {
  completedToday: number;
  overdue: number;
  missedHabitsToday: number;
  bestStreakDays: number;
};

export type TodayFocusSummary = {
  tasksPending: number;
  tasksPendingHigh: number;
  habitsRemaining: number;
  habitsRequiredToday: number;
};

export type TimeTrackedSummary = {
  todaySec: number;
  bars: { label: string; key: string; minutes: number; isToday: boolean }[];
};

export type HabitTrackerSummary = {
  percent: number;
  completedToday: number;
  requiredToday: number;
  topHabits: {
    id: string;
    name: string;
    color: string;
    icon: string;
    weeklyPercent: number;
    doneThisWeek: number;
    weeklyTarget: number;
  }[];
};

// ─── Shared per-request loaders ──────────────────────────────────────────────
// KPIs / Today Focus / Habit Tracker cards all need the same active-habit list
// + today's habit logs + week's habit logs. Without these shared cached
// helpers each Suspense section re-issues the same queries (3× round-trips
// per dashboard render).
const loadActiveHabits = cache(async () => {
  const userId = await requireDbUserId();
  return db.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      frequency: true,
      customDays: true,
      targetPerWeek: true,
      currentStreak: true,
      createdAt: true,
    },
  });
});

// We pull the entire current week so HabitTracker can derive weekly stats,
// and KPIs / TodayFocus filter down to today in memory — much cheaper than
// three separate range queries.
const loadHabitLogsThisWeek = cache(async () => {
  const userId = await requireDbUserId();
  const now = new Date();
  const wkStart = startOfWeek(now, { weekStartsOn: 1 });
  const wkEnd = endOfWeek(now, { weekStartsOn: 1 });
  return db.habitLog.findMany({
    where: {
      completed: true,
      date: { gte: wkStart, lte: wkEnd },
      habit: { userId, archivedAt: null },
    },
    select: { date: true, habitId: true },
  });
});

function filterToToday<T extends { date: Date }>(
  rows: T[],
  startToday: Date,
  endToday: Date,
): T[] {
  const lo = startToday.getTime();
  const hi = endToday.getTime();
  return rows.filter((r) => {
    const t = r.date.getTime();
    return t >= lo && t <= hi;
  });
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
export const getDashboardKpis = cache(async (): Promise<DashboardKpis> => {
  const userId = await requireDbUserId();
  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = endOfDay(now);

  const [completedToday, overdue, habits, weekLogs] = await Promise.all([
    db.task.count({
      where: {
        userId,
        status: "DONE",
        completedAt: { gte: startToday, lte: endToday },
      },
    }),
    db.task.count({
      where: { userId, status: { not: "DONE" }, dueDate: { lt: now } },
    }),
    loadActiveHabits(),
    loadHabitLogsThisWeek(),
  ]);
  const todayLogs = filterToToday(weekLogs, startToday, endToday);

  const todayWeekday = (getDay(startToday) + 6) % 7; // Mon=0..Sun=6
  const completedHabitIds = new Set(todayLogs.map((l) => l.habitId));
  let requiredToday = 0;
  let missed = 0;
  for (const h of habits) {
    if (startOfDay(h.createdAt).getTime() > startToday.getTime()) continue;
    const isRequired =
      h.frequency === "CUSTOM" ? h.customDays.includes(todayWeekday) : true;
    if (!isRequired) continue;
    requiredToday++;
    if (!completedHabitIds.has(h.id)) missed++;
  }
  void requiredToday;

  const bestStreak = habits.reduce(
    (m, h) => Math.max(m, h.currentStreak),
    0,
  );

  return {
    completedToday,
    overdue,
    missedHabitsToday: missed,
    bestStreakDays: bestStreak,
  };
});

// ─── Today Focus Summary ─────────────────────────────────────────────────────
export const getTodayFocusSummary = cache(
  async (): Promise<TodayFocusSummary> => {
    const userId = await requireDbUserId();
    const now = new Date();
    const startToday = startOfDay(now);
    const endToday = endOfDay(now);

    const [tasksPending, tasksPendingHigh, habits, weekLogs] = await Promise.all([
      db.task.count({
        where: {
          userId,
          status: { in: ["TODO", "DOING"] },
          OR: [{ dueDate: null }, { dueDate: { gte: now } }],
        },
      }),
      db.task.count({
        where: {
          userId,
          status: { in: ["TODO", "DOING"] },
          priority: { in: ["HIGH", "URGENT"] },
          OR: [{ dueDate: null }, { dueDate: { gte: now } }],
        },
      }),
      loadActiveHabits(),
      loadHabitLogsThisWeek(),
    ]);
    const todayLogs = filterToToday(weekLogs, startToday, endToday);

    const todayWeekday = (getDay(startToday) + 6) % 7;
    const completedSet = new Set(todayLogs.map((l) => l.habitId));
    let required = 0;
    let remaining = 0;
    for (const h of habits) {
      if (startOfDay(h.createdAt).getTime() > startToday.getTime()) continue;
      const isRequired =
        h.frequency === "CUSTOM" ? h.customDays.includes(todayWeekday) : true;
      if (!isRequired) continue;
      required++;
      if (!completedSet.has(h.id)) remaining++;
    }

    return {
      tasksPending,
      tasksPendingHigh,
      habitsRemaining: remaining,
      habitsRequiredToday: required,
    };
  },
);

// ─── Time Tracked (today + 7-day mini bars) ──────────────────────────────────
export const getTimeTrackedSummary = cache(
  async (): Promise<TimeTrackedSummary> => {
    const userId = await requireDbUserId();
    const now = new Date();
    const startToday = startOfDay(now);
    const sevenAgo = startOfDay(subDays(now, 6));

    const sessions = await db.pomodoroSession.findMany({
      where: {
        userId,
        completed: true,
        type: { in: ["FOCUS", "CUSTOM"] },
        startedAt: { gte: sevenAgo },
      },
      select: { startedAt: true, endedAt: true },
    });

    const buckets = new Map<string, number>(); // key -> minutes
    for (let i = 0; i < 7; i++) {
      const d = addDays(sevenAgo, i);
      buckets.set(format(startOfDay(d), "yyyy-MM-dd"), 0);
    }

    let todaySec = 0;
    for (const s of sessions) {
      if (!s.endedAt) continue;
      const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      const k = format(startOfDay(s.startedAt), "yyyy-MM-dd");
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + min);
      if (startOfDay(s.startedAt).getTime() === startToday.getTime()) {
        todaySec += (s.endedAt.getTime() - s.startedAt.getTime()) / 1000;
      }
    }

    const todayKey = format(startToday, "yyyy-MM-dd");
    const bars = [...buckets.entries()].map(([key, minutes]) => ({
      key,
      label: format(new Date(key), "EEE"),
      minutes: Math.round(minutes),
      isToday: key === todayKey,
    }));

    return { todaySec: Math.round(todaySec), bars };
  },
);

// ─── Habit Tracker Summary (top 3 + today percent) ───────────────────────────
export const getHabitTrackerSummary = cache(
  async (): Promise<HabitTrackerSummary> => {
    // userId not needed here — the shared loaders resolve it themselves.
    const now = new Date();
    const startToday = startOfDay(now);
    const endToday = endOfDay(now);
    const wkStart = startOfWeek(now, { weekStartsOn: 1 });

    const [habits, weekLogs] = await Promise.all([
      loadActiveHabits(),
      loadHabitLogsThisWeek(),
    ]);
    const todayLogs = filterToToday(weekLogs, startToday, endToday);

    const todayWeekday = (getDay(startToday) + 6) % 7;
    const completedTodaySet = new Set(todayLogs.map((l) => l.habitId));
    let requiredToday = 0;
    let completedToday = 0;
    for (const h of habits) {
      if (startOfDay(h.createdAt).getTime() > startToday.getTime()) continue;
      const isRequired =
        h.frequency === "CUSTOM" ? h.customDays.includes(todayWeekday) : true;
      if (!isRequired) continue;
      requiredToday++;
      if (completedTodaySet.has(h.id)) completedToday++;
    }
    const percent =
      requiredToday > 0
        ? Math.round((completedToday / requiredToday) * 100)
        : 0;

    // Build per-habit weekly progress, then pick top 3 by streak desc.
    const weekByHabit = new Map<string, Set<string>>();
    for (const l of weekLogs) {
      const k = format(startOfDay(l.date), "yyyy-MM-dd");
      if (!weekByHabit.has(l.habitId)) weekByHabit.set(l.habitId, new Set());
      weekByHabit.get(l.habitId)!.add(k);
    }
    const today = startToday;
    const habitProgress = habits.map((h) => {
      const created = startOfDay(h.createdAt);
      const dayKeys = weekByHabit.get(h.id) ?? new Set<string>();
      let target: number;
      if (h.frequency === "DAILY") {
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) days.push(addDays(wkStart, i));
        target = days.filter(
          (d) => d.getTime() >= created.getTime(),
        ).length || 1;
      } else if (h.frequency === "WEEKLY") {
        target = Math.max(1, h.targetPerWeek ?? 3);
      } else {
        // CUSTOM
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) days.push(addDays(wkStart, i));
        target = days.filter((d) => {
          if (d.getTime() < created.getTime()) return false;
          const wd = (getDay(d) + 6) % 7;
          return h.customDays.includes(wd);
        }).length || 1;
      }
      const doneThisWeek = dayKeys.size;
      const weeklyPercent = Math.min(
        100,
        Math.round((doneThisWeek / target) * 100),
      );
      void today;
      return {
        id: h.id,
        name: h.name,
        color: h.color ?? "purple",
        icon: h.icon ?? "🌱",
        weeklyPercent,
        doneThisWeek,
        weeklyTarget: target,
        currentStreak: h.currentStreak,
      };
    });

    const topHabits = [...habitProgress]
      .sort((a, b) => b.currentStreak - a.currentStreak || b.weeklyPercent - a.weeklyPercent)
      .slice(0, 3)
      .map(({ currentStreak: _cs, ...rest }) => {
        void _cs;
        return rest;
      });

    return {
      percent,
      completedToday,
      requiredToday,
      topHabits,
    };
  },
);

// ─── Productivity Overview (range = DAY|WEEK|MONTH|YEAR) ─────────────────────
export type ProductivityPoint = {
  date: string;
  label: string;
  tasks: number;
  habits: number;
  hours: number;
};

function rangeBoundsDash(range: DashRange): { from: Date; to: Date } {
  const now = new Date();
  if (range === "DAY") {
    return { from: startOfDay(now), to: endOfDay(now) };
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
  // YEAR: trailing 12 months ending this month
  return { from: addMonths(startOfMonth(now), -11), to: endOfMonth(now) };
}

export const getDashboardProductivity = cache(
  async (range: DashRange): Promise<ProductivityPoint[]> => {
    const userId = await requireDbUserId();
    const { from, to } = rangeBoundsDash(range);

    const [tasks, habitLogs, sessions] = await Promise.all([
      db.task.findMany({
        where: { userId, completedAt: { gte: from, lte: to } },
        select: { completedAt: true },
      }),
      db.habitLog.findMany({
        where: {
          completed: true,
          date: { gte: from, lte: to },
          habit: { userId, archivedAt: null },
        },
        select: { date: true },
      }),
      db.pomodoroSession.findMany({
        where: {
          userId,
          completed: true,
          type: { in: ["FOCUS", "CUSTOM"] },
          startedAt: { gte: from, lte: to },
        },
        select: { startedAt: true, endedAt: true },
      }),
    ]);

    if (range === "DAY") {
      const buckets: ProductivityPoint[] = [];
      for (let h = 0; h < 24; h++) {
        const label =
          h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
        buckets.push({
          date: String(h),
          label,
          tasks: 0,
          habits: 0,
          hours: 0,
        });
      }
      for (const t of tasks) {
        if (t.completedAt) buckets[t.completedAt.getHours()].tasks++;
      }
      for (const l of habitLogs) buckets[l.date.getHours()].habits++;
      const minByHour = new Array<number>(24).fill(0);
      for (const s of sessions) {
        if (!s.endedAt) continue;
        minByHour[s.startedAt.getHours()] +=
          (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      }
      for (let h = 0; h < 24; h++) {
        buckets[h].hours = Math.round((minByHour[h] / 60) * 10) / 10;
      }
      return buckets;
    }

    if (range === "YEAR") {
      const months: ProductivityPoint[] = [];
      const minByMonth = new Map<string, number>();
      for (let i = 0; i < 12; i++) {
        const d = addMonths(startOfMonth(from), i);
        const key = format(d, "yyyy-MM");
        months.push({
          date: key,
          label: format(d, "MMM"),
          tasks: 0,
          habits: 0,
          hours: 0,
        });
        minByMonth.set(key, 0);
      }
      const idx = new Map(months.map((m, i) => [m.date, i] as const));
      for (const t of tasks) {
        if (!t.completedAt) continue;
        const k = format(t.completedAt, "yyyy-MM");
        const i = idx.get(k);
        if (i !== undefined) months[i].tasks++;
      }
      for (const l of habitLogs) {
        const k = format(l.date, "yyyy-MM");
        const i = idx.get(k);
        if (i !== undefined) months[i].habits++;
      }
      for (const s of sessions) {
        if (!s.endedAt) continue;
        const k = format(s.startedAt, "yyyy-MM");
        const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
        minByMonth.set(k, (minByMonth.get(k) ?? 0) + min);
      }
      for (const m of months) {
        m.hours = Math.round(((minByMonth.get(m.date) ?? 0) / 60) * 10) / 10;
      }
      return months;
    }

    // WEEK or MONTH — per-day buckets
    const days: ProductivityPoint[] = [];
    let cur = startOfDay(from);
    const end = startOfDay(to);
    while (cur.getTime() <= end.getTime()) {
      days.push({
        date: format(cur, "yyyy-MM-dd"),
        label: range === "WEEK" ? format(cur, "EEE") : format(cur, "d"),
        tasks: 0,
        habits: 0,
        hours: 0,
      });
      cur = addDays(cur, 1);
    }
    const idx = new Map(days.map((d, i) => [d.date, i] as const));
    for (const t of tasks) {
      if (!t.completedAt) continue;
      const k = format(startOfDay(t.completedAt), "yyyy-MM-dd");
      const i = idx.get(k);
      if (i !== undefined) days[i].tasks++;
    }
    for (const l of habitLogs) {
      const k = format(startOfDay(l.date), "yyyy-MM-dd");
      const i = idx.get(k);
      if (i !== undefined) days[i].habits++;
    }
    const minByDay = new Map<string, number>();
    for (const s of sessions) {
      if (!s.endedAt) continue;
      const k = format(startOfDay(s.startedAt), "yyyy-MM-dd");
      const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      minByDay.set(k, (minByDay.get(k) ?? 0) + min);
    }
    for (const d of days) {
      d.hours = Math.round(((minByDay.get(d.date) ?? 0) / 60) * 10) / 10;
    }
    return days;
  },
);
