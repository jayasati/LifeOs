"use server";

import { revalidatePath } from "next/cache";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";
import { createHabitSchema, type CreateHabitInput } from "@/features/habits/schema";

// Streak logic — deterministic.
//   currentStreak = number of consecutive days ending today (or yesterday if today
//                   is not yet logged) that are all completed.
//   longestStreak = max length of any consecutive run of completed days in history.
function recomputeStreaks(completedDates: Date[]): {
  current: number;
  longest: number;
} {
  if (completedDates.length === 0) return { current: 0, longest: 0 };

  // Normalize, dedupe, sort asc.
  const set = new Set<number>();
  for (const d of completedDates) set.add(startOfDay(d).getTime());
  const dates = [...set].sort((a, b) => a - b);

  // Longest run.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((dates[i] - dates[i - 1]) / 86_400_000);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current run — work back from today / yesterday.
  const today = startOfDay(new Date()).getTime();
  const yesterday = startOfDay(addDays(new Date(), -1)).getTime();
  const completedSet = set;
  let cursor = completedSet.has(today) ? today : yesterday;
  let current = 0;
  while (completedSet.has(cursor)) {
    current++;
    cursor -= 86_400_000;
  }

  return { current, longest };
}

export async function toggleHabitLog(habitId: string, date: Date) {
  const userId = await requireDbUserId();
  const day = startOfDay(date);

  // Don't allow toggling future days
  if (differenceInCalendarDays(day, startOfDay(new Date())) > 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    const habit = await tx.habit.findFirst({
      where: { id: habitId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!habit) return;

    // Toggle: if a log exists for that day, flip completed; otherwise create.
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

    // Recompute streaks for this habit.
    const all = await tx.habitLog.findMany({
      where: { habitId, completed: true },
      select: { date: true },
    });
    const { current, longest } = recomputeStreaks(all.map((l) => l.date));
    await tx.habit.update({
      where: { id: habitId },
      data: { currentStreak: current, longestStreak: longest },
    });
  });

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
      targetPerWeek: data.targetPerWeek ?? null,
    },
  });
  revalidatePath("/habits");
}

export async function archiveHabit(id: string) {
  const userId = await requireDbUserId();
  await db.habit.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/habits");
}
