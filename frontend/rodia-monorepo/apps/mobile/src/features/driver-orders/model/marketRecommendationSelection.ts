import type {
  DriverOrderCard,
  DriverRouteRecommendation,
  DriverRouteRecommendationMode,
} from "@/features/matching/api";

export type DriverMarketRecommendationSelection = {
  key: string;
  recommendation: DriverRouteRecommendation;
  orders: DriverOrderCard[];
  mode: DriverRouteRecommendationMode;
  maxQuotesPerRoute: number;
  analyzedAt: number;
  selectedTruckId?: number | null;
};

let currentSelection: DriverMarketRecommendationSelection | null = null;

export function setDriverMarketRecommendationSelection(selection: DriverMarketRecommendationSelection): void {
  currentSelection = {
    ...selection,
    orders: Array.isArray(selection.orders) ? [...selection.orders] : [],
  };
}

export function getDriverMarketRecommendationSelection(
  key?: string | null
): DriverMarketRecommendationSelection | null {
  if (!currentSelection) return null;
  const safeKey = String(key ?? "").trim();
  if (!safeKey) return currentSelection;
  if (currentSelection.key !== safeKey) return null;
  return currentSelection;
}

export function clearDriverMarketRecommendationSelection(): void {
  currentSelection = null;
}
