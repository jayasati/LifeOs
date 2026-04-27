import "server-only";
import { cache } from "react";
import { format, formatDistanceToNowStrict, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";

export type Provider = "GITHUB" | "LEETCODE";

export type IntegrationRow = {
  provider: Provider;
  connected: boolean;
  lastSyncedAt: Date | null;
  // Free-form metadata for stats badges (commits/problems counts, last calendar
  // import, etc). Stored as Prisma Json so we don't need new tables for the
  // "look real" mockup data.
  metadata: Record<string, unknown> | null;
};

// Single source of truth for the user's integration rows. React's per-request
// cache means /integrations only hits the DB once even though three separate
// queries below all need this data.
const loadIntegrationRows = cache(async (): Promise<IntegrationRow[]> => {
  const userId = await requireDbUserId();
  // Only the fields the UI consumes — explicitly excludes accessToken /
  // refreshToken so secrets aren't shuttled into the React tree or the
  // per-request cache. Sync code reaches for tokens via dedicated lookups.
  const rows = await db.integration.findMany({
    where: { userId },
    select: {
      provider: true,
      lastSyncedAt: true,
      metadata: true,
    },
  });
  const map = new Map<Provider, IntegrationRow>();
  for (const r of rows) {
    map.set(r.provider as Provider, {
      provider: r.provider as Provider,
      connected: true,
      lastSyncedAt: r.lastSyncedAt,
      metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    });
  }
  const all: Provider[] = ["GITHUB", "LEETCODE"];
  return all.map(
    (p) =>
      map.get(p) ?? {
        provider: p,
        connected: false,
        lastSyncedAt: null,
        metadata: null,
      },
  );
});

export const getIntegrations = loadIntegrationRows;

// ─── Overview (donut, GitHub bar, LeetCode breakdown) ────────────────────────
export type IntegrationOverview = {
  // Time breakdown — pulled from PomodoroSession by type, like analytics.
  timeBreakdown: { label: string; minutes: number; color: string }[];
  totalFocusHours: number;
  totalFocusMinutesRemainder: number;
  // 7-day GitHub commit bar — zeroed until the OAuth fetcher exists.
  githubBars: { label: string; commits: number; isToday: boolean }[];
  githubCommitsThisWeek: number;
  githubConnected: boolean;
  // LeetCode breakdown — zeroed until the OAuth fetcher exists.
  leetcode: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    weekSolved: number;
    currentStreak: number;
    connected: boolean;
  };
};

const VIOLET = "hsl(var(--primary))";
const GREEN = "hsl(var(--kpi-green))";
const ORANGE = "hsl(var(--kpi-orange))";

export const getIntegrationOverview = cache(
  async (): Promise<IntegrationOverview> => {
    const userId = await requireDbUserId();
    const now = new Date();
    const weekAgo = subDays(startOfDay(now), 6);

    const [sessions, rows] = await Promise.all([
      db.pomodoroSession.findMany({
        where: {
          userId,
          completed: true,
          startedAt: { gte: weekAgo },
        },
        select: { type: true, startedAt: true, endedAt: true },
      }),
      loadIntegrationRows(),
    ]);
    const integrations = rows.filter((r) => r.connected);

    // Time breakdown — last 7 days, by type.
    const buckets = new Map<string, number>();
    for (const s of sessions) {
      if (!s.endedAt) continue;
      const min = (s.endedAt.getTime() - s.startedAt.getTime()) / 60_000;
      const label =
        s.type === "FOCUS"
          ? "Coding (GitHub)"
          : s.type === "SHORT_BREAK"
            ? "LeetCode (Practice)"
            : "Other";
      buckets.set(label, (buckets.get(label) ?? 0) + min);
    }
    const timeBreakdown = [
      { label: "Coding (GitHub)", color: VIOLET },
      { label: "LeetCode (Practice)", color: GREEN },
      { label: "Other", color: ORANGE },
    ].map((s) => ({ ...s, minutes: Math.round(buckets.get(s.label) ?? 0) }));
    const totalMin = timeBreakdown.reduce((a, b) => a + b.minutes, 0);
    const totalFocusHours = Math.floor(totalMin / 60);
    const totalFocusMinutesRemainder = totalMin % 60;

    // GitHub commits — read from real metadata written by syncGithub.
    const ghIntegration = integrations.find((i) => i.provider === "GITHUB");
    const ghMeta = ghIntegration?.metadata as
      | {
          commitsThisWeek?: number;
          commitsByDay?: Record<string, number>;
        }
      | null
      | undefined;
    const todayKey = format(startOfDay(now), "yyyy-MM-dd");
    const githubBars: { label: string; commits: number; isToday: boolean }[] = [];
    let weekCommits = 0;
    for (let i = 6; i >= 0; i--) {
      const d = subDays(startOfDay(now), i);
      const key = format(d, "yyyy-MM-dd");
      const c = Number(ghMeta?.commitsByDay?.[key] ?? 0);
      weekCommits += c;
      githubBars.push({
        label: format(d, "EEE"),
        commits: c,
        isToday: key === todayKey,
      });
    }
    if (ghMeta?.commitsThisWeek != null) {
      weekCommits = Number(ghMeta.commitsThisWeek);
    }

    // LeetCode — read from real metadata written by syncLeetcode.
    const ltIntegration = integrations.find((i) => i.provider === "LEETCODE");
    const ltMeta = ltIntegration?.metadata as
      | {
          easy?: number;
          medium?: number;
          hard?: number;
          weekSolved?: number;
          currentStreak?: number;
        }
      | null
      | undefined;
    const leetcode = {
      easy: Number(ltMeta?.easy ?? 0),
      medium: Number(ltMeta?.medium ?? 0),
      hard: Number(ltMeta?.hard ?? 0),
      total:
        Number(ltMeta?.easy ?? 0) +
        Number(ltMeta?.medium ?? 0) +
        Number(ltMeta?.hard ?? 0),
      weekSolved: Number(ltMeta?.weekSolved ?? 0),
      currentStreak: Number(ltMeta?.currentStreak ?? 0),
      connected: !!ltIntegration,
    };

    return {
      timeBreakdown,
      totalFocusHours,
      totalFocusMinutesRemainder,
      githubBars,
      githubCommitsThisWeek: weekCommits,
      githubConnected: !!ghIntegration,
      leetcode,
    };
  },
);

// ─── Recent activity feed (derived from real metadata) ──────────────────────
export type ActivityItem = {
  id: string;
  provider: Provider;
  title: string;
  body: string;
  when: string; // human-readable
  href?: string; // external/internal target the row should open
  tone?: "default" | "error" | "warning";
  sortKey: number; // epoch ms — items are sorted desc before truncation
};

function whenLabel(ts: Date | string | null | undefined): string {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return "—";
  if (Date.now() - d.getTime() < 45_000) return "just now";
  return `${formatDistanceToNowStrict(d)} ago`;
}

export const getRecentIntegrationActivity = cache(
  async (): Promise<ActivityItem[]> => {
    // Surfaces ground-truth events derived from each provider's stored
    // metadata. We never fabricate timestamps — every "when" comes from
    // lastSyncedAt / metadata.syncedAt so the feed actually reflects state.
    const rows = await loadIntegrationRows();
    const connected = rows.filter((r) => r.connected);
    if (connected.length === 0) return [];

    const items: ActivityItem[] = [];

    for (const row of connected) {
      const md = (row.metadata ?? {}) as Record<string, unknown>;
      const syncedAtRaw = (md.syncedAt as string | undefined) ?? null;
      const syncedAt = syncedAtRaw
        ? new Date(syncedAtRaw)
        : (row.lastSyncedAt ?? null);
      const sortKey = syncedAt ? syncedAt.getTime() : 0;
      const syncError =
        typeof md.syncError === "string" ? md.syncError : null;

      if (row.provider === "GITHUB") {
        const login = typeof md.login === "string" ? md.login : null;
        const profileHref = login ? `https://github.com/${login}` : undefined;
        const commits =
          typeof md.commitsThisWeek === "number" ? md.commitsThisWeek : null;
        const prs = typeof md.prsThisWeek === "number" ? md.prsThisWeek : null;
        const byDay = (md.commitsByDay as Record<string, number> | undefined) ?? {};
        const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
        const todayCommits = Number(byDay[todayKey] ?? 0);

        if (syncError) {
          items.push({
            id: "gh-error",
            provider: "GITHUB",
            title: "GitHub sync failed",
            body: syncError,
            when: whenLabel(syncedAt),
            href: profileHref,
            tone: "error",
            sortKey,
          });
        }
        if (todayCommits > 0) {
          items.push({
            id: "gh-today",
            provider: "GITHUB",
            title: `${todayCommits} ${todayCommits === 1 ? "commit" : "commits"} pushed today`,
            body: login ? `@${login} · today's contributions` : "today's contributions",
            when: whenLabel(syncedAt),
            href: profileHref,
            sortKey: sortKey + 2,
          });
        }
        if (commits != null) {
          items.push({
            id: "gh-week",
            provider: "GITHUB",
            title: `${commits} ${commits === 1 ? "commit" : "commits"} this week`,
            body: login ? `@${login} · last 7 days` : "last 7 days",
            when: whenLabel(syncedAt),
            href: profileHref,
            sortKey: sortKey + 1,
          });
        }
        if (prs != null && prs > 0) {
          items.push({
            id: "gh-prs",
            provider: "GITHUB",
            title: `${prs} ${prs === 1 ? "PR" : "PRs"} merged this week`,
            body: login ? `@${login} · pull requests` : "pull requests",
            when: whenLabel(syncedAt),
            href: login
              ? `https://github.com/${login}?tab=pull-requests`
              : profileHref,
            sortKey,
          });
        }
        if (
          !syncError &&
          commits == null &&
          prs == null
        ) {
          items.push({
            id: "gh-pending",
            provider: "GITHUB",
            title: "GitHub awaiting first sync",
            body: "Hit refresh on the GitHub card to fetch your activity",
            when: whenLabel(syncedAt),
            href: profileHref,
            tone: "warning",
            sortKey,
          });
        }
      }

      if (row.provider === "LEETCODE") {
        const username =
          typeof md.username === "string" ? md.username : null;
        const profileHref = username
          ? `https://leetcode.com/${username}`
          : undefined;
        const week =
          typeof md.weekSolved === "number" ? md.weekSolved : null;
        const streak =
          typeof md.currentStreak === "number" ? md.currentStreak : null;
        const total =
          ["easy", "medium", "hard"].reduce(
            (a, k) => a + (typeof md[k] === "number" ? (md[k] as number) : 0),
            0,
          );

        if (syncError) {
          items.push({
            id: "lc-error",
            provider: "LEETCODE",
            title: "LeetCode sync failed",
            body: syncError,
            when: whenLabel(syncedAt),
            href: profileHref,
            tone: "error",
            sortKey,
          });
        }
        if (week != null && week > 0) {
          items.push({
            id: "lc-week",
            provider: "LEETCODE",
            title: `Solved ${week} ${week === 1 ? "problem" : "problems"} this week`,
            body: username ? `@${username} · last 7 days` : "last 7 days",
            when: whenLabel(syncedAt),
            href: profileHref,
            sortKey: sortKey + 2,
          });
        }
        if (streak != null && streak > 0) {
          items.push({
            id: "lc-streak",
            provider: "LEETCODE",
            title: `${streak}-day coding streak`,
            body: username ? `@${username} · keep it going` : "keep it going",
            when: whenLabel(syncedAt),
            href: profileHref,
            sortKey: sortKey + 1,
          });
        }
        if (!syncError && week == null && total === 0) {
          items.push({
            id: "lc-pending",
            provider: "LEETCODE",
            title: "LeetCode awaiting first sync",
            body: username
              ? `@${username} · hit refresh to fetch stats`
              : "Hit refresh on the LeetCode card",
            when: whenLabel(syncedAt),
            href: profileHref,
            tone: "warning",
            sortKey,
          });
        }
      }

    }

    items.sort((a, b) => b.sortKey - a.sortKey);
    return items.slice(0, 5);
  },
);
