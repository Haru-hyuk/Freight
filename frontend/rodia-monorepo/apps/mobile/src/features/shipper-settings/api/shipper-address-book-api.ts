// src/features/shipper-settings/api/shipper-address-book-api.ts
//
// [리팩토링] apiClient 직접 호출 → Orval 자동생성 함수로 교체
//
// Generated 함수 위치:
//   src/shared/api/generated/shipper-address-controller/shipper-address-controller.ts
//   - list     (GET    /api/shipper/addresses)
//   - create1  (POST   /api/shipper/addresses)
//   - update   (PUT    /api/shipper/addresses/{addressId})
//   - _delete  (DELETE /api/shipper/addresses/{addressId})
//
// 외부로 공개되는 타입·함수명은 기존과 동일하게 유지하여 UI 수정이 불필요하다.

import {
  list as listGenerated,
  create1 as createGenerated,
  update as updateGenerated,
  _delete as deleteGenerated,
} from "@/shared/api/generated/shipper-address-controller/shipper-address-controller";
import type { ShipperAddressItemResponse } from "@/shared/api/generated/schemas/shipperAddressItemResponse";
import type { ShipperAddressUpsertRequest } from "@/shared/api/generated/schemas/shipperAddressUpsertRequest";
import { isMockMode } from "@/shared/lib/config/env";
import { shipperSettingsMock, type AddressItemMock } from "@/features/shipper-settings/api/shipper-settings-mock";

// ─── 도메인 타입 (UI가 사용하는 타입 — 변경 금지) ───────────────────────────

export type ShipperAddressBookItem = {
  id: string;
  label: string;
  isDefault: boolean;
  address: string;
  addressDetail: string;
  memo: string;
};

export type UpsertShipperAddressBookItemInput = {
  label: string;
  isDefault?: boolean;
  address: string;
  addressDetail?: string;
  memo?: string;
};

// ─── 매퍼: 서버 raw 타입 → 도메인 타입 ──────────────────────────────────────

/**
 * ShipperAddressItemResponse(서버 raw) → ShipperAddressBookItem(도메인)
 *
 * - `default`(JS 예약어)와 `isDefault`가 서버에서 중복 존재할 수 있음 → isDefault로 통일
 * - 모든 필드에 null-safety 기본값 처리
 */
function toShipperAddress(
  raw: ShipperAddressItemResponse,
  fallbackId: string
): ShipperAddressBookItem {
  return {
    id: raw.id ?? fallbackId,
    label: raw.label ?? "",
    // 서버가 예약어 필드 `default`와 `isDefault` 둘 다 내려줄 수 있으므로 하나로 통일
    isDefault: raw.isDefault ?? (raw as { default?: boolean }).default ?? false,
    address: raw.address ?? "",
    addressDetail: raw.addressDetail ?? "",
    memo: raw.memo ?? "",
  };
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

/** 기본 주소가 하나도 없으면 첫 번째 항목을 자동으로 기본으로 지정 */
function ensureSingleDefault(
  items: ShipperAddressBookItem[]
): ShipperAddressBookItem[] {
  if (items.some((item) => item.isDefault)) return items;
  if (!items.length) return items;
  return items.map((item, index) => ({ ...item, isDefault: index === 0 }));
}

/** targetId 항목만 isDefault=true, 나머지는 false로 일괄 처리 */
function applyDefaultFlag(
  items: ShipperAddressBookItem[],
  targetId: string
): ShipperAddressBookItem[] {
  return items.map((item) => ({ ...item, isDefault: item.id === targetId }));
}

/** UI 입력값 → generated 요청 타입으로 변환 */
function toUpsertRequest(
  input: UpsertShipperAddressBookItemInput
): ShipperAddressUpsertRequest {
  return {
    label: input.label.trim(),
    address: input.address.trim(),
    isDefault: Boolean(input.isDefault),
    // 빈 문자열은 undefined로 처리 (서버 optional 필드)
    addressDetail: (input.addressDetail ?? "").trim() || undefined,
    memo: (input.memo ?? "").trim() || undefined,
  };
}

// ─── Mock 스토어 ──────────────────────────────────────────────────────────────

let mockAddressStore: AddressItemMock[] = shipperSettingsMock.addresses.primary.map(
  (item) => ({ ...item })
);

// ─── 공개 API 함수 ────────────────────────────────────────────────────────────

/**
 * 주소록 목록 조회
 * 레거시: apiClient.get(path) → 교체: listGenerated()
 */
export async function listShipperAddressBook(): Promise<ShipperAddressBookItem[]> {
  if (isMockMode()) {
    return ensureSingleDefault(mockAddressStore.map((item) => ({ ...item })));
  }

  const data = await listGenerated();
  const list = Array.isArray(data) ? data : [];
  const mapped = list.map((item, index) =>
    toShipperAddress(item, `addr-${index + 1}`)
  );
  return ensureSingleDefault(mapped);
}

/**
 * 주소 등록
 * 레거시: apiClient.post(path, payload) → 교체: createGenerated(payload)
 */
export async function createShipperAddressBookItem(
  input: UpsertShipperAddressBookItemInput
): Promise<ShipperAddressBookItem> {
  if (isMockMode()) {
    const nextId = `addr-${Date.now()}`;
    const payload = toUpsertRequest(input);
    let next: ShipperAddressBookItem = {
      id: nextId,
      label: payload.label,
      isDefault: Boolean(payload.isDefault),
      address: payload.address,
      addressDetail: payload.addressDetail ?? "",
      memo: payload.memo ?? "",
    };

    let list = mockAddressStore.map((item) => ({ ...item })) as ShipperAddressBookItem[];
    if (next.isDefault) list = applyDefaultFlag(list, nextId);
    list = ensureSingleDefault([...list, next]);
    mockAddressStore = list.map((item) => ({ ...item }));
    next = mockAddressStore.find((item) => item.id === nextId) ?? next;
    return next;
  }

  const payload = toUpsertRequest(input);
  const data = await createGenerated(payload);
  return toShipperAddress(data, `addr-${Date.now()}`);
}

/**
 * 주소 수정
 * 레거시: apiClient.put(`${path}/${id}`, payload) → 교체: updateGenerated(id, payload)
 */
export async function updateShipperAddressBookItem(
  id: string,
  input: UpsertShipperAddressBookItemInput
): Promise<ShipperAddressBookItem> {
  const safeId = id.trim();

  if (isMockMode()) {
    const payload = toUpsertRequest(input);
    const list = mockAddressStore.map((item) => ({ ...item })) as ShipperAddressBookItem[];
    const idx = list.findIndex((item) => item.id === safeId);
    if (idx < 0) throw new Error("Address not found");

    const updated: ShipperAddressBookItem = {
      ...list[idx],
      label: payload.label,
      address: payload.address,
      addressDetail: payload.addressDetail ?? "",
      memo: payload.memo ?? "",
      isDefault: Boolean(payload.isDefault),
    };

    let nextList = list.map((item, i) => (i === idx ? updated : item));
    if (updated.isDefault) nextList = applyDefaultFlag(nextList, safeId);
    nextList = ensureSingleDefault(nextList);
    mockAddressStore = nextList.map((item) => ({ ...item }));
    return mockAddressStore.find((item) => item.id === safeId) ?? updated;
  }

  const payload = toUpsertRequest(input);
  const data = await updateGenerated(safeId, payload);
  return toShipperAddress(data, safeId);
}

/**
 * 주소 삭제
 * 레거시: apiClient.delete(`${path}/${id}`) → 교체: deleteGenerated(id)
 */
export async function deleteShipperAddressBookItem(id: string): Promise<void> {
  const safeId = id.trim();

  if (isMockMode()) {
    const list = ensureSingleDefault(
      mockAddressStore.filter((item) => item.id !== safeId)
    );
    mockAddressStore = list.map((item) => ({ ...item }));
    return;
  }

  await deleteGenerated(safeId);
}

// ─── 테스트 전용 ──────────────────────────────────────────────────────────────

export function __resetMockAddressBookForTest() {
  mockAddressStore = shipperSettingsMock.addresses.primary.map((item) => ({ ...item }));
}
