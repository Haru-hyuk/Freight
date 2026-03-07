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
  if (value === "CARD" || value === "BANK" || value === "POSTPAID") return value;
  return "CARD";
}

/**
 * ShipperPaymentMethodSummaryResponse(서버 raw) → ShipperPaymentMethod(도메인)
 * - 모든 optional 필드에 ?? 기본값 처리
 * - lastUsedAt / usageCount: 서버 전용 필드로 optional 유지
 */
function toShipperPaymentMethod(
  raw: ShipperPaymentMethodSummaryResponse,
  fallbackId: string
): ShipperPaymentMethod {
  return {
    id:           raw.id          ?? fallbackId,
    type:         toPaymentMethodType(raw.type),
    provider:     raw.provider    ?? "",
    holderName:   raw.holderName  ?? "",
    last4:        raw.last4       ?? "",
    registeredAt: raw.registeredAt ?? "",
    isDefault:    raw.isDefault   ?? false,
    lastUsedAt:   raw.lastUsedAt  ?? undefined,
    usageCount:   raw.usageCount  ?? undefined,
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
  const list = Array.isArray(data) ? data : [];
  return list.map((item, index) =>
    toShipperPaymentMethod(item, `pm-${index + 1}`)
  );
}

