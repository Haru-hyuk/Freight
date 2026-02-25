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

function toPositiveNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
}

export function formatKrw(value: unknown, fallback = "-"): string {
  const amount = toPositiveInt(value);
  if (amount <= 0) return fallback;
  return `${KRW_NUMBER_FORMAT.format(amount)}원`;
}

export function formatKrwAmount(value: unknown, fallback = "-"): string {
  return formatKrw(value, fallback);
}

export function formatDistance(value: unknown, fallback = "-", fractionDigits = 1): string {
  const distanceKm = toPositiveNumber(value);
  if (distanceKm <= 0) return fallback;

  const safeFractionDigits = Number.isInteger(fractionDigits) && fractionDigits >= 0 ? fractionDigits : 1;
  return `${distanceKm.toFixed(safeFractionDigits)}km`;
}

export function formatDateTime(value: unknown, fallback = "-"): string {
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

export function formatShortDateTime(value: unknown, fallback = "-"): string {
  return formatDateTime(value, fallback);
}
