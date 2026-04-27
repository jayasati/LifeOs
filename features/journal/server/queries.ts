import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";
import { wordsOf, timeWritingMin } from "@/features/journal/schema";

export type EntryListRow = {
  id: string;
  title: string | null;
  content: string;
  mood: number | null;
  imageUrl: string | null;
  tags: string[];
  date: Date;
};

export const PAGE_SIZE = 8;

export const getEntries = cache(
  async (opts: {
    search?: string;
    page?: number;
  } = {}): Promise<{
    rows: EntryListRow[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const userId = await requireDbUserId();
    const page = Math.max(1, opts.page ?? 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (opts.search) {
      where.OR = [
        { title: { contains: opts.search, mode: "insensitive" } },
        { content: { contains: opts.search, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      db.journalEntry.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          content: true,
          mood: true,
          imageUrl: true,
          tags: true,
          date: true,
        },
      }),
      db.journalEntry.count({ where }),
    ]);
    return {
      rows,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  },
);

export const getEntryById = cache(async (id: string) => {
  const userId = await requireDbUserId();
  return db.journalEntry.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      content: true,
      mood: true,
      imageUrl: true,
      tags: true,
    },
  });
});

export type JournalStats = {
  totalEntries: number;
  thisMonthCount: number;
  writingStreak: number;
  longestStreak: number;
  moodCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  avgWords: number;
  totalWords: number;
  totalTimeWritingMin: number;
  mostActiveDay: string | null; // "Sunday"
};

export const getJournalStats = cache(async (): Promise<JournalStats> => {
  const userId = await requireDbUserId();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [all, thisMonth] = await Promise.all([
    db.journalEntry.findMany({
      where: { userId },
      select: { date: true, content: true, mood: true },
    }),
    db.journalEntry.count({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  // Mood counts
  const moodCounts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const e of all) {
    if (e.mood && e.mood >= 1 && e.mood <= 5) {
      moodCounts[e.mood as 1 | 2 | 3 | 4 | 5]++;
    }
  }

  // Words / time
  let totalWords = 0;
  let totalTime = 0;
  for (const e of all) {
    totalWords += wordsOf(e.content);
    totalTime += timeWritingMin(e.content);
  }
  const avgWords = all.length > 0 ? Math.round(totalWords / all.length) : 0;

  // Day-of-week distribution → most active
  const dayBuckets: Record<number, number> = {};
  const daySet = new Set<string>();
  for (const e of all) {
    const d = startOfDay(e.date);
    daySet.add(format(d, "yyyy-MM-dd"));
    const dow = d.getDay(); // 0=Sun..6=Sat
    dayBuckets[dow] = (dayBuckets[dow] ?? 0) + 1;
  }
  let mostActiveDay: string | null = null;
  let bestCount = 0;
  for (const [k, v] of Object.entries(dayBuckets)) {
    if (v > bestCount) {
      bestCount = v;
      mostActiveDay = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][Number(k)];
    }
  }

  // Streak math (consecutive days ending today/yesterday)
  const today = startOfDay(now);
  const yesterday = startOfDay(addDays(today, -1));
  let cursor = daySet.has(format(today, "yyyy-MM-dd")) ? today : yesterday;
  let writingStreak = 0;
  while (daySet.has(format(cursor, "yyyy-MM-dd"))) {
    writingStreak++;
    cursor = addDays(cursor, -1);
  }
  // Longest run in history
  const dayList = [...daySet].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of dayList) {
    const d = startOfDay(new Date(k));
    if (prev && (d.getTime() - prev.getTime()) === 86_400_000) run++;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  return {
    totalEntries: all.length,
    thisMonthCount: thisMonth,
    writingStreak,
    longestStreak,
    moodCounts,
    avgWords,
    totalWords,
    totalTimeWritingMin: totalTime,
    mostActiveDay,
  };
});

export const getEntryDays = cache(
  async (opts: {
    year: number;
    month: number;
  }): Promise<number[]> => {
    const userId = await requireDbUserId();
    const start = new Date(opts.year, opts.month, 1);
    const end = new Date(opts.year, opts.month + 1, 1);
    const rows = await db.journalEntry.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { date: true },
    });
    const set = new Set<number>();
    for (const r of rows) set.add(startOfDay(r.date).getDate());
    return [...set];
  },
);

const _getJournalDistinctTagsCached = unstable_cache(
  async (userId: string): Promise<string[]> => {
    const rows = await db.journalEntry.findMany({
      where: { userId },
      select: { tags: true },
    });
    const set = new Set<string>();
    for (const r of rows) for (const t of r.tags) set.add(t);
    return [...set].sort();
  },
  ["journal-distinct-tags"],
  { tags: ["tags"], revalidate: 300 },
);

export const getDistinctTags = cache(async (): Promise<string[]> => {
  const userId = await requireDbUserId();
  return _getJournalDistinctTagsCached(userId);
});

// Suppress unused import warning while keeping endOfDay imported for potential future use
export const _endOfDay = endOfDay;
