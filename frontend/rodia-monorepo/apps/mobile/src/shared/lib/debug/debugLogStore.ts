// apps/mobile/src/shared/lib/debug/debugLogStore.ts
export type DebugLogTag = "AUTH" | "QUOTE" | "MATCH" | "OFFER" | "NOTI" | "UNKNOWN";
export type DebugLogLevel = "info" | "warn" | "error";
export type DebugLogPhase = "request" | "response" | "error";

export type DebugLogEntry = {
  id: string;
  requestId: string;
  ts: number;
  phase: DebugLogPhase;
  level: DebugLogLevel;
  tag: DebugLogTag;
  title: string;

  method?: string;
  path?: string;
  url?: string;
  status?: number | "NETWORK_ERROR";
  durationMs?: number;

  request?: unknown;
  response?: unknown;
  error?: unknown;
};

export type DebugLogGroup = {
  requestId: string;
  startedAt: number;
  latestAt: number;
  level: DebugLogLevel;
  tag: DebugLogTag;
  method?: string;
  path?: string;
  url?: string;
  status?: number | "NETWORK_ERROR";
  durationMs?: number;
  timeline: Array<{
    id: string;
    ts: number;
    phase: DebugLogPhase;
    level: DebugLogLevel;
    status?: number | "NETWORK_ERROR";
    title: string;
    durationMs?: number;
  }>;
  requestEntry?: DebugLogEntry;
  responseEntry?: DebugLogEntry;
  errorEntry?: DebugLogEntry;
  entries: DebugLogEntry[];
};

type Listener = () => void;

const MAX_ENTRIES = 200;

let entries: DebugLogEntry[] = [];
const listeners = new Set<Listener>();

function nowId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore
    }
  });
}

function severity(level: DebugLogLevel): number {
  if (level === "error") return 3;
  if (level === "warn") return 2;
  return 1;
}

function pickLevel(list: DebugLogEntry[]): DebugLogLevel {
  let max: DebugLogLevel = "info";
  for (const item of list) {
    if (severity(item.level) > severity(max)) max = item.level;
  }
  return max;
}

function pickTag(list: DebugLogEntry[]): DebugLogTag {
  const fromRequest = list.find((item) => item.phase === "request" && item.tag)?.tag;
  if (fromRequest) return fromRequest;
  const nonUnknown = list.find((item) => item.tag !== "UNKNOWN")?.tag;
  return nonUnknown ?? "UNKNOWN";
}

function sortByTsAsc(list: DebugLogEntry[]): DebugLogEntry[] {
  return list.slice().sort((a, b) => a.ts - b.ts);
}

function buildGroup(groupEntries: DebugLogEntry[]): DebugLogGroup {
  const sorted = sortByTsAsc(groupEntries);
  const first = sorted[0] ?? groupEntries[0];
  const requestEntry = sorted.find((e) => e.phase === "request");
  const responseEntry = sorted.find((e) => e.phase === "response");
  const errorEntry = sorted.find((e) => e.phase === "error");

  const startedAt = requestEntry?.ts ?? first?.ts ?? Date.now();
  const latestAt = sorted[sorted.length - 1]?.ts ?? startedAt;

  const method = requestEntry?.method ?? responseEntry?.method ?? errorEntry?.method;
  const path = requestEntry?.path ?? responseEntry?.path ?? errorEntry?.path;
  const url = requestEntry?.url ?? responseEntry?.url ?? errorEntry?.url;
  const status = responseEntry?.status ?? errorEntry?.status;
  const durationMs = responseEntry?.durationMs ?? errorEntry?.durationMs;

  return {
    requestId: first?.requestId ?? nowId(),
    startedAt,
    latestAt,
    level: pickLevel(sorted),
    tag: pickTag(sorted),
    method,
    path,
    url,
    status,
    durationMs,
    timeline: sorted.map((item) => ({
      id: item.id,
      ts: item.ts,
      phase: item.phase,
      level: item.level,
      status: item.status,
      title: item.title,
      durationMs: item.durationMs,
    })),
    requestEntry,
    responseEntry,
    errorEntry,
    entries: sorted,
  };
}

function normalizeString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function groupByRequestId(source: DebugLogEntry[]): DebugLogGroup[] {
  const map = new Map<string, DebugLogEntry[]>();
  for (const item of source) {
    const key = normalizeString(item.requestId) || item.id;
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  const groups = Array.from(map.values()).map((list) => buildGroup(list));
  groups.sort((a, b) => b.latestAt - a.latestAt);
  return groups;
}

export const debugLogStore = {
  add(next: Omit<DebugLogEntry, "id" | "ts" | "requestId" | "phase"> & Partial<Pick<DebugLogEntry, "id" | "ts" | "requestId" | "phase">>) {
    const id = next.id ?? nowId();
    const requestId = normalizeString(next.requestId) || id;

    const entry: DebugLogEntry = {
      id,
      requestId,
      ts: next.ts ?? Date.now(),
      phase: next.phase ?? "request",
      level: next.level ?? "info",
      tag: next.tag ?? "UNKNOWN",
      title: next.title ?? "",
      method: next.method,
      path: next.path,
      url: next.url,
      status: next.status,
      durationMs: next.durationMs,
      request: next.request,
      response: next.response,
      error: next.error,
    };

    entries = [entry, ...entries];
    if (entries.length > MAX_ENTRIES) entries = entries.slice(0, MAX_ENTRIES);
    emit();
  },

  clear() {
    entries = [];
    emit();
  },

  getSnapshot(): DebugLogEntry[] {
    return entries.slice();
  },

  getGroupSnapshot(): DebugLogGroup[] {
    return groupByRequestId(entries);
  },

  getGroupByRequestId(requestId: string): DebugLogGroup | undefined {
    const key = normalizeString(requestId);
    if (!key) return undefined;
    const found = entries.filter((item) => item.requestId === key);
    if (found.length === 0) return undefined;
    return buildGroup(found);
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
