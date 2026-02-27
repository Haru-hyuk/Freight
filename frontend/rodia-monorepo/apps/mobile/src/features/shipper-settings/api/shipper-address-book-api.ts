import { apiClient } from "@/shared/lib/api/apiClient";
import { getShipperAddressBookPath, isMockMode } from "@/shared/lib/config/env";
import { shipperSettingsMock, type AddressItemMock } from "@/features/shipper-settings/api/shipper-settings-mock";

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

let mockAddressStore: AddressItemMock[] = shipperSettingsMock.addresses.primary.map((item) => ({ ...item }));

function asObject(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function toStringSafe(input: unknown): string {
  if (typeof input === "string") return input.trim();
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return "";
}

function toBooleanSafe(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input > 0;
  const v = toStringSafe(input).toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function normalizeAddressItem(input: unknown, fallbackId: string): ShipperAddressBookItem {
  const source = asObject(input);
  const id = toStringSafe(source.id || source.addressId || source.shipperAddressId) || fallbackId;
  return {
    id,
    label: toStringSafe(source.label || source.name || source.title),
    isDefault: toBooleanSafe(source.isDefault || source.default),
    address: toStringSafe(source.address),
    addressDetail: toStringSafe(source.addressDetail || source.detailAddress),
    memo: toStringSafe(source.memo || source.note),
  };
}

function pickListPayload(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  const root = asObject(input);
  const data = root.data;
  if (Array.isArray(data)) return data;
  const result = root.result;
  if (Array.isArray(result)) return result;
  const items = root.items;
  if (Array.isArray(items)) return items;
  const list = root.list;
  if (Array.isArray(list)) return list;
  return [];
}

function pickItemPayload(input: unknown): unknown {
  const root = asObject(input);
  if (root.data != null) return root.data;
  if (root.result != null) return root.result;
  return input;
}

function normalizeUpsertPayload(input: UpsertShipperAddressBookItemInput) {
  const label = toStringSafe(input.label);
  const address = toStringSafe(input.address);
  const addressDetail = toStringSafe(input.addressDetail);
  const memo = toStringSafe(input.memo);
  return {
    label,
    isDefault: Boolean(input.isDefault),
    address,
    addressDetail,
    memo,
  };
}

function ensureSingleDefault(items: ShipperAddressBookItem[]): ShipperAddressBookItem[] {
  const hasDefault = items.some((item) => item.isDefault);
  if (hasDefault) return items;
  if (!items.length) return items;
  return items.map((item, index) => ({ ...item, isDefault: index === 0 }));
}

function applyDefaultFlag(items: ShipperAddressBookItem[], targetId: string): ShipperAddressBookItem[] {
  return items.map((item) => ({
    ...item,
    isDefault: item.id === targetId,
  }));
}

export async function listShipperAddressBook(): Promise<ShipperAddressBookItem[]> {
  const path = getShipperAddressBookPath();
  if (isMockMode()) {
    return ensureSingleDefault(mockAddressStore.map((item) => ({ ...item })));
  }

  const res = await apiClient.get(path);
  const list = pickListPayload((res as { data?: unknown })?.data);
  const mapped = list.map((item, index) => normalizeAddressItem(item, `addr-${index + 1}`));
  return ensureSingleDefault(mapped);
}

export async function createShipperAddressBookItem(
  input: UpsertShipperAddressBookItemInput
): Promise<ShipperAddressBookItem> {
  const path = getShipperAddressBookPath();
  const payload = normalizeUpsertPayload(input);

  if (isMockMode()) {
    const nextId = `addr-${Date.now()}`;
    let next: ShipperAddressBookItem = {
      id: nextId,
      label: payload.label,
      isDefault: Boolean(payload.isDefault),
      address: payload.address,
      addressDetail: payload.addressDetail,
      memo: payload.memo,
    };

    let list = mockAddressStore.map((item) => ({ ...item })) as ShipperAddressBookItem[];
    if (next.isDefault) list = applyDefaultFlag(list, next.id);
    list = [...list, next];
    list = ensureSingleDefault(list);
    mockAddressStore = list.map((item) => ({ ...item }));
    next = mockAddressStore.find((item) => item.id === nextId) ?? next;
    return next;
  }

  const res = await apiClient.post(path, payload);
  const raw = pickItemPayload((res as { data?: unknown })?.data);
  return normalizeAddressItem(raw, `addr-${Date.now()}`);
}

export async function updateShipperAddressBookItem(
  id: string,
  input: UpsertShipperAddressBookItemInput
): Promise<ShipperAddressBookItem> {
  const path = getShipperAddressBookPath();
  const safeId = toStringSafe(id);
  const payload = normalizeUpsertPayload(input);

  if (isMockMode()) {
    const list = mockAddressStore.map((item) => ({ ...item })) as ShipperAddressBookItem[];
    const idx = list.findIndex((item) => item.id === safeId);
    if (idx < 0) throw new Error("Address not found");
    const nextItem: ShipperAddressBookItem = { ...list[idx], ...payload };
    let nextList = list.map((item, index) => (index === idx ? nextItem : item));
    if (nextItem.isDefault) nextList = applyDefaultFlag(nextList, nextItem.id);
    nextList = ensureSingleDefault(nextList);
    mockAddressStore = nextList.map((item) => ({ ...item }));
    return mockAddressStore.find((item) => item.id === safeId) ?? nextItem;
  }

  const res = await apiClient.put(`${path}/${encodeURIComponent(safeId)}`, payload);
  const raw = pickItemPayload((res as { data?: unknown })?.data);
  return normalizeAddressItem(raw, safeId);
}

export async function deleteShipperAddressBookItem(id: string): Promise<void> {
  const path = getShipperAddressBookPath();
  const safeId = toStringSafe(id);

  if (isMockMode()) {
    let list = mockAddressStore.filter((item) => item.id !== safeId);
    list = ensureSingleDefault(list);
    mockAddressStore = list.map((item) => ({ ...item }));
    return;
  }

  await apiClient.delete(`${path}/${encodeURIComponent(safeId)}`);
}

export function __resetMockAddressBookForTest() {
  mockAddressStore = shipperSettingsMock.addresses.primary.map((item) => ({ ...item }));
}
