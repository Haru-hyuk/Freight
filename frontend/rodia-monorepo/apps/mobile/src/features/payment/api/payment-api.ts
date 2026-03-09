import {
  confirm as confirmPaymentGenerated,
  getByMatchId as getPaymentsByMatchIdGenerated,
  prepare as preparePaymentGenerated,
} from "@/shared/api/generated/payment/payment";
import type {
  PaymentConfirmRequest,
  PaymentPrepareRequest,
  PaymentPrepareResponse,
  PaymentResponse,
  PaymentResponseMethod,
  PaymentResponseStatus,
} from "@/shared/api/generated/schemas";
import { isMockMode } from "@/shared/lib/config/env";
import { advanceMockFlowMatchStatus, getMockFlowDriverMatch, waitRandom } from "@/shared/lib/mock-flow";

type AnyObj = Record<string, unknown>;
type JsonPayload = AnyObj | unknown[] | null;

export type PrepareShipperPaymentInput = PaymentPrepareRequest;

export type PrepareShipperPaymentResult = PaymentPrepareResponse & {
  orderId: string;
  amount: number;
  paymentKey?: string;
  lastStatus?: PaymentResponseStatus;
  lastMethod?: PaymentResponseMethod;
};

export type ConfirmShipperPaymentInput = PaymentConfirmRequest & {
  fallbackPaymentKeys?: string[];
};

export type ConfirmShipperPaymentResult = PaymentResponse;
export type MatchPaymentSnapshot = {
  latestPayment: PaymentResponse | null;
  completedPayment: PaymentResponse | null;
  hasCompleted: boolean;
  effectiveStatus: PaymentResponseStatus | null;
  effectiveMethod: PaymentResponseMethod | null;
};

function asObject(value: unknown): AnyObj {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyObj) : {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toAmount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function toPaymentStatus(value: unknown): PaymentResponseStatus | undefined {
  const token = toText(value).toUpperCase();
  if (token === "PENDING") return "PENDING";
  if (token === "COMPLETED") return "COMPLETED";
  if (token === "FAILED") return "FAILED";
  if (token === "REFUNDED") return "REFUNDED";
  return undefined;
}

function toPaymentMethod(value: unknown): PaymentResponseMethod | undefined {
  const token = toText(value).toUpperCase();
  if (token === "CARD") return "CARD";
  if (token === "TRANSFER") return "TRANSFER";
  if (token === "PREPAID") return "PREPAID";
  return undefined;
}

async function toJsonPayload(raw: unknown): Promise<JsonPayload> {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;

  if (typeof Blob !== "undefined" && raw instanceof Blob) {
    const text = (await raw.text()).trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      return asObject(parsed);
    } catch {
      return null;
    }
  }

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      return asObject(parsed);
    } catch {
      return null;
    }
  }

  return asObject(raw);
}

function unwrapPayload(raw: JsonPayload): unknown {
  if (!raw || Array.isArray(raw)) return raw;
  if (typeof raw.data !== "undefined" && raw.data !== null) return raw.data;
  if (typeof raw.result !== "undefined" && raw.result !== null) return raw.result;
  return raw;
}

function extractArrayPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const obj = asObject(raw);
  if (!Object.keys(obj).length) return [];
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.result)) return obj.result;
  if (Array.isArray(obj.items)) return obj.items as unknown[];
  if (Array.isArray(obj.list)) return obj.list as unknown[];
  return [];
}

function toPaymentResponse(input: unknown): PaymentResponse | null {
  const source = asObject(input);
  const paymentId = toPositiveInt(source.paymentId);
  const matchId = toPositiveInt(source.matchId);
  const totalAmount = toAmount(source.totalAmount);
  const status = toPaymentStatus(source.status);
  const method = toPaymentMethod(source.method);

  if (paymentId <= 0 && !status && !method) return null;

  return {
    ...(paymentId > 0 ? { paymentId } : {}),
    ...(matchId > 0 ? { matchId } : {}),
    ...(toText(source.orderNo) ? { orderNo: toText(source.orderNo) } : {}),
    ...(method ? { method } : {}),
    ...(status ? { status } : {}),
    ...(toText(source.paidAt) ? { paidAt: toText(source.paidAt) } : {}),
    ...(toText(source.attemptId) ? { attemptId: toText(source.attemptId) } : {}),
    ...(toText(source.amountType) ? { amountType: toText(source.amountType) } : {}),
    ...(toText(source.pgRef) ? { pgRef: toText(source.pgRef) } : {}),
    ...(totalAmount > 0 ? { totalAmount } : {}),
    ...(toText(source.createdAt) ? { createdAt: toText(source.createdAt) } : {}),
  };
}

function sortPaymentsByLatest(a: PaymentResponse, b: PaymentResponse): number {
  const aPaidAt = Date.parse(toText(a.paidAt));
  const bPaidAt = Date.parse(toText(b.paidAt));
  if (Number.isFinite(aPaidAt) && Number.isFinite(bPaidAt) && aPaidAt !== bPaidAt) {
    return bPaidAt - aPaidAt;
  }

  const aCreatedAt = Date.parse(toText(a.createdAt));
  const bCreatedAt = Date.parse(toText(b.createdAt));
  if (Number.isFinite(aCreatedAt) && Number.isFinite(bCreatedAt) && aCreatedAt !== bCreatedAt) {
    return bCreatedAt - aCreatedAt;
  }

  return toPositiveInt(b.paymentId) - toPositiveInt(a.paymentId);
}

function buildMatchPaymentSnapshot(payments: PaymentResponse[]): MatchPaymentSnapshot {
  const sorted = [...payments].sort(sortPaymentsByLatest);
  const latestPayment = sorted[0] ?? null;
  const completedPayment = sorted.find((payment) => payment.status === "COMPLETED") ?? null;
  const effectivePayment = completedPayment ?? latestPayment;

  return {
    latestPayment,
    completedPayment,
    hasCompleted: completedPayment !== null,
    effectiveStatus: effectivePayment?.status ?? null,
    effectiveMethod: effectivePayment?.method ?? null,
  };
}

async function listPaymentsByMatchId(matchId: number): Promise<PaymentResponse[]> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return [];

  const raw = await getPaymentsByMatchIdGenerated({ matchId: safeMatchId });
  const json = await toJsonPayload(raw);
  const payload = unwrapPayload(json);
  const list = Array.isArray(payload) ? payload : extractArrayPayload(payload ?? json);
  return list
    .map((item) => toPaymentResponse(item))
    .filter((item): item is PaymentResponse => item !== null)
    .sort(sortPaymentsByLatest);
}

function buildFallbackOrderId(matchId: number): string {
  return `app-order-${matchId}-${Date.now()}`;
}

async function prepareShipperPaymentMock(input: PrepareShipperPaymentInput): Promise<PrepareShipperPaymentResult> {
  await waitRandom();
  const safeMatchId = toPositiveInt(input.matchId);
  const safeAmount = Math.max(100, toAmount(input.amount));

  return {
    paymentId: Date.now(),
    orderId: buildFallbackOrderId(safeMatchId),
    amount: safeAmount,
    orderName: toText(input.orderName) || "Freight payment",
    clientKey: "mock-client-key",
  };
}

async function confirmShipperPaymentMock(matchId: number, amount: number): Promise<ConfirmShipperPaymentResult> {
  await waitRandom();

  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId > 0) {
    // Move mock order to running phase right after payment succeeds.
    for (let index = 0; index < 5; index += 1) {
      const current = getMockFlowDriverMatch(safeMatchId);
      const status = toText(current?.status).toUpperCase();
      if (status === "PICKUP" || status === "TRANSIT" || status === "DROPOFF") break;
      const next = advanceMockFlowMatchStatus(safeMatchId);
      if (!next) break;
    }
  }

  return {
    paymentId: Date.now(),
    matchId: safeMatchId > 0 ? safeMatchId : undefined,
    method: "CARD",
    status: "COMPLETED",
    totalAmount: Math.max(100, amount),
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function prepareShipperPayment(input: PrepareShipperPaymentInput): Promise<PrepareShipperPaymentResult> {
  const safeMatchId = toPositiveInt(input.matchId);
  if (safeMatchId <= 0) {
    throw new Error("Invalid match id.");
  }

  const safeAmount = Math.max(100, toAmount(input.amount));
  const safeOrderName = toText(input.orderName) || undefined;

  if (isMockMode()) {
    return prepareShipperPaymentMock({
      matchId: safeMatchId,
      amount: safeAmount,
      orderName: safeOrderName,
    });
  }

  const raw = await preparePaymentGenerated({
    matchId: safeMatchId,
    amount: safeAmount,
    ...(safeOrderName ? { orderName: safeOrderName } : {}),
  });
  const json = await toJsonPayload(raw);
  const payload = asObject(unwrapPayload(json));

  const orderId = toText(payload.orderId);
  if (!orderId) {
    throw new Error("Invalid payment prepare response: missing orderId.");
  }

  const amount = Math.max(100, toAmount(payload.amount) || safeAmount);
  const paymentId = toPositiveInt(payload.paymentId) || undefined;
  const clientKey = toText(payload.clientKey) || undefined;
  const paymentKey = toText(payload.paymentKey || payload.pgPaymentKey || payload.transactionKey) || undefined;
  const orderName = toText(payload.orderName) || safeOrderName;
  let latest: PaymentResponse | null = null;
  try {
    latest = (await listPaymentsByMatchId(safeMatchId))[0] ?? null;
  } catch {
    latest = null;
  }

  return {
    paymentId,
    orderId,
    amount,
    orderName: orderName || undefined,
    clientKey,
    paymentKey,
    ...(latest?.status ? { lastStatus: latest.status } : {}),
    ...(latest?.method ? { lastMethod: latest.method } : {}),
  };
}

export async function confirmShipperPayment(
  input: ConfirmShipperPaymentInput & { matchIdForMock?: number }
): Promise<ConfirmShipperPaymentResult> {
  const orderId = toText(input.orderId);
  const amount = Math.max(100, toAmount(input.amount));
  const paymentKey = toText(input.paymentKey);

  if (!orderId) {
    throw new Error("Invalid order id.");
  }
  if (!paymentKey) {
    throw new Error("Invalid payment key.");
  }

  if (isMockMode()) {
    return confirmShipperPaymentMock(toPositiveInt(input.matchIdForMock), amount);
  }

  const candidates = Array.from(
    new Set([paymentKey, ...(Array.isArray(input.fallbackPaymentKeys) ? input.fallbackPaymentKeys : [])].map(toText).filter(Boolean))
  );

  let lastError: unknown = null;
  for (const key of candidates) {
    try {
      const response = await confirmPaymentGenerated({
        paymentKey: key,
        orderId,
        amount,
      });
      return toPaymentResponse(response) ?? {
        orderNo: orderId,
        status: "COMPLETED",
        totalAmount: amount,
      };
    } catch (error) {
      const status = Number((error as { response?: { status?: unknown } })?.response?.status ?? 0);
      lastError = error;
      if (status === 400) continue;
      throw error;
    }
  }

  throw lastError ?? new Error("Payment confirmation failed.");
}

export async function getLatestPaymentForMatch(matchId: number): Promise<PaymentResponse | null> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  if (isMockMode()) {
    return null;
  }

  const list = await listPaymentsByMatchId(safeMatchId);
  return list[0] ?? null;
}

export async function getMatchPaymentSnapshot(matchId: number): Promise<MatchPaymentSnapshot> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0 || isMockMode()) {
    return {
      latestPayment: null,
      completedPayment: null,
      hasCompleted: false,
      effectiveStatus: null,
      effectiveMethod: null,
    };
  }

  const list = await listPaymentsByMatchId(safeMatchId);
  return buildMatchPaymentSnapshot(list);
}

export async function hasCompletedPaymentForMatch(matchId: number): Promise<boolean> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return false;

  if (isMockMode()) {
    return false;
  }

  const list = await listPaymentsByMatchId(safeMatchId);
  return list.some((payment) => payment.status === "COMPLETED");
}

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { PaymentResponseMethod, PaymentResponseStatus };

