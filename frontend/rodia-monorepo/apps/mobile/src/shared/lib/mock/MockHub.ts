import type {
  CounterOfferCreateRequest,
  CounterOfferResponse,
  MatchCreateRequest,
  MatchResponse,
  QuoteChecklistItemRequest,
  QuoteChecklistItemResponse,
  QuoteCreateRequest,
  QuoteCreateResponse,
  QuoteDetailResponse,
  QuoteListResponse,
  QuoteStopRequest,
  QuoteStopResponse,
} from "@/shared/api/generated/schemas";

type QuoteStoreItem = {
  detail: QuoteDetailResponse;
  createRequest: QuoteCreateRequest;
  createResponse: QuoteCreateResponse;
};

const quotesById = new Map<number, QuoteStoreItem>();
const quoteIds: number[] = [];
const matchesById = new Map<number, MatchResponse>();
const counterOffersById = new Map<number, CounterOfferResponse>();
const counterOfferIdsByQuote = new Map<number, number[]>();
const counterOfferRequestsByQuote = new Map<number, CounterOfferCreateRequest[]>();

let seededQuotes = false;
let seededMatches = false;
let nextQuoteId = 3001;
let nextMatchId = 7001;
let nextCounterOfferId = 9001;

function nowIso(): string {
  return new Date().toISOString();
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

function toText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeChecklistItems(input: QuoteChecklistItemRequest[] | undefined): QuoteChecklistItemResponse[] {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => ({
    checklistItemId: toPositiveInt(item?.checklistItemId) || index + 1,
    extraInput: toText(item?.extraInput) || undefined,
    extraFee: toNonNegativeInt(item?.extraFee),
  }));
}

function normalizeStops(input: QuoteStopRequest[] | undefined): QuoteStopResponse[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((stop, index) => ({
      quoteStopId: index + 1,
      seq: toPositiveInt(stop?.seq) || index + 1,
      address: toText(stop?.address) || undefined,
      lat: Number.isFinite(Number(stop?.lat)) ? Number(stop?.lat) : undefined,
      lng: Number.isFinite(Number(stop?.lng)) ? Number(stop?.lng) : undefined,
      contactName: toText(stop?.contactName) || undefined,
      contactPhone: toText(stop?.contactPhone) || undefined,
      deptName: toText(stop?.deptName) || undefined,
      managerName: toText(stop?.managerName) || undefined,
    }))
    .filter((stop) => Boolean(stop.address));
}

function toDetailFromCreate(quoteId: number, payload: QuoteCreateRequest, createdAt: string, updatedAt: string): QuoteDetailResponse {
  const desiredPrice = toNonNegativeInt(payload?.desiredPrice);
  const basePrice = toNonNegativeInt(payload?.basePrice);
  const distancePrice = toNonNegativeInt(payload?.distancePrice);
  const extraPrice = 0;
  const finalPrice = desiredPrice > 0 ? desiredPrice : basePrice + distancePrice;

  return {
    quoteId,
    quotePublicId: `mock-quote-${quoteId}`,
    shipperId: 1,
    truckId: toPositiveInt(payload?.truckId) || 1,
    originAddress: toText(payload?.originAddress) || undefined,
    destinationAddress: toText(payload?.destinationAddress) || undefined,
    originLat: Number.isFinite(Number(payload?.originLat)) ? Number(payload?.originLat) : undefined,
    originLng: Number.isFinite(Number(payload?.originLng)) ? Number(payload?.originLng) : undefined,
    destinationLat: Number.isFinite(Number(payload?.destinationLat)) ? Number(payload?.destinationLat) : undefined,
    destinationLng: Number.isFinite(Number(payload?.destinationLng)) ? Number(payload?.destinationLng) : undefined,
    distanceKm: Number.isFinite(Number(payload?.distanceKm)) ? Number(payload?.distanceKm) : undefined,
    weightKg: Number.isFinite(Number(payload?.weightKg)) ? Number(payload?.weightKg) : undefined,
    volumeCbm: Number.isFinite(Number(payload?.volumeCbm)) ? Number(payload?.volumeCbm) : undefined,
    vehicleType: toText(payload?.vehicleType) || undefined,
    vehicleBodyType: toText(payload?.vehicleBodyType) || undefined,
    cargoName: toText(payload?.cargoName) || undefined,
    cargoType: toText(payload?.cargoType) || undefined,
    cargoDesc: toText(payload?.cargoDesc) || undefined,
    basePrice,
    distancePrice,
    extraPrice,
    desiredPrice,
    finalPrice,
    allowCombine: Boolean(payload?.allowCombine),
    loadMethod: toText(payload?.loadMethod) || undefined,
    unloadMethod: toText(payload?.unloadMethod) || undefined,
    status: "OPEN",
    createdAt,
    updatedAt,
    checklistItems: normalizeChecklistItems(payload?.checklistItems),
    stops: normalizeStops(payload?.stops),
  };
}

function toListResponse(detail: QuoteDetailResponse): QuoteListResponse {
  return {
    quoteId: detail.quoteId,
    quotePublicId: detail.quotePublicId,
    truckId: detail.truckId,
    originAddress: detail.originAddress,
    destinationAddress: detail.destinationAddress,
    distanceKm: detail.distanceKm,
    vehicleType: detail.vehicleType,
    vehicleBodyType: detail.vehicleBodyType,
    cargoName: detail.cargoName,
    desiredPrice: detail.desiredPrice,
    finalPrice: detail.finalPrice,
    status: detail.status,
    createdAt: detail.createdAt,
  };
}

function upsertQuote(item: QuoteStoreItem): void {
  const quoteId = toPositiveInt(item.detail.quoteId);
  if (quoteId <= 0) return;

  if (!quoteIds.includes(quoteId)) {
    quoteIds.unshift(quoteId);
  }
  quotesById.set(quoteId, item);
}

function appendOpenMatchForQuote(quoteId: number): MatchResponse | null {
  if (toPositiveInt(quoteId) <= 0) return null;

  const now = nowIso();
  const match: MatchResponse = {
    matchId: nextMatchId++,
    quoteId,
    accepted: false,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
  };
  matchesById.set(match.matchId ?? 0, match);
  return match;
}

function ensureQuotesSeeded(): void {
  if (seededQuotes) return;
  seedShipperQuotes();
}

function ensureMatchesSeeded(): void {
  if (seededMatches) return;
  seedDriverMatchesFromQuotes();
}

function parseQuoteIdentifier(identifier: string): number {
  const raw = toText(identifier);
  const asNumber = toPositiveInt(raw);
  if (asNumber > 0) return asNumber;

  const match = /^mock-quote-(\d+)$/i.exec(raw);
  if (!match) return 0;
  return toPositiveInt(match[1]);
}

function compareByUpdatedAtDesc<T extends { updatedAt?: string; createdAt?: string }>(a: T, b: T): number {
  const aTs = Date.parse(a.updatedAt ?? a.createdAt ?? "");
  const bTs = Date.parse(b.updatedAt ?? b.createdAt ?? "");
  if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
  if (Number.isFinite(bTs)) return 1;
  if (Number.isFinite(aTs)) return -1;
  return 0;
}

export async function waitNetwork(): Promise<void> {
  const ms = 500 + Math.floor(Math.random() * 401);
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function resetMockHub(): void {
  quotesById.clear();
  quoteIds.splice(0, quoteIds.length);
  matchesById.clear();
  counterOffersById.clear();
  counterOfferIdsByQuote.clear();
  counterOfferRequestsByQuote.clear();

  seededQuotes = false;
  seededMatches = false;
  nextQuoteId = 3001;
  nextMatchId = 7001;
  nextCounterOfferId = 9001;
}

export function seedShipperQuotes(): void {
  if (seededQuotes) return;

  const now = nowIso();
  const seedPayloads: QuoteCreateRequest[] = [
    {
      truckId: 1,
      originAddress: "서울특별시 강남구",
      destinationAddress: "경기도 성남시 분당구",
      originLat: 37.4979,
      originLng: 127.0276,
      destinationLat: 37.3826,
      destinationLng: 127.1232,
      distanceKm: 24,
      weightKg: 1200,
      volumeCbm: 8,
      vehicleType: "TON_1",
      vehicleBodyType: "CARGO",
      cargoName: "일반 화물",
      cargoType: "GENERAL",
      cargoDesc: "파렛트 4개",
      desiredPrice: 120000,
      allowCombine: false,
      loadMethod: "SHIPPER",
      unloadMethod: "DRIVER",
      checklistItems: [{ checklistItemId: 1, extraInput: "상차지 대기", extraFee: 10000 }],
      stops: [{ seq: 1, address: "인천광역시 연수구", lat: 37.4102, lng: 126.6788 }],
    },
    {
      truckId: 2,
      originAddress: "부산광역시 해운대구",
      destinationAddress: "울산광역시 남구",
      originLat: 35.1632,
      originLng: 129.1636,
      destinationLat: 35.5384,
      destinationLng: 129.3114,
      distanceKm: 62,
      weightKg: 2100,
      volumeCbm: 12,
      vehicleType: "TON_2_5",
      vehicleBodyType: "WING_BODY",
      cargoName: "전자 부품",
      cargoType: "GENERAL",
      cargoDesc: "박스 화물",
      desiredPrice: 210000,
      allowCombine: true,
      loadMethod: "DRIVER",
      unloadMethod: "DRIVER",
      checklistItems: [{ checklistItemId: 1, extraInput: "냉장 필요", extraFee: 20000 }],
      stops: [],
    },
  ];

  seedPayloads.forEach((payload) => {
    const quoteId = nextQuoteId++;
    const detail = toDetailFromCreate(quoteId, payload, now, now);
    const createResponse: QuoteCreateResponse = { quoteId, quotePublicId: detail.quotePublicId };
    upsertQuote({
      detail,
      createRequest: payload,
      createResponse,
    });
  });

  seededQuotes = true;
}

export function seedDriverMatchesFromQuotes(): void {
  ensureQuotesSeeded();
  if (seededMatches) return;

  const seededQuoteIds = quoteIds.slice(0, 2);
  if (seededQuoteIds.length <= 0) {
    seededMatches = true;
    return;
  }

  const now = nowIso();
  const firstQuoteId = seededQuoteIds[0] ?? 0;
  const secondQuoteId = seededQuoteIds[1] ?? 0;

  if (firstQuoteId > 0) {
    const openMatch: MatchResponse = {
      matchId: nextMatchId++,
      quoteId: firstQuoteId,
      accepted: false,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    matchesById.set(openMatch.matchId ?? 0, openMatch);
  }

  if (secondQuoteId > 0) {
    const assignedMatch: MatchResponse = {
      matchId: nextMatchId++,
      quoteId: secondQuoteId,
      driverId: 1,
      accepted: true,
      status: "ASSIGNED",
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    matchesById.set(assignedMatch.matchId ?? 0, assignedMatch);
  }

  seededMatches = true;
}

export function listMockShipperQuotes(): QuoteListResponse[] {
  ensureQuotesSeeded();
  return quoteIds
    .map((quoteId) => quotesById.get(quoteId)?.detail)
    .filter((detail): detail is QuoteDetailResponse => Boolean(detail))
    .map((detail) => toListResponse(detail))
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function getMockShipperQuoteDetail(quoteId: number): QuoteDetailResponse | null {
  ensureQuotesSeeded();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;
  return quotesById.get(safeQuoteId)?.detail ?? null;
}

export function getMockShipperQuoteDetailByIdentifier(quoteIdentifier: string): QuoteDetailResponse | null {
  ensureQuotesSeeded();
  const quoteId = parseQuoteIdentifier(quoteIdentifier);
  if (quoteId <= 0) return null;
  return quotesById.get(quoteId)?.detail ?? null;
}

export function createMockShipperQuote(payload: QuoteCreateRequest): QuoteCreateResponse {
  ensureQuotesSeeded();

  const quoteId = nextQuoteId++;
  const createdAt = nowIso();
  const detail = toDetailFromCreate(quoteId, payload, createdAt, createdAt);
  const createResponse: QuoteCreateResponse = {
    quoteId,
    quotePublicId: detail.quotePublicId,
  };

  upsertQuote({
    detail,
    createRequest: payload,
    createResponse,
  });
  appendOpenMatchForQuote(quoteId);

  return createResponse;
}

export function updateMockShipperQuote(quoteId: number, payload: QuoteCreateRequest): QuoteDetailResponse | null {
  ensureQuotesSeeded();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const current = quotesById.get(safeQuoteId);
  if (!current) return null;

  const detail = toDetailFromCreate(
    safeQuoteId,
    payload,
    current.detail.createdAt || nowIso(),
    nowIso()
  );
  const updatedItem: QuoteStoreItem = {
    detail: {
      ...detail,
      quotePublicId: current.detail.quotePublicId,
    },
    createRequest: payload,
    createResponse: current.createResponse,
  };
  upsertQuote(updatedItem);
  return updatedItem.detail;
}

export function deleteMockShipperQuote(quoteId: number): void {
  ensureQuotesSeeded();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return;

  quotesById.delete(safeQuoteId);
  const idx = quoteIds.indexOf(safeQuoteId);
  if (idx >= 0) quoteIds.splice(idx, 1);

  const matchIdsToDelete = Array.from(matchesById.values())
    .filter((match) => toPositiveInt(match.quoteId) === safeQuoteId)
    .map((match) => toPositiveInt(match.matchId))
    .filter((matchId) => matchId > 0);
  matchIdsToDelete.forEach((matchId) => matchesById.delete(matchId));
}

export function listMockDriverOpenMatches(): MatchResponse[] {
  ensureMatchesSeeded();
  return Array.from(matchesById.values())
    .filter((match) => {
      const status = toText(match.status).toUpperCase();
      const accepted = match.accepted === true;
      if (status === "CANCELED") return false;
      return !accepted;
    })
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockDriverMyMatches(): MatchResponse[] {
  ensureMatchesSeeded();
  return Array.from(matchesById.values())
    .filter((match) => {
      if (match.accepted === true) return true;
      return toPositiveInt(match.driverId) > 0;
    })
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockShipperMatches(): MatchResponse[] {
  ensureMatchesSeeded();
  return Array.from(matchesById.values()).sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function getMockDriverMatch(matchId: number): MatchResponse | null {
  ensureMatchesSeeded();
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;
  return matchesById.get(safeMatchId) ?? null;
}

export function createMockShipperMatch(payload: MatchCreateRequest): MatchResponse | null {
  ensureMatchesSeeded();
  const quoteId = toPositiveInt(payload?.quoteId);
  if (quoteId <= 0) return null;
  return appendOpenMatchForQuote(quoteId);
}

export function acceptMockDriverMatch(matchId: number): MatchResponse | null {
  ensureMatchesSeeded();
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const current = matchesById.get(safeMatchId);
  if (!current) return null;

  const now = nowIso();
  const next: MatchResponse = {
    ...current,
    accepted: true,
    status: "ACCEPTED",
    driverId: toPositiveInt(current.driverId) || 1,
    acceptedAt: now,
    updatedAt: now,
  };
  matchesById.set(safeMatchId, next);
  return next;
}

export function cancelMockMatch(matchId: number): MatchResponse | null {
  ensureMatchesSeeded();
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const current = matchesById.get(safeMatchId);
  if (!current) return null;

  const next: MatchResponse = {
    ...current,
    accepted: false,
    status: "CANCELED",
    updatedAt: nowIso(),
  };
  matchesById.set(safeMatchId, next);
  return next;
}

function registerCounterOfferByQuote(offer: CounterOfferResponse): void {
  const quoteId = toPositiveInt(offer.quoteId);
  const offerId = toPositiveInt(offer.counterOfferId);
  if (quoteId <= 0 || offerId <= 0) return;

  const list = counterOfferIdsByQuote.get(quoteId) ?? [];
  if (!list.includes(offerId)) list.unshift(offerId);
  counterOfferIdsByQuote.set(quoteId, list);
}

export function createMockDriverCounterOffer(
  quoteId: number,
  payload: CounterOfferCreateRequest
): CounterOfferResponse | null {
  ensureMatchesSeeded();

  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const proposedPrice = toNonNegativeInt(payload?.proposedPrice);
  const message = toText(payload?.message) || undefined;
  if (proposedPrice <= 0 && !message) return null;

  const createdAt = nowIso();
  const offer: CounterOfferResponse = {
    counterOfferId: nextCounterOfferId++,
    quoteId: safeQuoteId,
    driverId: 1,
    proposedPrice: proposedPrice > 0 ? proposedPrice : undefined,
    message,
    status: "PENDING",
    createdAt,
  };

  const safeOfferId = toPositiveInt(offer.counterOfferId);
  if (safeOfferId > 0) {
    counterOffersById.set(safeOfferId, offer);
  }
  registerCounterOfferByQuote(offer);

  const requests = counterOfferRequestsByQuote.get(safeQuoteId) ?? [];
  requests.push({
    ...(proposedPrice > 0 ? { proposedPrice } : {}),
    ...(message ? { message } : {}),
  });
  counterOfferRequestsByQuote.set(safeQuoteId, requests);

  return offer;
}

export function listMockDriverCounterOffersByQuote(quoteId: number): CounterOfferResponse[] {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return [];

  const offerIds = counterOfferIdsByQuote.get(safeQuoteId) ?? [];
  return offerIds
    .map((offerId) => counterOffersById.get(offerId))
    .filter((offer): offer is CounterOfferResponse => Boolean(offer))
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockMyDriverCounterOffers(): CounterOfferResponse[] {
  return Array.from(counterOffersById.values())
    .filter((offer) => toPositiveInt(offer.driverId) > 0)
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockShipperCounterOffers(quoteId: number): CounterOfferResponse[] {
  return listMockDriverCounterOffersByQuote(quoteId);
}

export function acceptMockShipperCounterOffer(offerId: number): CounterOfferResponse | null {
  const safeOfferId = toPositiveInt(offerId);
  if (safeOfferId <= 0) return null;

  const current = counterOffersById.get(safeOfferId);
  if (!current) return null;

  const next: CounterOfferResponse = {
    ...current,
    status: "ACCEPTED",
    respondedAt: nowIso(),
  };
  counterOffersById.set(safeOfferId, next);
  return next;
}

export function rejectMockShipperCounterOffer(offerId: number): CounterOfferResponse | null {
  const safeOfferId = toPositiveInt(offerId);
  if (safeOfferId <= 0) return null;

  const current = counterOffersById.get(safeOfferId);
  if (!current) return null;

  const next: CounterOfferResponse = {
    ...current,
    status: "REJECTED",
    respondedAt: nowIso(),
  };
  counterOffersById.set(safeOfferId, next);
  return next;
}
