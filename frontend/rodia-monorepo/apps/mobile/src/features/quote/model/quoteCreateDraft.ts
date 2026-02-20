export type VehicleType = { n: string; p: number };
export type VehicleCategory = { name: string; limit: number; types: VehicleType[] };

export const VEHICLE_DATA: VehicleCategory[] = [
  {
    name: "1톤",
    limit: 1000,
    types: [
      { n: "카고", p: 80000 },
      { n: "윙바디", p: 90000 },
      { n: "탑차", p: 100000 },
    ],
  },
  {
    name: "2.5톤",
    limit: 2500,
    types: [
      { n: "카고", p: 150000 },
      { n: "윙바디", p: 160000 },
    ],
  },
  {
    name: "5톤",
    limit: 5000,
    types: [
      { n: "카고", p: 220000 },
      { n: "탑차", p: 250000 },
    ],
  },
];

export const EXTRA_OPTIONS = [
  { id: "caution", title: "파손주의", price: 5000 },
  { id: "upright", title: "세워서 상차", price: 3000 },
  { id: "waterproof", title: "방수/습기주의", price: 5000 },
  { id: "shock", title: "충격주의", price: 5000 },
] as const;

export const WORK_METHODS = ["수작업", "지게차", "사다리차", "허리베어"] as const;

export const DROP_OFF_END = "END" as const;
export type DropOffKey = typeof DROP_OFF_END | `WP:${number}`;

export const CARGO_ITEM_CATEGORIES = [
  { id: "BOX", label: "박스" },
  { id: "PALLET", label: "파렛트" },
  { id: "FURNITURE", label: "가구/집기" },
] as const;
export type CargoItemCategory = (typeof CARGO_ITEM_CATEGORIES)[number]["id"];

export type CargoItem = {
  id: number;
  itemCategory: CargoItemCategory;
  type: string;
  quantity: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weight: string;
  dropOffKey: DropOffKey;
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
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;

  startAddr: string;
  startAddrDetail: string;
  endAddr: string;
  endAddrDetail: string;

  waypoints: Waypoint[];

  loadMethod: string;
  unloadMethod: string;

  date: Date;
  time: Date;
  truckId?: number;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  distanceKm?: number;

  cargoList: CargoItem[];

  tonIdx: number;
  typeIdx: number;
  isFrozen: boolean;
  isPool: boolean;

  selectedOpts: string[];
  budget: string;

  noteToDriver: string;
};

function safeInt(value: string | number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  return parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10) || 0;
}

export function createDefaultTime() {
  const initial = new Date();
  initial.setHours(9, 0, 0, 0);
  return initial;
}

export function makeWaypointDropOffKey(id: number): DropOffKey {
  const safeId = Number.isFinite(id) ? Math.max(0, Math.floor(id)) : 0;
  return `WP:${safeId}` as DropOffKey;
}

export function getDropOffTargets(draft: QuoteCreateDraft) {
  const waypoints = draft?.waypoints ?? [];

  return [
    ...waypoints.map((waypoint, idx) => ({
      key: makeWaypointDropOffKey(waypoint?.id ?? idx + 1) as DropOffKey,
      label: `경유지 ${idx + 1}`,
      sub: (waypoint?.addr ?? "").trim() || undefined,
    })),
    {
      key: DROP_OFF_END as DropOffKey,
      label: "도착지",
      sub: (draft?.endAddr ?? "").trim() || undefined,
    },
  ];
}

export function createEmptyCargoItem(id: number): CargoItem {
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

export function normalizeCargoDropOffKeys(next: QuoteCreateDraft): QuoteCreateDraft {
  const targets = getDropOffTargets(next);
  const allowed = new Set<string>(targets.map((target) => target.key));

  const nextCargoList = (next?.cargoList ?? []).map((cargo) => {
    const key = cargo?.dropOffKey;
    const safeKey = allowed.has(key) ? key : DROP_OFF_END;
    return { ...cargo, dropOffKey: safeKey };
  });

  return {
    ...next,
    cargoList: nextCargoList.length > 0 ? nextCargoList : [createEmptyCargoItem(1)],
  };
}

export function createInitialQuoteCreateDraft(): QuoteCreateDraft {
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
  const safeValue = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${safeValue.toLocaleString()}원`;
}

export function computeQuotePricing(draft: QuoteCreateDraft) {
  const safeTonIdx = Math.min(Math.max(draft?.tonIdx ?? 0, 0), Math.max(VEHICLE_DATA.length - 1, 0));
  const vehicleData =
    VEHICLE_DATA[safeTonIdx] ?? VEHICLE_DATA[0] ?? { name: "1톤", limit: 1000, types: [{ n: "카고", p: 0 }] };
  const safeTypeIdx = Math.min(
    Math.max(draft?.typeIdx ?? 0, 0),
    Math.max((vehicleData?.types?.length ?? 1) - 1, 0)
  );
  const typeData = vehicleData?.types?.[safeTypeIdx] ?? vehicleData?.types?.[0] ?? { n: "카고", p: 0 };

  const basePriceRaw = typeData?.p ?? 0;
  const basePrice = draft?.isPool ? Math.floor(basePriceRaw * 0.8) : basePriceRaw;
  const frozenPrice = draft?.isFrozen ? 30000 : 0;

  const optionPrice = (draft?.selectedOpts ?? []).reduce((acc, id) => {
    const option = EXTRA_OPTIONS.find((opt) => opt?.id === id);
    return acc + (option?.price ?? 0);
  }, 0);

  const finalPrice = basePrice + frozenPrice + optionPrice;
  const minPrice = Math.floor(finalPrice * 0.9);
  const maxPrice = Math.floor(finalPrice * 1.15);

  const totalWeight = (draft?.cargoList ?? []).reduce((sum, cargo) => sum + safeInt(cargo?.weight), 0);

  return {
    basePrice,
    frozenPrice,
    optionPrice,
    finalPrice,
    minPrice,
    maxPrice,
    totalWeight,
    limit: vehicleData?.limit ?? 0,
    vehicleName: vehicleData?.name ?? "1톤",
    typeName: typeData?.n ?? "카고",
  };
}

export { QuoteCreateDraftProvider, useQuoteCreateDraft, type QuoteCreateDraftStore } from "./useQuoteCreateDraft";

