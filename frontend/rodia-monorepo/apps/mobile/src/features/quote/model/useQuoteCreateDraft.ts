import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CargoField, CargoItem, CargoItemCategory, DropOffKey, QuoteCreateDraft } from "./quoteCreateDraft";

const DROP_OFF_END_KEY = "END" as DropOffKey;

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

function createDefaultTime() {
  const initial = new Date();
  initial.setHours(9, 0, 0, 0);
  return initial;
}

function createEmptyCargoItem(id: number): CargoItem {
  return {
    id,
    itemCategory: "BOX",
    type: "박스",
    quantity: "1",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    weight: "",
    dropOffKey: DROP_OFF_END_KEY,
  };
}

function makeWaypointDropOffKey(id: number): DropOffKey {
  const safeId = Number.isFinite(id) ? Math.max(0, Math.floor(id)) : 0;
  return `WP:${safeId}` as DropOffKey;
}

function getDropOffTargets(draft: QuoteCreateDraft) {
  const waypoints = draft?.waypoints ?? [];

  return [
    ...waypoints.map((waypoint, idx) => ({
      key: makeWaypointDropOffKey(waypoint?.id ?? idx + 1),
      label: `경유지 ${idx + 1}`,
    })),
    { key: DROP_OFF_END_KEY, label: "도착지" },
  ];
}

function normalizeCargoDropOffKeys(next: QuoteCreateDraft): QuoteCreateDraft {
  const targets = getDropOffTargets(next);
  const allowed = new Set<string>(targets.map((target) => target.key));

  const nextCargoList = (next?.cargoList ?? []).map((cargo) => {
    const key = cargo?.dropOffKey;
    const safeKey = allowed.has(key) ? key : DROP_OFF_END_KEY;
    return { ...cargo, dropOffKey: safeKey };
  });

  return {
    ...next,
    cargoList: nextCargoList.length > 0 ? nextCargoList : [createEmptyCargoItem(1)],
  };
}

function createInitialQuoteCreateDraft(): QuoteCreateDraft {
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

    loadMethod: "SHIPPER:MANUAL",
    unloadMethod: "DRIVER:MANUAL",

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

const Ctx = createContext<QuoteCreateDraftStore | null>(null);

export function QuoteCreateDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<QuoteCreateDraft>(() => createInitialQuoteCreateDraft());

  const patchDraft = useCallback((patch: Partial<QuoteCreateDraft>) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialQuoteCreateDraft();
      const merged = { ...safePrev, ...(patch ?? {}) } as QuoteCreateDraft;
      return normalizeCargoDropOffKeys(merged);
    });
  }, []);

  const addCargo = useCallback(() => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialQuoteCreateDraft();
      const list = safePrev?.cargoList ?? [];
      const lastId = list.length > 0 ? list[list.length - 1].id : 0;
      const next = { ...safePrev, cargoList: [...list, createEmptyCargoItem(lastId + 1)] };
      return normalizeCargoDropOffKeys(next);
    });
  }, []);

  const removeCargo = useCallback((id: number) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialQuoteCreateDraft();
      const list = safePrev?.cargoList ?? [];
      const nextList = list.filter((cargo) => cargo.id !== id);
      const next = { ...safePrev, cargoList: nextList.length > 0 ? nextList : [createEmptyCargoItem(1)] };
      return normalizeCargoDropOffKeys(next);
    });
  }, []);

  const updateCargo = useCallback((id: number, field: CargoField, value: string) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialQuoteCreateDraft();
      const list = safePrev?.cargoList ?? [];

      const nextList = list.map((cargo) => {
        if (cargo.id !== id) return cargo;

        if (field === "dropOffKey") {
          return { ...cargo, dropOffKey: value as DropOffKey };
        }

        if (field === "itemCategory") {
          return { ...cargo, itemCategory: value as CargoItemCategory };
        }

        return { ...cargo, [field]: value };
      });

      return { ...safePrev, cargoList: nextList };
    });
  }, []);

  const toggleOption = useCallback((id: string) => {
    setDraft((prev) => {
      const safePrev = prev ?? createInitialQuoteCreateDraft();
      const set = new Set(safePrev.selectedOpts ?? []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...safePrev, selectedOpts: Array.from(set) };
    });
  }, []);

  const reset = useCallback(() => {
    setDraft(createInitialQuoteCreateDraft());
  }, []);

  const value = useMemo<QuoteCreateDraftStore>(
    () => ({ draft, setDraft, patchDraft, addCargo, removeCargo, updateCargo, toggleOption, reset }),
    [draft, patchDraft, addCargo, removeCargo, updateCargo, toggleOption, reset]
  );

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useQuoteCreateDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useQuoteCreateDraft must be used within QuoteCreateDraftProvider");
  }
  return ctx;
}

export type { QuoteCreateDraftStore };
