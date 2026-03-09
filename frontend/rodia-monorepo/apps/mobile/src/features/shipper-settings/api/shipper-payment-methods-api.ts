// src/features/shipper-settings/api/shipper-payment-methods-api.ts
//
// Generated 함수:
//   listPaymentMethods() ← shipper-settings-controller (GET /api/shipper/settings/payment-methods)
// Generated 스키마:
//   ShipperPaymentMethodSummaryResponse
//
// 외부로 공개되는 타입·함수명을 정의하여 UI가 generated/mock 세부사항에 의존하지 않도록 격리한다.

import { listPaymentMethods as listPaymentMethodsGenerated } from "@/shared/api/generated/shipper-settings/shipper-settings";
import type { ShipperPaymentMethodSummaryResponse } from "@/shared/api/generated/schemas/shipperPaymentMethodSummaryResponse";
import { isMockMode } from "@/shared/lib/config/env";
import {
  shipperSettingsMock,
  type PaymentMethodMock,
  type PaymentMethodType,
} from "@/features/shipper-settings/api/shipper-settings-mock";

type AnyObject = Record<string, unknown>;

// ─── 도메인 타입 ──────────────────────────────────────────────────────────────

export type { PaymentMethodType };

/**
 * UI가 사용하는 결제수단 도메인 타입.
 * - Mock(PaymentMethodMock)과 서버(ShipperPaymentMethodSummaryResponse)의 공통 필드 + 서버 추가 필드 포함
 * - 모든 기본 필드는 null-safety 보장 (non-optional)
 */
export type ShipperPaymentMethod = {
  id: string;
  type: PaymentMethodType;
  provider: string;
  holderName: string;
  last4: string;
  registeredAt: string;
  isDefault: boolean;
  // 서버 전용 추가 필드 (mock에서는 undefined)
  lastUsedAt?: string;
  usageCount?: number;
};

// ─── 매퍼 ────────────────────────────────────────────────────────────────────

/**
 * 서버의 type 문자열을 PaymentMethodType 유니온으로 정규화한다.
 * 알 수 없는 값은 "CARD"로 폴백.
 */
function toPaymentMethodType(value: string | undefined): PaymentMethodType {
  const token = (value ?? "").trim().toUpperCase();
  if (token === "CARD") return "CARD";
  if (token === "BANK" || token === "BANK_TRANSFER") return "BANK";
  if (token === "POSTPAID" || token === "POST_PAID") return "POSTPAID";
  return "CARD";
}

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as AnyObject;
  return {};
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toOptionalInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (token === "true") return true;
    if (token === "false") return false;
  }
  return undefined;
}

function unwrapListPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const root = asObject(value);
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.result)) return root.result;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.list)) return root.list;
  if (Array.isArray(root.content)) return root.content;
  return [];
}

/**
 * ShipperPaymentMethodSummaryResponse(서버 raw) → ShipperPaymentMethod(도메인)
 * - 모든 optional 필드에 ?? 기본값 처리
 * - lastUsedAt / usageCount: 서버 전용 필드로 optional 유지
 */
function toShipperPaymentMethod(
  raw: ShipperPaymentMethodSummaryResponse | unknown,
  fallbackId: string
): ShipperPaymentMethod {
  const source = asObject(raw);

  return {
    id: toOptionalText(source.id ?? source.paymentMethodId ?? source.payment_method_id) ?? fallbackId,
    type: toPaymentMethodType(toOptionalText(source.type ?? source.methodType ?? source.method_type)),
    provider: toOptionalText(source.provider ?? source.provider_name) ?? "",
    holderName: toOptionalText(source.holderName ?? source.holder_name) ?? "",
    last4: toOptionalText(source.last4 ?? source.last_4) ?? "",
    registeredAt: toOptionalText(source.registeredAt ?? source.registered_at) ?? "",
    isDefault: toOptionalBoolean(source.isDefault ?? source.is_default) ?? false,
    lastUsedAt: toOptionalText(source.lastUsedAt ?? source.last_used_at) ?? undefined,
    usageCount: toOptionalInteger(source.usageCount ?? source.usage_count) ?? undefined,
  };
}

// ─── 공개 API 함수 ────────────────────────────────────────────────────────────

/**
 * 화주 결제수단 목록 조회
 *
 * - Mock 모드: shipperSettingsMock.paymentMethods 반환
 * - 실 모드:   listPaymentMethods() generated → toShipperPaymentMethod 매핑
 */
export async function listShipperPaymentMethods(): Promise<ShipperPaymentMethod[]> {
  if (isMockMode()) {
    return shipperSettingsMock.paymentMethods.map((item: PaymentMethodMock) => ({
      ...item,
      lastUsedAt: undefined,
      usageCount: undefined,
    }));
  }

  const data = await listPaymentMethodsGenerated();
  const list = unwrapListPayload(data);
  return list.map((item, index) =>
    toShipperPaymentMethod(item, `pm-${index + 1}`)
  );
}
