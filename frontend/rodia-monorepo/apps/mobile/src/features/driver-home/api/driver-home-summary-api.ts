import {
  isCounterOfferPending,
  listMyDriverCounterOffers,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import { listDriverTrucks } from "@/features/driver-profile/api/driver-profile-api";
import {
  listDriverSettlementsMe,
  type DriverSettlementItem,
} from "@/features/driver-profile/api/driver-settlement-api";
import {
  listMyDriverMatches,
  listOpenDriverMatches,
  type DriverMatchItem,
} from "@/features/matching/api/shipper-match-api";
import { listPublished } from "@/shared/api/generated/announcement/announcement";
import type { AnnouncementResponse } from "@/shared/api/generated/schemas/announcementResponse";
import { isMockMode } from "@/shared/lib/config/env";

type AnyObject = Record<string, unknown>;

const IN_TRANSIT_STATUS_TOKENS: ReadonlySet<string> = new Set([
  "READY",
  "PICKUP",
  "TRANSIT",
  "DROPOFF",
  "IN_TRANSIT",
]);

export type DriverHomeAnnouncement = {
  id: string;
  title: string;
  body?: string;
  publishedAt?: string;
};

export type DriverHomeSummary = {
  truckCount: number | null;
  hero: {
    monthPayout: number;
    weeklyCompletedCount: number;
    pendingPayout: number;
  };
  dashboard: {
    openMatches: number;
    pendingResponses: number;
    inTransit: number;
  };
  announcements: DriverHomeAnnouncement[];
  restriction: {
    isVerificationBlocked: boolean;
  };
  mockInfo: {
    isSettlementMockPossible: boolean;
    isMatchMockPossible: boolean;
  };
};

export type LoadDriverHomeSummaryInput = {
  isVerificationBlocked?: boolean;
};

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text : undefined;
}

function resolveSettlementDate(settlement: DriverSettlementItem): Date | null {
  const raw = settlement.completedAt ?? settlement.updatedAt ?? settlement.createdAt ?? "";
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

function getWeekStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function isWithinRange(target: Date, from: Date, to: Date): boolean {
  const at = target.getTime();
  return at >= from.getTime() && at < to.getTime();
}

function unwrapAnnouncementList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const root = asObject(value);
  if (Array.isArray(root.items)) return root.items as unknown[];
  if (Array.isArray(root.list)) return root.list as unknown[];
  if (Array.isArray(root.content)) return root.content as unknown[];
  if (Array.isArray(root.data)) return root.data as unknown[];
  if (Array.isArray(root.result)) return root.result as unknown[];

  const nested = asObject(root.data ?? root.result);
  if (Array.isArray(nested.items)) return nested.items as unknown[];
  if (Array.isArray(nested.list)) return nested.list as unknown[];
  if (Array.isArray(nested.content)) return nested.content as unknown[];
  if (Array.isArray(nested.data)) return nested.data as unknown[];

  return [];
}

function toHomeAnnouncement(entry: unknown, index: number): DriverHomeAnnouncement | null {
  const source = asObject(entry);
  const announcementId = toPositiveInt(source.announcementId ?? source.id);
  const title = toOptionalText(source.title);
  const body = toOptionalText(source.content);
  const publishedAt =
    toOptionalText(source.publishedAt) ??
    toOptionalText(source.updatedAt) ??
    toOptionalText(source.createdAt);

  if (!title && !body) return null;

  return {
    id: String(announcementId > 0 ? announcementId : index + 1),
    title: title ?? "공지",
    ...(body ? { body } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  };
}

function normalizeAnnouncements(raw: unknown): DriverHomeAnnouncement[] {
  return unwrapAnnouncementList(raw)
    .map((entry, index) => toHomeAnnouncement(entry as AnnouncementResponse, index))
    .filter((entry): entry is DriverHomeAnnouncement => Boolean(entry))
    .sort((a, b) => {
      const at = Date.parse(String(a.publishedAt ?? ""));
      const bt = Date.parse(String(b.publishedAt ?? ""));
      const av = Number.isFinite(at) ? at : 0;
      const bv = Number.isFinite(bt) ? bt : 0;
      if (bv !== av) return bv - av;
      return Number(b.id) - Number(a.id);
    })
    .slice(0, 2);
}

function buildHeroSummary(settlements: DriverSettlementItem[], now: Date): DriverHomeSummary["hero"] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let monthPayout = 0;
  let weeklyCompletedCount = 0;
  let pendingPayout = 0;

  settlements.forEach((settlement) => {
    const payout = toNonNegativeInt(settlement.driverPayout);
    const statusToken = toStatusToken(settlement.settlementStatus);
    const paymentToken = toStatusToken(settlement.shipperPaymentStatus);
    const settlementDate = resolveSettlementDate(settlement);

    if (settlementDate && settlementDate.getFullYear() === currentYear && settlementDate.getMonth() === currentMonth) {
      monthPayout += payout;
    }

    if (statusToken === "COMPLETED" && settlementDate && isWithinRange(settlementDate, weekStart, weekEnd)) {
      weeklyCompletedCount += 1;
    }

    if (statusToken !== "COMPLETED" || paymentToken !== "PAID") {
      pendingPayout += payout;
    }
  });

  return {
    monthPayout,
    weeklyCompletedCount,
    pendingPayout,
  };
}

function buildDashboardSummary(
  openMatches: DriverMatchItem[],
  myMatches: DriverMatchItem[],
  counterOffers: CounterOfferItem[]
): DriverHomeSummary["dashboard"] {
  const openMatchesCount = Array.isArray(openMatches) ? openMatches.length : 0;
  const pendingResponses = counterOffers.filter((offer) => isCounterOfferPending(offer.status)).length;
  const inTransit = myMatches.filter((match) =>
    IN_TRANSIT_STATUS_TOKENS.has(toStatusToken(match.status ?? match.state))
  ).length;

  return {
    openMatches: openMatchesCount,
    pendingResponses,
    inTransit,
  };
}

export function createDriverHomeSummaryDefaults(
  input: LoadDriverHomeSummaryInput = {}
): DriverHomeSummary {
  const isMock = isMockMode();
  return {
    truckCount: null,
    hero: {
      monthPayout: 0,
      weeklyCompletedCount: 0,
      pendingPayout: 0,
    },
    dashboard: {
      openMatches: 0,
      pendingResponses: 0,
      inTransit: 0,
    },
    announcements: [],
    restriction: {
      isVerificationBlocked: input.isVerificationBlocked === true,
    },
    mockInfo: {
      isSettlementMockPossible: isMock,
      isMatchMockPossible: isMock,
    },
  };
}

export async function loadDriverHomeSummary(
  input: LoadDriverHomeSummaryInput = {}
): Promise<DriverHomeSummary> {
  const defaults = createDriverHomeSummaryDefaults(input);
  const now = new Date();

  const [
    trucksResult,
    settlementsResult,
    openMatchesResult,
    myMatchesResult,
    counterOffersResult,
    announcementsResult,
  ] = await Promise.allSettled([
    listDriverTrucks(),
    listDriverSettlementsMe(),
    listOpenDriverMatches(),
    listMyDriverMatches(),
    listMyDriverCounterOffers(),
    listPublished(),
  ]);

  const truckCount =
    trucksResult.status === "fulfilled"
      ? Array.isArray(trucksResult.value)
        ? trucksResult.value.length
        : 0
      : null;

  const settlements = settlementsResult.status === "fulfilled" ? settlementsResult.value : [];
  const openMatches = openMatchesResult.status === "fulfilled" ? openMatchesResult.value : [];
  const myMatches = myMatchesResult.status === "fulfilled" ? myMatchesResult.value : [];
  const counterOffers = counterOffersResult.status === "fulfilled" ? counterOffersResult.value : [];
  const announcements = announcementsResult.status === "fulfilled" ? normalizeAnnouncements(announcementsResult.value) : [];

  return {
    ...defaults,
    truckCount,
    hero: buildHeroSummary(settlements, now),
    dashboard: buildDashboardSummary(openMatches, myMatches, counterOffers),
    announcements,
  };
}

