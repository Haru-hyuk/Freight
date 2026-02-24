export type VehicleBodyType = "일반카고" | "탑차" | "윙바디" | "추레라" | "냉장차" | "사다리차";

export type VehiclePricingRow = {
  vehiclePricingId: string;
  tonnageLabel: string;
  bodyType: VehicleBodyType;
  baseFare: number;
  additionalFare: number;
  surchargeRate: number;
  active: boolean;
  updatedBy: string;
  updatedAt: string;
};

export type AdditionalPricingScope = "VEHICLE_OPTION" | "TRANSPORT_OPTION" | "LOAD_UNLOAD_TOOL" | "COMBINE_RULE";

export type AdditionalPricingRow = {
  additionalPricingId: string;
  scope: AdditionalPricingScope;
  optionName: string;
  additionalFare: number;
  rateDelta: number;
  active: boolean;
  updatedBy: string;
  updatedAt: string;
};

export type VehiclePricingUpdatePayload = {
  vehiclePricingId: string;
  baseFare: number;
  additionalFare: number;
  surchargeRate: number;
  active: boolean;
};

export type AdditionalPricingUpdatePayload = {
  additionalPricingId: string;
  additionalFare: number;
  rateDelta: number;
  active: boolean;
};

