type NumberFormatLike = Pick<Intl.NumberFormat, "format">;

const KRW_NUMBER_FORMAT: NumberFormatLike = (() => {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
      return new Intl.NumberFormat("ko-KR");
    }
  } catch {
    // Ignore and fall back to String formatter.
  }

  return {
    format(value: number) {
      return String(value);
    },
  };
})();

function toPositiveInt(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.trunc(numeric);
}

export function formatKrwAmount(value: unknown, fallback = "-"): string {
  const amount = toPositiveInt(value);
  if (amount <= 0) return fallback;
  return `${KRW_NUMBER_FORMAT.format(amount)}원`;
}

export function formatShortDateTime(value: unknown, fallback = "-"): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return fallback;

  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}
