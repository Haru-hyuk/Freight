// apps/mobile/src/features/quote/model/quoteCreateDraft.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

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

export const WORK_METHODS = ["수작업", "지게차", "사다리차"] as const;

export type CargoItem = { id: number; type: string; weight: string; volume: string };
export type CargoField = "type" | "weight" | "volume";

export type Waypoint = {
  id: number;
  name: string;
  phone: string;
  addr: string;
  detail: string;
};

export type QuoteCreateDraft = {
  // step1
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;

  startAddr: string;
  startAddrDetail: string;
  endAddr: string;
  endAddrDetail: string;

  waypoints: Waypoint[];

  // "상차/하차 방식" (고객/기사 구분) + 장비(수작업/지게차 등)
  loadRole: "고객상차" | "기사상차";
  unloadRole: "고객하차" | "기사하차";
  loadMethod: (typeof WORK_METHODS)[number];
  unloadMethod: (typeof WORK_METHODS)[number];

  date: Date;
  time: Date;

  // step2
  cargoList: CargoItem[];

  tonIdx: number;
  typeIdx: number;
  isFrozen: boolean;
  isPool: boolean;

  selectedOpts: string[];
  budget: string;

  noteToDriver: string;
};

function createDefaultTime() {
  const initial = new Date();
  initial.setHours(9, 0, 0, 0);
  return initial;
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

    // 요청하신 기본값: 상차=고객, 하차=기사
    loadRole: "고객상차",
    unloadRole: "기사하차",
    loadMethod: "수작업",
    unloadMethod: "수작업",

    date: new Date(),
    time: createDefaultTime(),

    cargoList: [{ id: 1, type: "", weight: "", volume: "" }],

    tonIdx: 0,
    typeIdx: 0,
    isFrozen: false,
    isPool: false,

    selectedOpts: [],
    budget: "",

    noteToDriver: "",
  };
}

export function toIntLoose(v: string) {
  const n = parseInt((v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatKrw(value: number) {
  const v = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${v.toLocaleString()}원`;
}

export function computeQuotePricing(draft: QuoteCreateDraft) {
  const tonIdx = draft?.tonIdx ?? 0;
  const typeIdx = draft?.typeIdx ?? 0;

  const basePrice = VEHICLE_DATA?.[tonIdx]?.types?.[typeIdx]?.p ?? 0;
  const frozenPrice = draft?.isFrozen ? 30000 : 0;

  const optionPrice = (draft?.selectedOpts ?? []).reduce((acc, id) => {
    const opt = EXTRA_OPTIONS.find((o) => o?.id === id);
    return acc + (opt?.price ?? 0);
  }, 0);

  let subTotal = basePrice + frozenPrice;
  if (draft?.isPool) subTotal = Math.floor(subTotal * 0.8);
  const finalPrice = subTotal + optionPrice;

  const totalWeight = (draft?.cargoList ?? []).reduce((sum, c) => sum + toIntLoose(c?.weight ?? ""), 0);
  const limit = VEHICLE_DATA?.[tonIdx]?.limit ?? 0;

  return { basePrice, frozenPrice, optionPrice, subTotal, finalPrice, totalWeight, limit };
}

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
    setDraft((prev) => ({ ...(prev ?? createInitialDraft()), ...(patch ?? {}) }));
  }, []);

  const addCargo = useCallback(() => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const list = safePrev?.cargoList ?? [];
      const lastId = list?.[list.length - 1]?.id ?? 0;
      return { ...safePrev, cargoList: [...list, { id: lastId + 1, type: "", weight: "", volume: "" }] };
    });
  }, []);

  const removeCargo = useCallback((id: number) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const list = safePrev?.cargoList ?? [];
      const next = list.filter((c) => c?.id !== id);
      return { ...safePrev, cargoList: next.length > 0 ? next : [{ id: 1, type: "", weight: "", volume: "" }] };
    });
  }, []);

  const updateCargo = useCallback((id: number, field: CargoField, value: string) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const list = safePrev?.cargoList ?? [];
      return {
        ...safePrev,
        cargoList: list.map((c) => (c?.id === id ? { ...c, [field]: value } : c)),
      };
    });
  }, []);

  const toggleOption = useCallback((id: string) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialDraft();
      const set = new Set(safePrev?.selectedOpts ?? []);
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
