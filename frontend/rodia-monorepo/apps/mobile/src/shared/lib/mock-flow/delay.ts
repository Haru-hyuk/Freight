function toSafeInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export async function waitRandom(minMs = 100, maxMs = 300): Promise<void> {
  const min = Math.max(0, toSafeInt(minMs, 100));
  const max = Math.max(min, toSafeInt(maxMs, 300));
  const next = min + Math.floor(Math.random() * (max - min + 1));
  await new Promise<void>((resolve) => {
    setTimeout(resolve, next);
  });
}
