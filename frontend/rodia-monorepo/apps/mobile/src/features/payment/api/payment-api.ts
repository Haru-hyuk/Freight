import {
  confirm as confirmPaymentGenerated,
  getByMatchId as getPaymentsByMatchIdGenerated,
  prepare as preparePaymentGenerated,
} from "@/shared/api/generated/payment-controller/payment-controller";
import { isMockMode } from "@/shared/lib/config/env";
import { advanceMockFlowMatchStatus, getMockFlowDriverMatch, waitRandom } from "@/shared/lib/mock-flow";

type AnyObj = Record<string, unknown>;

export type PrepareShipperPaymentInput = {
  matchId: number;
  amount: number;
  orderName?: string;
};

export type PrepareShipperPaymentResult = {
  paymentId?: number;
  orderId: string;
  amount: number;
  orderName?: string;
  clientKey?: string;
  paymentKey?: string;
};

export type ConfirmShipperPaymentInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
  fallbackPaymentKeys?: string[];
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

async function toJsonPayload(raw: unknown): Promise<AnyObj> {
  if (!raw) return {};

  if (typeof Blob !== "undefined" && raw instanceof Blob) {
    const text = (await raw.text()).trim();
    if (!text) return {};
    try {
      return asObject(JSON.parse(text));
    } catch {
      return {};
    }
  }

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return {};
    try {
      return asObject(JSON.parse(text));
    } catch {
      return {};
    }
  }

  return asObject(raw);
}

function unwrapPayload(raw: AnyObj): AnyObj {
  const data = asObject(raw.data);
  if (Object.keys(data).length > 0) return data;
  const result = asObject(raw.result);
  if (Object.keys(result).length > 0) return result;
  return raw;
}

function extractArrayPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.result)) return obj.result;
  return [];
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

async function confirmShipperPaymentMock(matchId: number): Promise<void> {
  await waitRandom();

  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  // Move mock order to running phase right after payment succeeds.
  for (let index = 0; index < 5; index += 1) {
    const current = getMockFlowDriverMatch(safeMatchId);
    const status = toText(current?.status).toUpperCase();
    if (status === "PICKUP" || status === "TRANSIT" || status === "DROPOFF") return;
    const next = advanceMockFlowMatchStatus(safeMatchId);
    if (!next) return;
  }
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
  const payload = unwrapPayload(json);

  const orderId = toText(payload.orderId);
  if (!orderId) {
    throw new Error("Invalid payment prepare response: missing orderId.");
  }
  const amount = Math.max(100, toAmount(payload.amount) || safeAmount);
  const paymentId = toPositiveInt(payload.paymentId) || undefined;
  const clientKey = toText(payload.clientKey) || undefined;
  const paymentKey = toText(payload.paymentKey || payload.pgPaymentKey || payload.transactionKey) || undefined;
  const orderName = toText(payload.orderName) || safeOrderName;

  return {
    paymentId,
    orderId,
    amount,
    orderName: orderName || undefined,
    clientKey,
    paymentKey,
  };
}

export async function confirmShipperPayment(
  input: ConfirmShipperPaymentInput & { matchIdForMock?: number }
): Promise<void> {
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
    await confirmShipperPaymentMock(toPositiveInt(input.matchIdForMock));
    return;
  }

  const candidates = Array.from(
    new Set([paymentKey, ...(Array.isArray(input.fallbackPaymentKeys) ? input.fallbackPaymentKeys : [])].map(toText).filter(Boolean))
  );

  let lastError: unknown = null;
  for (const key of candidates) {
    try {
      await confirmPaymentGenerated({
        paymentKey: key,
        orderId,
        amount,
      });
      return;
    } catch (error) {
      const status = Number((error as { response?: { status?: unknown } })?.response?.status ?? 0);
      lastError = error;
      if (status === 400) continue;
      throw error;
    }
  }

  throw lastError ?? new Error("Payment confirmation failed.");
}

export async function hasCompletedPaymentForMatch(matchId: number): Promise<boolean> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return false;

  if (isMockMode()) {
    return false;
  }

  const raw = await getPaymentsByMatchIdGenerated({ matchId: safeMatchId });
  const json = await toJsonPayload(raw);
  const payload = unwrapPayload(json);
  const list = Array.isArray(payload) ? payload : extractArrayPayload(json);
  return list.some((item) => toText((item as AnyObj).status).toUpperCase() === "COMPLETED");
}

