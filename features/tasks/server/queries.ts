import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  type Filter,
  type Sort,
  deriveStatus,
  toUiPriority,
} from "@/features/tasks/schema";

// ─── User resolution ─────────────────────────────────────────────────────────
// Memoize per-request via React cache() so 4 parallel queries on the same
// render don't all re-hit Clerk + Prisma. We do a fast findUnique first; only
// fall back to upsert when the row is missing (rare, just-signed-up users).
export const requireDbUserId = cache(async (): Promise<string> => {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated");

  const existing = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const cu = await currentUser();
  const user = await db.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: cu?.primaryEmailAddress?.emailAddress ?? `${clerkId}@unknown`,
      name: cu?.fullName ?? cu?.firstName ?? null,
      imageUrl: cu?.imageUrl ?? null,
    },
    select: { id: true },
  });
  return user.id;
});

// ─── Types returned to the page ──────────────────────────────────────────────
export type TaskRow = {
  id: string;
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  dueDate: Date | null;
  tags: string[];
  completedAt: Date | null;
  createdAt: Date;
};

export type TaskStats = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionPct: number;
  pendingPct: number;
  overduePct: number;
};

export const PAGE_SIZE = 8;

// ─── getTasks ────────────────────────────────────────────────────────────────
// (Note: per-request memoization for stats/dueDays/tags is added at the
// bottom of this file via React `cache()` so multiple Suspense boundaries
// don't re-query the same data.)
export async function getTasks(opts: {
  filter?: Filter;
  sort?: Sort;
  page?: number;
  search?: string;
  priorityFilter?: "HIGH" | "MEDIUM" | "LOW" | null;
  statusFilter?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | null;
  tagFilter?: string | null;
}): Promise<{ rows: TaskRow[]; total: number; page: number; totalPages: number }> {
  const userId = await requireDbUserId();
  const filter: Filter = opts.filter ?? "ALL";
  const sort: Sort = opts.sort ?? "PRIORITY";
  const page = Math.max(1, opts.page ?? 1);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  // Base where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (opts.search) {
    where.title = { contains: opts.search, mode: "insensitive" };
  }
  if (opts.priorityFilter) {
    where.priority =
      opts.priorityFilter === "MEDIUM" ? "MED" : opts.priorityFilter;
  }
  if (opts.tagFilter) {
    where.tags = { has: opts.tagFilter };
  }

  // Filter chip semantics
  if (filter === "TODAY") {
    where.AND = [
      { dueDate: { gte: startOfToday, lt: startOfTomorrow } },
      { status: { not: "DONE" } },
    ];
  } else if (filter === "UPCOMING") {
    where.AND = [
      { dueDate: { gte: startOfTomorrow } },
      { status: { not: "DONE" } },
    ];
  } else if (filter === "OVERDUE") {
    where.AND = [
      { dueDate: { lt: now } },
      { status: { not: "DONE" } },
    ];
  } else if (filter === "COMPLETED") {
    where.status = "DONE";
  }

  // Status filter (additional)
  if (opts.statusFilter === "COMPLETED") {
    where.status = "DONE";
  } else if (opts.statusFilter === "OVERDUE") {
    where.AND = [...(where.AND ?? []), { dueDate: { lt: now } }, { status: { not: "DONE" } }];
  } else if (opts.statusFilter === "IN_PROGRESS") {
    where.status = "DOING";
  } else if (opts.statusFilter === "PENDING") {
    where.AND = [
      ...(where.AND ?? []),
      { status: "TODO" },
      { OR: [{ dueDate: null }, { dueDate: { gte: now } }] },
    ];
  }

  // Sorting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;
  if (sort === "PRIORITY") {
    // URGENT(0) HIGH(1) MED(2) LOW(3) — Prisma supports priority enum sort, so
    // we approximate by using a CASE via raw isn't trivial; rely on enum
    // ordering by name plus completedAt desc.
    orderBy = [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }];
  } else if (sort === "DUE_DATE") {
    orderBy = [{ dueDate: "asc" }, { createdAt: "desc" }];
  } else {
    orderBy = [{ createdAt: "desc" }];
  }

  const [rows, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        dueDate: true,
        tags: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    db.task.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      title: r.title,
      priority: toUiPriority(r.priority),
      status: deriveStatus({
        status: r.status,
        dueDate: r.dueDate,
        completedAt: r.completedAt,
      }),
      dueDate: r.dueDate,
      tags: r.tags,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// ─── getTaskStats ────────────────────────────────────────────────────────────
export const getTaskStats = cache(async (): Promise<TaskStats> => {
  const userId = await requireDbUserId();
  const now = new Date();

  const [total, completed, overdue, pendingTodo, pendingDoing] = await Promise.all([
    db.task.count({ where: { userId } }),
    db.task.count({ where: { userId, status: "DONE" } }),
    db.task.count({
      where: { userId, status: { not: "DONE" }, dueDate: { lt: now } },
    }),
    db.task.count({
      where: {
        userId,
        status: "TODO",
        OR: [{ dueDate: null }, { dueDate: { gte: now } }],
      },
    }),
    db.task.count({
      where: {
        userId,
        status: "DOING",
        OR: [{ dueDate: null }, { dueDate: { gte: now } }],
      },
    }),
  ]);

  const pending = pendingTodo + pendingDoing;
  const safe = total === 0 ? 1 : total;

  return {
    total,
    completed,
    pending,
    overdue,
    completionPct: Math.round((completed / safe) * 100),
    pendingPct: Math.round((pending / safe) * 100),
    overduePct: Math.round((overdue / safe) * 100),
  };
});

// ─── Calendar dots (dates that have a task due) ──────────────────────────────
export const getTaskDueDates = cache(async (opts: {
  year: number;
  month: number; // 0-11
}): Promise<number[]> => {
  const userId = await requireDbUserId();
  const start = new Date(opts.year, opts.month, 1);
  const end = new Date(opts.year, opts.month + 1, 1);
  const rows = await db.task.findMany({
    where: { userId, dueDate: { gte: start, lt: end } },
    select: { dueDate: true },
  });
  const days = new Set<number>();
  for (const r of rows) {
    if (r.dueDate) days.add(r.dueDate.getDate());
  }
  return [...days];
});

// ─── Distinct tags for the filter dropdown ───────────────────────────────────
const _getDistinctTagsCached = unstable_cache(
  async (userId: string): Promise<string[]> => {
    const rows = await db.task.findMany({
      where: { userId },
      select: { tags: true },
    });
    const set = new Set<string>();
    for (const r of rows) for (const t of r.tags) set.add(t);
    return [...set].sort();
  },
  ["tasks-distinct-tags"],
  { tags: ["tags"], revalidate: 300 },
);

export const getDistinctTags = cache(async (): Promise<string[]> => {
  const userId = await requireDbUserId();
  return _getDistinctTagsCached(userId);
});
