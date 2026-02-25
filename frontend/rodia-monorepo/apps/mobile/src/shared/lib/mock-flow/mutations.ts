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
  QuoteStopRequest,
  QuoteStopResponse,
} from "@/shared/api/generated/schemas";

import {
  cloneCounterOffer,
  cloneMatch,
  cloneQuoteDetail,
  compareByUpdatedAtDesc,
  getMockFlowState,
  indexCounterOffer,
  normalizeStatus,
  nowIso,
  toNonNegativeInt,
  toPositiveInt,
  toText,
} from "./store";

const TERMINAL_QUOTE_STATUSES = new Set(["DROPOFF", "CANCELED"]);

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

function buildQuoteDetailFromCreate(
  quoteId: number,
  payload: QuoteCreateRequest,
  createdAt: string,
  updatedAt: string,
  current?: QuoteDetailResponse
): QuoteDetailResponse {
  const desiredPrice = toNonNegativeInt(payload?.desiredPrice);
  const basePrice = toNonNegativeInt(payload?.basePrice);
  const distancePrice = toNonNegativeInt(payload?.distancePrice);
  const extraPrice = toNonNegativeInt(current?.extraPrice);
  const finalPrice = desiredPrice > 0 ? desiredPrice : basePrice + distancePrice + extraPrice;
  const currentStatus = normalizeStatus(current?.status);
  const nextStatus = currentStatus || "OPEN";

  return {
    quoteId,
    quotePublicId: current?.quotePublicId || `mock-quote-${quoteId}`,
    shipperId: toPositiveInt(current?.shipperId) || 101,
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
    status: nextStatus,
    createdAt,
    updatedAt,
    checklistItems: normalizeChecklistItems(payload?.checklistItems),
    stops: normalizeStops(payload?.stops),
  };
}

function findLatestMatchByQuote(quoteId: number): MatchResponse | null {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const candidates = Array.from(state.matchesById.values()).filter(
    (match) => toPositiveInt(match.quoteId) === safeQuoteId
  );

  if (candidates.length <= 0) return null;
  candidates.sort((a, b) => compareByUpdatedAtDesc(a, b));
  return candidates[0] ?? null;
}

function findLatestActiveMatchByQuote(quoteId: number): MatchResponse | null {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const state = getMockFlowState();
  const candidates = Array.from(state.matchesById.values()).filter((match) => {
    if (toPositiveInt(match.quoteId) !== safeQuoteId) return false;
    return normalizeStatus(match.status) !== "CANCELED";
  });

  if (candidates.length <= 0) return null;
  candidates.sort((a, b) => compareByUpdatedAtDesc(a, b));
  return candidates[0] ?? null;
}

function updateQuoteStatus(quoteId: number, status: string, updatedAt = nowIso()): void {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return;

  const current = state.quotesById.get(safeQuoteId);
  if (!current) return;

  const next: QuoteDetailResponse = {
    ...current,
    status,
    updatedAt,
  };
  state.quotesById.set(safeQuoteId, next);
}

function updateMatch(match: MatchResponse): void {
  const state = getMockFlowState();
  const safeMatchId = toPositiveInt(match.matchId);
  if (safeMatchId <= 0) return;
  state.matchesById.set(safeMatchId, match);
}

export function createMockFlowShipperQuote(payload: QuoteCreateRequest): QuoteCreateResponse {
  const state = getMockFlowState();
  const quoteId = state.nextQuoteId++;
  const createdAt = nowIso();
  const detail = buildQuoteDetailFromCreate(quoteId, payload, createdAt, createdAt);
  state.quotesById.set(quoteId, detail);

  return {
    quoteId,
    quotePublicId: detail.quotePublicId,
  };
}

export function updateMockFlowShipperQuote(quoteId: number, payload: QuoteCreateRequest): QuoteDetailResponse | null {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const current = state.quotesById.get(safeQuoteId);
  if (!current) return null;

  const updatedAt = nowIso();
  const next = buildQuoteDetailFromCreate(
    safeQuoteId,
    payload,
    toText(current.createdAt) || updatedAt,
    updatedAt,
    current
  );
  state.quotesById.set(safeQuoteId, next);
  return cloneQuoteDetail(next);
}

export function deleteMockFlowShipperQuote(quoteId: number): void {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return;

  state.quotesById.delete(safeQuoteId);

  const matchIds = Array.from(state.matchesById.values())
    .filter((match) => toPositiveInt(match.quoteId) === safeQuoteId)
    .map((match) => toPositiveInt(match.matchId))
    .filter((matchId) => matchId > 0);
  matchIds.forEach((matchId) => state.matchesById.delete(matchId));

  const offerIds = state.counterOfferIdsByQuote.get(safeQuoteId) ?? [];
  offerIds.forEach((offerId) => state.counterOffersById.delete(offerId));
  state.counterOfferIdsByQuote.delete(safeQuoteId);
}

export function createMockFlowShipperMatch(payload: MatchCreateRequest): MatchResponse | null {
  const state = getMockFlowState();
  const quoteId = toPositiveInt(payload?.quoteId);
  if (quoteId <= 0) return null;

  const existing = findLatestActiveMatchByQuote(quoteId);
  if (existing) return cloneMatch(existing);

  const now = nowIso();
  const next: MatchResponse = {
    matchId: state.nextMatchId++,
    quoteId,
    accepted: false,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
  };
  updateMatch(next);

  const quote = state.quotesById.get(quoteId);
  if (quote && normalizeStatus(quote.status) === "CANCELED") {
    updateQuoteStatus(quoteId, "OPEN", now);
  }

  return cloneMatch(next);
}

export function acceptMockFlowDriverMatch(matchId: number): MatchResponse | null {
  const state = getMockFlowState();
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const current = state.matchesById.get(safeMatchId);
  if (!current) return null;

  const now = nowIso();
  const next: MatchResponse = {
    ...current,
    accepted: true,
    status: "ASSIGNED",
    driverId: toPositiveInt(current.driverId) || 21,
    acceptedAt: toText(current.acceptedAt) || now,
    updatedAt: now,
  };
  updateMatch(next);

  const quoteId = toPositiveInt(next.quoteId);
  if (quoteId > 0) updateQuoteStatus(quoteId, "ASSIGNED", now);

  return cloneMatch(next);
}

export function cancelMockFlowMatch(matchId: number): MatchResponse | null {
  const state = getMockFlowState();
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const current = state.matchesById.get(safeMatchId);
  if (!current) return null;

  const now = nowIso();
  const next: MatchResponse = {
    ...current,
    accepted: false,
    status: "CANCELED",
    updatedAt: now,
  };
  updateMatch(next);

  const quoteId = toPositiveInt(next.quoteId);
  if (quoteId > 0) {
    const quote = state.quotesById.get(quoteId);
    const quoteStatus = normalizeStatus(quote?.status);
    if (quoteStatus !== "DROPOFF") {
      updateQuoteStatus(quoteId, "CANCELED", now);
    }
  }

  return cloneMatch(next);
}

export function createMockFlowDriverCounterOffer(
  quoteId: number,
  payload: CounterOfferCreateRequest
): CounterOfferResponse | null {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const proposedPrice = toNonNegativeInt(payload?.proposedPrice);
  const message = toText(payload?.message);
  if (proposedPrice <= 0 && !message) return null;

  const now = nowIso();
  const offer: CounterOfferResponse = {
    counterOfferId: state.nextCounterOfferId++,
    quoteId: safeQuoteId,
    driverId: 21,
    proposedPrice: proposedPrice > 0 ? proposedPrice : undefined,
    message: message || undefined,
    status: "PENDING",
    createdAt: now,
  };
  const safeOfferId = toPositiveInt(offer.counterOfferId);
  if (safeOfferId <= 0) return null;

  state.counterOffersById.set(safeOfferId, offer);
  indexCounterOffer(state, offer);

  const quote = state.quotesById.get(safeQuoteId);
  const quoteStatus = normalizeStatus(quote?.status);
  if (!TERMINAL_QUOTE_STATUSES.has(quoteStatus)) {
    updateQuoteStatus(safeQuoteId, "NEGOTIATING", now);
  }

  const activeMatch = findLatestActiveMatchByQuote(safeQuoteId);
  if (activeMatch && activeMatch.accepted !== true) {
    updateMatch({
      ...activeMatch,
      status: "NEGOTIATING",
      accepted: false,
      updatedAt: now,
    });
  }

  return cloneCounterOffer(offer);
}

export function acceptMockFlowShipperCounterOffer(offerId: number): CounterOfferResponse | null {
  const state = getMockFlowState();
  const safeOfferId = toPositiveInt(offerId);
  if (safeOfferId <= 0) return null;

  const current = state.counterOffersById.get(safeOfferId);
  if (!current) return null;

  const now = nowIso();
  const next: CounterOfferResponse = {
    ...current,
    status: "ACCEPTED",
    respondedAt: now,
  };
  state.counterOffersById.set(safeOfferId, next);

  const quoteId = toPositiveInt(next.quoteId);
  if (quoteId > 0) updateQuoteStatus(quoteId, "ASSIGNED", now);

  const activeMatch = findLatestActiveMatchByQuote(quoteId);
  if (activeMatch) {
    updateMatch({
      ...activeMatch,
      accepted: true,
      status: "ASSIGNED",
      driverId: toPositiveInt(activeMatch.driverId) || toPositiveInt(next.driverId) || 21,
      acceptedAt: toText(activeMatch.acceptedAt) || now,
      updatedAt: now,
    });
  } else if (quoteId > 0) {
    const createdMatch: MatchResponse = {
      matchId: state.nextMatchId++,
      quoteId,
      driverId: toPositiveInt(next.driverId) || 21,
      accepted: true,
      status: "ASSIGNED",
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    updateMatch(createdMatch);
  }

  return cloneCounterOffer(next);
}

export function rejectMockFlowShipperCounterOffer(offerId: number): CounterOfferResponse | null {
  const state = getMockFlowState();
  const safeOfferId = toPositiveInt(offerId);
  if (safeOfferId <= 0) return null;

  const current = state.counterOffersById.get(safeOfferId);
  if (!current) return null;

  const now = nowIso();
  const next: CounterOfferResponse = {
    ...current,
    status: "REJECTED",
    respondedAt: now,
  };
  state.counterOffersById.set(safeOfferId, next);

  const quoteId = toPositiveInt(next.quoteId);
  const quote = state.quotesById.get(quoteId);
  if (quote && normalizeStatus(quote.status) === "NEGOTIATING") {
    updateQuoteStatus(quoteId, "OPEN", now);
  }

  const activeMatch = findLatestMatchByQuote(quoteId);
  if (activeMatch && normalizeStatus(activeMatch.status) === "NEGOTIATING" && activeMatch.accepted !== true) {
    updateMatch({
      ...activeMatch,
      status: "OPEN",
      updatedAt: now,
    });
  }

  return cloneCounterOffer(next);
}
