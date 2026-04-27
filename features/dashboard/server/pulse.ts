import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";

export type ProductivityPulse = {
  // 0–100 productivity score over the last 30 days.
  score: number;
  // Percent change vs. the prior 30-day window. null if there's no baseline
  // (e.g. brand-new account with no prior activity at all).
  deltaPct: number | null;
  // 8 weekly average scores, oldest → newest, for the mini sparkline.
  sparkline: number[];
};

// Per-day score uses the same rubric as the analytics heatmap so the sidebar
// card and analytics page tell the same story:
//   tasks completed × 10 + habit logs × 8 + focus minutes / 6, capped at 100.
function buildDailyScores(args: {
  tasks: { completedAt: Date | null }[];
  habits: { date: Date }[];
  sessions: { startedAt: Date; endedAt: Date | null }[];
}): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const t of args.tasks) {
    if (!t.completedAt) continue;
    const k = format(startOfDay(t.completedAt), "yyyy-MM-dd");
    byDay.set(k, (byDay.get(k) ?? 0) + 10);
  }
  for (const h of args.habits) {
    const k = format(startOfDay(h.date), "yyyy-MM-dd");
    byDay.set(k, (byDay.get(k) ?? 0) + 8);
  }
  for (const s of args.sessions) {
    if (!s.endedAt) continue;
    const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
    const k = format(startOfDay(s.startedAt), "yyyy-MM-dd");
    byDay.set(k, (byDay.get(k) ?? 0) + min / 6);
  }
  // Cap per-day at 100 so a single binge day doesn't dominate.
  for (const [k, v] of byDay) byDay.set(k, Math.min(100, v));
  return byDay;
}

function avgRange(byDay: Map<string, number>, from: Date, days: number): number {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const k = format(addDays(from, i), "yyyy-MM-dd");
    sum += byDay.get(k) ?? 0;
  }
  return sum / days;
}

const _getProductivityPulseCached = unstable_cache(
  async (userId: string): Promise<ProductivityPulse> => {
    const today = startOfDay(new Date());
  // We need 8 weeks (56 days) for the sparkline AND a 30-day window before
  // that for the previous-period comparison. So pull 86 days total.
  const windowStart = subDays(today, 85);

  const [tasks, sessions, habits] = await Promise.all([
    db.task.findMany({
      where: { userId, completedAt: { gte: windowStart } },
      select: { completedAt: true },
    }),
    db.pomodoroSession.findMany({
      where: { userId, completed: true, startedAt: { gte: windowStart } },
      select: { startedAt: true, endedAt: true },
    }),
    db.habitLog.findMany({
      where: {
        completed: true,
        date: { gte: windowStart },
        habit: { userId },
      },
      select: { date: true },
    }),
  ]);

  const byDay = buildDailyScores({ tasks, habits, sessions });

  // Last 30 days (today inclusive) vs. the 30 days before that.
  const recentStart = subDays(today, 29);
  const prevStart = subDays(today, 59);
  const score = Math.round(avgRange(byDay, recentStart, 30));
  const prevScore = Math.round(avgRange(byDay, prevStart, 30));
  // No baseline → null (UI falls back to showing the absolute score).
  const deltaPct =
    prevScore === 0
      ? null
      : Math.round(((score - prevScore) / prevScore) * 100);

    // 8 weekly averages, oldest → newest, ending on today.
    const sparkline: number[] = [];
    for (let w = 7; w >= 0; w--) {
      const wkStart = subDays(today, w * 7 + 6);
      sparkline.push(Math.round(avgRange(byDay, wkStart, 7)));
    }

    return { score, deltaPct, sparkline };
  },
  ["productivity-pulse"],
  { tags: ["analytics"], revalidate: 60 },
);

export const getProductivityPulse = cache(async () => {
  const userId = await requireDbUserId();
  return _getProductivityPulseCached(userId);
});
