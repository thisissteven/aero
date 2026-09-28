import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { ACTIVITY_SUMMARY_PATH, GET_ALL_LIMIT } from '@/server/helper';
import { getAllAdapters } from '@/server/services/harness/registry';
import type { AeroSessionSummary } from '@/server/services/harness/types';
import { listSessionsAcrossAdapters } from '@/server/services/sessions/sessions-merger';
import { normalizePath } from '@/server/shared';

const CACHE_VERSION = 2;

/**
 * Freshness window for the cached session activity. Inside this window a request
 * is served straight from memory. Outside of it the cached records are still
 * returned immediately while a background refresh runs, so a request never
 * waits on recomputation.
 */
const CACHE_TTL_MS = 60_000;

const WEEKS = 53;
const DAY_MS = 86_400_000;

export interface ActivityDay {
  date: string;
  count: number;
  level: number;
}

export interface ActivitySummary {
  generatedAt: number;
  totalSessions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  workspaces: number;
  last7Days: number;
  busiestDay: { date: string; count: number } | null;
  maxCount: number;
  days: ActivityDay[];
}

interface ActivityRecord {
  createdAt: number;
  workspace: string;
}

interface ActivityCacheFile {
  version: number;
  generatedAt: number;
  records: ActivityRecord[];
}

function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function computeLevel(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4)));
}

function buildSummary(
  records: ActivityRecord[],
  generatedAt: number,
): ActivitySummary {
  const counts = new Map<string, number>();
  const workspaces = new Set<string>();

  for (const record of records) {
    if (record.workspace && !record.workspace.includes('.aero/workspaces')) {
      workspaces.add(record.workspace);
    }

    const key = dayKey(record.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sortedDays = [...counts.keys()].map(dayNumber).sort((a, b) => a - b);

  let longestStreak = 0;
  let run = 0;
  let previous: number | null = null;

  for (const current of sortedDays) {
    run = previous !== null && current - previous === 1 ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    previous = current;
  }

  const today = startOfLocalDay(Date.now());

  let cursor = new Date(today);
  if (!counts.has(dayKey(cursor.getTime()))) {
    cursor = addDays(cursor, -1);
  }

  let currentStreak = 0;
  while (counts.has(dayKey(cursor.getTime()))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let last7Days = 0;
  for (let index = 0; index < 7; index++) {
    last7Days += counts.get(dayKey(addDays(today, -index).getTime())) ?? 0;
  }

  let busiestDay: ActivitySummary['busiestDay'] = null;
  for (const [date, count] of counts) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { date, count };
  }

  const sundayThisWeek = addDays(today, -today.getDay());
  const rangeStart = addDays(sundayThisWeek, -(WEEKS - 1) * 7);

  const days: ActivityDay[] = [];
  let maxCount = 0;

  for (let index = 0; index < WEEKS * 7; index++) {
    const date = dayKey(addDays(rangeStart, index).getTime());
    const count = counts.get(date) ?? 0;
    if (count > maxCount) maxCount = count;
    days.push({ date, count, level: 0 });
  }

  for (const day of days) {
    day.level = computeLevel(day.count, maxCount);
  }

  return {
    generatedAt,
    totalSessions: records.length,
    activeDays: counts.size,
    currentStreak,
    longestStreak,
    workspaces: workspaces.size,
    last7Days,
    busiestDay,
    maxCount,
    days,
  };
}

async function readCacheFile(): Promise<ActivityCacheFile | null> {
  try {
    const raw = await readFile(ACTIVITY_SUMMARY_PATH, 'utf8');
    const parsed = JSON.parse(raw) as ActivityCacheFile;

    if (parsed?.version !== CACHE_VERSION || !Array.isArray(parsed.records)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function writeCacheFile(file: ActivityCacheFile): Promise<void> {
  await mkdir(dirname(ACTIVITY_SUMMARY_PATH), { recursive: true });

  const tempPath = `${ACTIVITY_SUMMARY_PATH}.tmp`;

  await writeFile(tempPath, JSON.stringify(file), 'utf8');
  await rename(tempPath, ACTIVITY_SUMMARY_PATH);
}

let cache: ActivityCacheFile | null = null;
let loaded = false;
let loadPromise: Promise<void> | null = null;
let inflight: Promise<ActivityCacheFile> | null = null;

function ensureLoaded(): Promise<void> {
  if (loaded || loadPromise) return loadPromise ?? Promise.resolve();

  loadPromise = readCacheFile()
    .then((file) => {
      cache = file;
    })
    .finally(() => {
      loaded = true;
      loadPromise = null;
    });

  return loadPromise;
}

function refresh(): Promise<ActivityCacheFile> {
  if (!inflight) {
    inflight = (async () => {
      const adapters = await getAllAdapters();
      const { items } = await listSessionsAcrossAdapters(adapters, {
        limit: GET_ALL_LIMIT,
      });

      const records = items.map(
        (session: AeroSessionSummary): ActivityRecord => ({
          createdAt: session.createdAt,
          workspace: session.workspace,
        }),
      );

      const file: ActivityCacheFile = {
        version: CACHE_VERSION,
        generatedAt: Date.now(),
        records,
      };

      cache = file;
      await writeCacheFile(file).catch(() => {});

      return file;
    })().finally(() => {
      inflight = null;
    });
  }

  return inflight;
}

export async function getActivitySummary(
  params: { directory?: string } = {},
): Promise<ActivitySummary> {
  await ensureLoaded();

  let records: ActivityRecord[];
  let generatedAt: number;

  if (cache && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
    records = cache.records;
    generatedAt = cache.generatedAt;
  } else if (cache) {
    records = cache.records;
    generatedAt = cache.generatedAt;
    refresh().catch(() => {});
  } else {
    const file = await refresh();
    records = file.records;
    generatedAt = file.generatedAt;
  }

  const directory = params.directory
    ? normalizePath(params.directory)
    : undefined;

  const scoped = directory
    ? records.filter((record) => normalizePath(record.workspace) === directory)
    : records;

  return buildSummary(scoped, generatedAt);
}
