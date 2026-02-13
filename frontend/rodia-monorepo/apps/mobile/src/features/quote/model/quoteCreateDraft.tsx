import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// --- 1. Constants & Types ---

export type VehicleType = { n: string; p: number };
export type VehicleCategory = { name: string; limit: number; types: VehicleType[] };

export const VEHICLE_DATA: VehicleCategory[] = [
  {
    name: "1톤",
    limit: 1000,
    types: [
      { n: "카고", p: 80000 },
      { n: "탑차", p: 90000 },
      { n: "윙바디", p: 100000 },
    ],
  },
  {
    name: "2.5톤",
    limit: 2500,
    types: [
      { n: "카고", p: 150000 },
      { n: "탑차", p: 160000 },
    ],
  },
  {
    name: "5톤",
    limit: 5000,
    types: [
      { n: "카고", p: 220000 },
      { n: "윙바디", p: 250000 },
    ],
  },
];

export const EXTRA_OPTIONS = [
  { id: "caution", title: "파손주의", price: 5000 },
  { id: "upright", title: "세워서 적재", price: 3000 },
  { id: "waterproof", title: "방수/습기주의", price: 5000 },
  { id: "shock", title: "충격주의", price: 5000 },
] as const;

export const WORK_METHODS = ["수작업", "지게차", "사다리차", "엘리베이터"] as const;

export const DROP_OFF_END = "END" as const;
export type DropOffKey = typeof DROP_OFF_END | `WP:${number}`;

export const CARGO_ITEM_CATEGORIES = [
  { id: "BOX", label: "박스" },
  { id: "PALLET", label: "팔레트" },
  { id: "FURNITURE", label: "가구 집기" },
] as const;
export type CargoItemCategory = (typeof CARGO_ITEM_CATEGORIES)[number]["id"];

export type CargoItem = {
  id: number;
  itemCategory: CargoItemCategory;
  type: string; // 품목명 (가구명 or 박스 등)
  quantity: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weight: string;
  dropOffKey: DropOffKey;
  // volume은 CBM 계산용으로 UI에서 실시간 계산하므로 굳이 저장 안 해도 됨 (필요시 추가)
};

export type CargoField = keyof CargoItem;

export type Waypoint = {
  id: number;
  name: string;
  phone: string;
  addr: string;
  detail: string;
};

export type QuoteCreateDraft = {
  // Step 1: Transport
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;

  startAddr: string;
  startAddrDetail: string;
  endAddr: string;
  endAddrDetail: string;

  waypoints: Waypoint[];

  loadMethod: (typeof WORK_METHODS)[number];
  unloadMethod: (typeof WORK_METHODS)[number];

  date: Date;
  time: Date;
  truckId?: number;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  distanceKm?: number;

  // Step 2: Cargo
  cargoList: CargoItem[];

  // Step 3: Vehicle & Options
  tonIdx: number;
  typeIdx: number;
  isFrozen: boolean;
  isPool: boolean;

  selectedOpts: string[];
  budget: string; // 희망 운임

  noteToDriver: string;
};

// --- 2. Helpers ---

function createDefaultTime() {
  const initial = new Date();
  initial.setHours(9, 0, 0, 0);
  return initial;
}

function safeInt(v: string | number | undefined) {
  if (typeof v === "number") return v;
  return parseInt((v ?? "").replace(/[^\d]/g, ""), 10) || 0;
}

export function makeWaypointDropOffKey(id: number): DropOffKey {
  const safeId = Number.isFinite(id) ? Math.max(0, Math.floor(id)) : 0;
  return `WP:${safeId}` as DropOffKey;
}

export function getDropOffTargets(draft: QuoteCreateDraft) {
  const waypoints = draft?.waypoints ?? [];
  return [
    ...waypoints.map((w, idx) => ({
      key: makeWaypointDropOffKey(w?.id ?? idx + 1) as DropOffKey,
      label: `경유지 ${idx + 1}`,
      sub: (w?.addr ?? "").trim() || undefined,
    })),
    {
      key: DROP_OFF_END as DropOffKey,
      label: "도착지",
      sub: (draft?.endAddr ?? "").trim() || undefined,
    },
  ];
}

function createEmptyCargoItem(id: number): CargoItem {
  return {
    id,
    itemCategory: "BOX",
    type: "",
    quantity: "1",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    weight: "",
    dropOffKey: DROP_OFF_END,
  };
}

// 경유지 삭제 시, 해당 경유지로 설정된 화물의 하차지를 '도착지'로 리셋
function normalizeCargoDropOffKeys(next: QuoteCreateDraft): QuoteCreateDraft {
  const targets = getDropOffTargets(next);
  const allowed = new Set<string>(targets.map((target) => target.key));

  const cargoList = (next?.cargoList ?? []).map((cargo) => {
    const key = cargo.dropOffKey;
    const safeKey = allowed.has(key) ? key : DROP_OFF_END;
    
    return { ...cargo, dropOffKey: safeKey };
  });

  return { ...next, cargoList: cargoList.length > 0 ? cargoList : [createEmptyCargoItem(1)] };
}

function createInitialDraft(): QuoteCreateDraft {
  return {
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",

    startAddr: "",
    startAddrDetail: "",
    endAddr: "",
    endAddrDetail: "",

    waypoints: [],

    loadMethod: "수작업",
    unloadMethod: "수작업",

    date: new Date(),
    time: createDefaultTime(),
    truckId: 1,
    originLat: 0,
    originLng: 0,
    destinationLat: 0,
    destinationLng: 0,
    distanceKm: 0,

    cargoList: [createEmptyCargoItem(1)],

    tonIdx: 0,
    typeIdx: 0,
    isFrozen: false,
    isPool: false,

    selectedOpts: [],
    budget: "",

    noteToDriver: "",
  };
}

export function formatKrw(value: number) {
  const v = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${v.toLocaleString()}원`;
}

// **핵심 로직 Update**: Step 3의 AI 분석 로직과 일치시킴
export function computeQuotePricing(draft: QuoteCreateDraft) {
  // 1. Vehicle info (Safe Indexing)
  const tonIdx = Math.min(Math.max(draft.tonIdx ?? 0, 0), VEHICLE_DATA.length - 1);
  const vehicleData = VEHICLE_DATA[tonIdx];
  const typeIdx = Math.min(Math.max(draft.typeIdx ?? 0, 0), (vehicleData?.types?.length ?? 1) - 1);
  const typeData = vehicleData?.types?.[typeIdx];

  // 2. Base Price Calculation
  const basePrice0 = typeData?.p ?? 0;
  const basePrice = draft.isPool ? Math.floor(basePrice0 * 0.8) : basePrice0; // 합짐 20% 할인
  const frozenPrice = draft.isFrozen ? 30000 : 0; // 냉동 3만원

  // 3. Options
  const optionPrice = (draft.selectedOpts ?? []).reduce((acc, id) => {
    const opt = EXTRA_OPTIONS.find((o) => o?.id === id);
    return acc + (opt?.price ?? 0);
  }, 0);

  // 4. Totals
  const finalPrice = basePrice + frozenPrice + optionPrice;

  // 5. Market Range (AI Analysis Logic)
  const minPrice = Math.floor(finalPrice * 0.9);
  const maxPrice = Math.floor(finalPrice * 1.15);

  // 6. Weight Analysis
  const totalWeight = (draft?.cargoList ?? []).reduce((sum, cargo) => sum + safeInt(cargo.weight), 0);
  const limit = vehicleData.limit;

  return {
    basePrice,
    frozenPrice,
    optionPrice,
    finalPrice, // 기준 견적
    minPrice,   // 예상 최저
    maxPrice,   // 예상 최고
    totalWeight,
    limit,
    vehicleName: vehicleData.name,
    typeName: typeData.n,
  };
}

// --- 3. Context & Provider ---

type QuoteCreateDraftStore = {
  draft: QuoteCreateDraft;
  setDraft: React.Dispatch<React.SetStateAction<QuoteCreateDraft>>;
  patchDraft: (patch: Partial<QuoteCreateDraft>) => void;

  addCargo: () => void;
  removeCargo: (id: number) => void;
  updateCargo: (id: number, field: CargoField, value: string) => void;

  toggleOption: (id: string) => void;
  reset: () => void;
};

const Ctx = createContext<QuoteCreateDraftStore | null>(null);

export function QuoteCreateDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<QuoteCreateDraft>(() => createInitialDraft());

  const patchDraft = useCallback((patch: Partial<QuoteCreateDraft>) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const merged = { ...safePrev, ...(patch ?? {}) } as QuoteCreateDraft;
      return normalizeCargoDropOffKeys(merged);
    });
  }, []);

  const addCargo = useCallback(() => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const list = safePrev?.cargoList ?? [];
      const lastId = list.length > 0 ? list[list.length - 1].id : 0;
      const next = { ...safePrev, cargoList: [...list, createEmptyCargoItem(lastId + 1)] };
      return normalizeCargoDropOffKeys(next);
    });
  }, []);

  const removeCargo = useCallback((id: number) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const list = safePrev?.cargoList ?? [];
      const nextList = list.filter((cargo) => cargo.id !== id);
      // 화물이 하나도 없으면 빈 카드 하나 생성 (UX 유지)
      const next = { ...safePrev, cargoList: nextList.length > 0 ? nextList : [createEmptyCargoItem(1)] };
      return normalizeCargoDropOffKeys(next);
    });
  }, []);

  const updateCargo = useCallback((id: number, field: CargoField, value: string) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const list = safePrev?.cargoList ?? [];

      const nextList = list.map((cargo) => {
        if (cargo.id !== id) return cargo;

        if (field === "dropOffKey") {
          const key = (value as DropOffKey); // 이미 UI에서 필터링된 키가 들어옴
          return { ...cargo, dropOffKey: key };
        }

        if (field === "itemCategory") {
          // 카테고리 변경 시 일부 필드 초기화 가능 (선택 사항)
          return { ...cargo, itemCategory: value as CargoItemCategory };
        }

        return { ...cargo, [field]: value };
      });

      return { ...safePrev, cargoList: nextList };
    });
  }, []);

  const toggleOption = useCallback((id: string) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const set = new Set(safePrev.selectedOpts ?? []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...safePrev, selectedOpts: Array.from(set) };
    });
  }, []);

  const reset = useCallback(() => setDraft(createInitialDraft()), []);

  const value = useMemo<QuoteCreateDraftStore>(
    () => ({ draft, setDraft, patchDraft, addCargo, removeCargo, updateCargo, toggleOption, reset }),
    [draft, patchDraft, addCargo, removeCargo, updateCargo, toggleOption, reset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuoteCreateDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useQuoteCreateDraft must be used within QuoteCreateDraftProvider");
  }
  return ctx;
}
