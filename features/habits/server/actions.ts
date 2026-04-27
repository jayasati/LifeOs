"use server";

import { revalidatePath } from "next/cache";
import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";
import { bumpTag } from "@/lib/cache-tags";
import {
  createHabitSchema,
  type CreateHabitInput,
  type Frequency,
} from "@/features/habits/schema";

const MS_DAY = 86_400_000;

// ─── Streak math forks per frequency ─────────────────────────────────────────

function dailyStreak(completedDates: Date[]): {
  current: number;
  longest: number;
} {
  if (completedDates.length === 0) return { current: 0, longest: 0 };
  const set = new Set<number>(
    completedDates.map((d) => startOfDay(d).getTime()),
  );
  const dates = [...set].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((dates[i] - dates[i - 1]) / MS_DAY);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const today = startOfDay(new Date()).getTime();
  const yesterday = startOfDay(addDays(new Date(), -1)).getTime();
  let cursor = set.has(today) ? today : yesterday;
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor -= MS_DAY;
  }
  return { current, longest };
}

function weeklyStreak(
  completedDates: Date[],
  targetPerWeek: number,
  createdAt: Date,
): { current: number; longest: number } {
  if (targetPerWeek <= 0 || completedDates.length === 0)
    return { current: 0, longest: 0 };

  const weekCounts = new Map<number, Set<number>>(); // wkStart ms -> unique days
  for (const d of completedDates) {
    const day = startOfDay(d).getTime();
    const ws = startOfWeek(new Date(day), { weekStartsOn: 1 }).getTime();
    if (!weekCounts.has(ws)) weekCounts.set(ws, new Set());
    weekCounts.get(ws)!.add(day);
  }

  // Pro-rate the target on the creation week (user can't hit "4×/wk" if only
  // 3 days remain when they made the habit).
  const createdMs = startOfDay(createdAt).getTime();
  const createdWs = startOfWeek(new Date(createdMs), {
    weekStartsOn: 1,
  }).getTime();
  const daysRemainingInCreatedWeek =
    7 - Math.floor((createdMs - createdWs) / MS_DAY);
  const createdWeekTarget = Math.min(
    targetPerWeek,
    daysRemainingInCreatedWeek,
  );
  const targetFor = (wsMs: number) =>
    wsMs === createdWs ? createdWeekTarget : targetPerWeek;

  const weeks = [...weekCounts.entries()]
    .map(([ws, set]) => ({ ws, count: set.size }))
    .sort((a, b) => a.ws - b.ws);

  let longest = 0;
  let run = 0;
  let prevWs: number | null = null;
  for (const w of weeks) {
    if (w.count >= targetFor(w.ws)) {
      if (prevWs !== null && w.ws - prevWs === 7 * MS_DAY) run++;
      else run = 1;
      if (run > longest) longest = run;
      prevWs = w.ws;
    } else {
      prevWs = null;
      run = 0;
    }
  }

  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
  const lastWeek = thisWeek - 7 * MS_DAY;
  const counts = new Map<number, number>();
  for (const w of weeks) counts.set(w.ws, w.count);
  let cursor =
    (counts.get(thisWeek) ?? 0) >= targetFor(thisWeek) ? thisWeek : lastWeek;
  let current = 0;
  while ((counts.get(cursor) ?? 0) >= targetFor(cursor)) {
    current++;
    cursor -= 7 * MS_DAY;
  }
  return { current, longest };
}

function customStreak(
  completedDates: Date[],
  customDays: number[],
): { current: number; longest: number } {
  if (customDays.length === 0 || completedDates.length === 0)
    return { current: 0, longest: 0 };

  const required = new Set(customDays);
  const completedSet = new Set<number>(
    completedDates.map((d) => startOfDay(d).getTime()),
  );

  const earliest = Math.min(...completedSet);
  const today = startOfDay(new Date()).getTime();

  // Required dates from earliest log to today.
  const reqDates: number[] = [];
  for (let t = earliest; t <= today; t += MS_DAY) {
    const wd = (new Date(t).getDay() + 6) % 7; // Mon=0..Sun=6
    if (required.has(wd)) reqDates.push(t);
  }
  if (reqDates.length === 0) return { current: 0, longest: 0 };

  // Longest run.
  let longest = 0;
  let run = 0;
  for (const t of reqDates) {
    if (completedSet.has(t)) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current run from end of reqDates.
  let current = 0;
  let i = reqDates.length - 1;

  // Grace: if today is the last required day and not yet logged, allow walking
  // back without breaking the streak (yesterday's required day still counts).
  if (
    reqDates[i] === today &&
    !completedSet.has(today)
  ) {
    i--;
  }
  while (i >= 0 && completedSet.has(reqDates[i])) {
    current++;
    i--;
  }
  return { current, longest };
}

function recomputeFor(
  frequency: Frequency,
  completedDates: Date[],
  targetPerWeek: number | null,
  customDays: number[],
  createdAt: Date,
): { current: number; longest: number } {
  if (frequency === "WEEKLY")
    return weeklyStreak(completedDates, targetPerWeek ?? 3, createdAt);
  if (frequency === "CUSTOM") return customStreak(completedDates, customDays);
  return dailyStreak(completedDates);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function toggleHabitLog(habitId: string, date: Date) {
  const userId = await requireDbUserId();
  const day = startOfDay(date);

  if (differenceInCalendarDays(day, startOfDay(new Date())) > 0) return;

  await db.$transaction(async (tx) => {
    const habit = await tx.habit.findFirst({
      where: { id: habitId, userId, archivedAt: null },
      select: {
        id: true,
        frequency: true,
        targetPerWeek: true,
        customDays: true,
        createdAt: true,
      },
    });
    if (!habit) return;

    const existing = await tx.habitLog.findUnique({
      where: { habitId_date: { habitId, date: day } },
    });
    if (existing) {
      await tx.habitLog.update({
        where: { habitId_date: { habitId, date: day } },
        data: { completed: !existing.completed },
      });
    } else {
      await tx.habitLog.create({
        data: { habitId, date: day, completed: true },
      });
    }

    const all = await tx.habitLog.findMany({
      where: { habitId, completed: true },
      select: { date: true },
    });
    const { current, longest } = recomputeFor(
      habit.frequency,
      all.map((l) => l.date),
      habit.targetPerWeek,
      habit.customDays,
      habit.createdAt,
    );
    await tx.habit.update({
      where: { id: habitId },
      data: { currentStreak: current, longestStreak: longest },
    });
  });

  bumpTag("analytics");
  revalidatePath("/habits");
}

export async function createHabit(input: CreateHabitInput) {
  const userId = await requireDbUserId();
  const data = createHabitSchema.parse(input);
  await db.habit.create({
    data: {
      userId,
      name: data.name,
      description: data.description ?? null,
      icon: data.icon,
      color: data.color,
      frequency: data.frequency,
      targetPerWeek:
        data.frequency === "WEEKLY" ? (data.targetPerWeek ?? 3) : null,
      customDays: data.frequency === "CUSTOM" ? data.customDays : [],
    },
  });
  bumpTag("analytics");
  revalidatePath("/habits");
}

export async function updateHabit(input: CreateHabitInput & { id: string }) {
  const userId = await requireDbUserId();
  const { id, ...rest } = input;
  const data = createHabitSchema.parse(rest);

  // Frequency may have changed → recompute streaks against the new mode.
  await db.$transaction(async (tx) => {
    const updated = await tx.habit.update({
      where: { id, userId },
      data: {
        name: data.name,
        description: data.description ?? null,
        icon: data.icon,
        color: data.color,
        frequency: data.frequency,
        targetPerWeek:
          data.frequency === "WEEKLY" ? (data.targetPerWeek ?? 3) : null,
        customDays: data.frequency === "CUSTOM" ? data.customDays : [],
      },
      select: { createdAt: true },
    });
    const all = await tx.habitLog.findMany({
      where: { habitId: id, completed: true },
      select: { date: true },
    });
    const { current, longest } = recomputeFor(
      data.frequency,
      all.map((l) => l.date),
      data.targetPerWeek ?? null,
      data.customDays,
      updated.createdAt,
    );
    await tx.habit.update({
      where: { id, userId },
      data: { currentStreak: current, longestStreak: longest },
    });
  });

  bumpTag("analytics");
  revalidatePath("/habits");
}

export async function archiveHabit(id: string) {
  const userId = await requireDbUserId();
  await db.habit.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
  bumpTag("analytics");
  revalidatePath("/habits");
}
