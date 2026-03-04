export const DRIVER_RUN_SYNC_EVENT = {
  COUNTER_OFFER_SUBMITTED: "COUNTER_OFFER_SUBMITTED",
  MATCH_ACCEPTED: "MATCH_ACCEPTED",
} as const;

export type DriverRunSyncEventType = (typeof DRIVER_RUN_SYNC_EVENT)[keyof typeof DRIVER_RUN_SYNC_EVENT];

export type DriverRunSyncEvent = {
  type: DriverRunSyncEventType;
  at: number;
  matchIds: number[];
  quoteIds: number[];
  source?: string;
};

type DriverRunSyncListener = (event: DriverRunSyncEvent) => void;

const listeners = new Set<DriverRunSyncListener>();

function normalizeIds(values: readonly number[] | undefined): number[] {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

export function publishDriverRunSyncEvent(input: Omit<DriverRunSyncEvent, "at" | "matchIds" | "quoteIds"> & {
  at?: number;
  matchIds?: number[];
  quoteIds?: number[];
}): void {
  const type = input.type;
  if (!type) return;

  const event: DriverRunSyncEvent = {
    type,
    at: Number(input.at) > 0 ? Number(input.at) : Date.now(),
    matchIds: normalizeIds(input.matchIds),
    quoteIds: normalizeIds(input.quoteIds),
    source: typeof input.source === "string" ? input.source.trim() || undefined : undefined,
  };

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // no-op
    }
  });
}

export function subscribeDriverRunSyncEvent(listener: DriverRunSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

