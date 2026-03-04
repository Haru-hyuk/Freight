import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import type { ActiveRun } from "./types";

// For now, the Active Order is represented by the QuoteDetailResponse.
// We can create a more specific 'ActiveOrder' type later if needed.
export type ActiveOrder = QuoteDetailResponse;

type ActiveOrderStore = {
  activeOrder: ActiveOrder | null;
  setActiveOrder: (order: ActiveOrder) => void;
  clearActiveOrder: () => void;
  activeRun: ActiveRun | null;
  setActiveRun: (run: ActiveRun) => void;
  clearActiveRun: () => void;
};

const ActiveOrderContext = createContext<ActiveOrderStore | null>(null);

export function ActiveOrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrder, setActiveOrderState] = useState<ActiveOrder | null>(null);
  const [activeRun, setActiveRunState] = useState<ActiveRun | null>(null);

  const setActiveOrder = useCallback((order: ActiveOrder) => {
    setActiveOrderState((prev) => {
      const nextStatus = typeof order.status === "string" ? order.status.trim() : "";
      if (!nextStatus && prev?.status) {
        return { ...order, status: prev.status };
      }
      return order;
    });
  }, []);

  const clearActiveOrder = useCallback(() => {
    setActiveOrderState(null);
  }, []);

  const setActiveRun = useCallback((run: ActiveRun) => {
    setActiveRunState(run);
  }, []);

  const clearActiveRun = useCallback(() => {
    setActiveRunState(null);
  }, []);

  const value = useMemo<ActiveOrderStore>(
    () => ({
      activeOrder,
      setActiveOrder,
      clearActiveOrder,
      activeRun,
      setActiveRun,
      clearActiveRun,
    }),
    [activeOrder, setActiveOrder, clearActiveOrder, activeRun, setActiveRun, clearActiveRun]
  );

  return React.createElement(ActiveOrderContext.Provider, { value }, children);
}

export function useActiveOrder() {
  const context = useContext(ActiveOrderContext);
  if (!context) {
    throw new Error("useActiveOrder must be used within an ActiveOrderProvider");
  }
  return context;
}
