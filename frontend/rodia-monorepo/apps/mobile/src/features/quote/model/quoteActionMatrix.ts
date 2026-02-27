// features/quote/model/quoteActionMatrix.ts
import type { QuoteStatusApi } from "@/entities/quote/model/quote.types";
import {
  BADGE_TONE,
  CUSTOMER_UI_STATE,
  getCustomerBadge,
  getCustomerCta,
  getCustomerUiStateFromBackendStatus,
  type CustomerUiState,
} from "@/shared/lib/policy";
import { tint } from "@/shared/theme/colorUtils";
import type { AppTheme } from "@/shared/theme/types";

export type BottomActionId =
  | "acceptOffer"
  | "rejectOffer"
  | "pay"
  | "cancelRequest"
  | "callDriver"
  | "viewPickupPhotos"
  | "viewLiveLocation"
  | "viewPOD"
  | "reRequestRoute";

export type DecisionActionId = "acceptOffer" | "rejectOffer" | "pay" | "cancelRequest" | "reRequestRoute";

export type QuotePolicyCategory = "actionRequired" | "inProgress" | "closed";
export type QuotePolicyTone = "attention" | "progress" | "closed" | "neutral";
export type QuoteHighlightType = "priceCompare" | "driverProfile" | "miniMap" | "progressInfo" | "proof" | "none";

export type QuoteListCtaKind = "action" | "nav" | "price";

export type QuoteActionPolicy = {
  category: QuotePolicyCategory;
  tone: QuotePolicyTone;
  stageOrder: number;
  badgeLabel: string;
  ctaLabel: string;
  listCtaKind: QuoteListCtaKind;
  detailTop: { title: string; subtitle?: string };
  highlightCard: { type: QuoteHighlightType; quickActions?: BottomActionId[] };
  bottomBar: { primary?: DecisionActionId; secondary?: DecisionActionId } | null;
  guards?: { confirmPrimary?: boolean; confirmSecondary?: boolean };
};

export type QuoteTonePaletteKey = "attention" | "progress" | "closed" | "neutral";

export type QuoteTonePalette = {
  key: QuoteTonePaletteKey;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  emphasisText: string;
  iconColor: string;
  iconChipBg: string;
  iconChipBorder: string;
  spotlightBg: string;
  spotlightBorder: string;
};

const DEFAULT_STATUS_LABEL = "진행 상태";

type QuotePolicyBehavior = {
  category: QuotePolicyCategory;
  stageOrder: number;
  listCtaKind: QuoteListCtaKind;
  detailTop: QuoteActionPolicy["detailTop"];
  highlightCard: QuoteActionPolicy["highlightCard"];
  bottomBar: QuoteActionPolicy["bottomBar"];
  guards?: QuoteActionPolicy["guards"];
};

const UI_STATE_BEHAVIOR_MAP: Readonly<Record<CustomerUiState, QuotePolicyBehavior>> = {
  [CUSTOMER_UI_STATE.REQUESTED]: {
    category: "inProgress",
    stageOrder: 10,
    listCtaKind: "nav",
    detailTop: {
      title: "요청이 접수되었습니다",
      subtitle: "배차 가능한 기사님을 확인 중입니다.",
    },
    highlightCard: { type: "progressInfo", quickActions: [] },
    bottomBar: { primary: "cancelRequest" },
    guards: { confirmPrimary: true },
  },
  [CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED]: {
    category: "actionRequired",
    stageOrder: 5,
    listCtaKind: "action",
    detailTop: {
      title: "운임 제안이 도착했습니다",
      subtitle: "수락 또는 거절을 선택할 수 있습니다.",
    },
    highlightCard: { type: "priceCompare", quickActions: [] },
    bottomBar: { primary: "acceptOffer", secondary: "rejectOffer" },
    guards: { confirmPrimary: true, confirmSecondary: true },
  },
  [CUSTOMER_UI_STATE.PAYMENT_REQUIRED]: {
    category: "actionRequired",
    stageOrder: 15,
    listCtaKind: "action",
    detailTop: {
      title: "배차가 완료되었습니다",
      subtitle: "결제를 완료하면 운송이 시작됩니다.",
    },
    highlightCard: { type: "driverProfile", quickActions: ["callDriver"] },
    bottomBar: { primary: "pay", secondary: "cancelRequest" },
    guards: { confirmSecondary: true },
  },
  [CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS]: {
    category: "inProgress",
    stageOrder: 20,
    listCtaKind: "nav",
    detailTop: {
      title: "상차가 진행 중입니다",
      subtitle: "현장 사진과 기사님 연락 기능을 확인할 수 있습니다.",
    },
    highlightCard: { type: "miniMap", quickActions: ["viewPickupPhotos", "callDriver"] },
    bottomBar: null,
  },
  [CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS]: {
    category: "inProgress",
    stageOrder: 30,
    listCtaKind: "nav",
    detailTop: {
      title: "화물이 이동 중입니다",
      subtitle: "실시간 위치와 이동 상태를 확인할 수 있습니다.",
    },
    highlightCard: { type: "miniMap", quickActions: ["viewLiveLocation", "callDriver"] },
    bottomBar: null,
  },
  [CUSTOMER_UI_STATE.COMPLETED]: {
    category: "closed",
    stageOrder: 90,
    listCtaKind: "price",
    detailTop: {
      title: "운송이 완료되었습니다",
      subtitle: "인수증을 확인할 수 있습니다.",
    },
    highlightCard: { type: "proof", quickActions: ["viewPOD"] },
    bottomBar: { primary: "reRequestRoute" },
  },
  [CUSTOMER_UI_STATE.CANCELED]: {
    category: "closed",
    stageOrder: 99,
    listCtaKind: "nav",
    detailTop: {
      title: "요청이 취소되었습니다",
      subtitle: "같은 경로로 다시 요청할 수 있습니다.",
    },
    highlightCard: { type: "none", quickActions: [] },
    bottomBar: { primary: "reRequestRoute" },
  },
  [CUSTOMER_UI_STATE.UNKNOWN]: {
    category: "inProgress",
    stageOrder: 50,
    listCtaKind: "nav",
    detailTop: { title: "진행 상태를 확인해주세요" },
    highlightCard: { type: "none", quickActions: [] },
    bottomBar: null,
  },
};

function toQuoteTone(tone: ReturnType<typeof getCustomerBadge>["tone"]): QuotePolicyTone {
  if (tone === BADGE_TONE.ATTENTION) return "attention";
  if (tone === BADGE_TONE.PROGRESS) return "progress";
  if (tone === BADGE_TONE.CLOSED) return "closed";
  return "neutral";
}

function buildQuoteActionPolicyByUiState(uiState: CustomerUiState): QuoteActionPolicy {
  const behavior = UI_STATE_BEHAVIOR_MAP[uiState] ?? UI_STATE_BEHAVIOR_MAP[CUSTOMER_UI_STATE.UNKNOWN];
  const badge = getCustomerBadge(uiState);
  const cta = getCustomerCta(uiState);

  return {
    category: behavior.category,
    tone: toQuoteTone(badge.tone),
    stageOrder: behavior.stageOrder,
    badgeLabel: badge.label || DEFAULT_STATUS_LABEL,
    ctaLabel: cta.label,
    listCtaKind: behavior.listCtaKind,
    detailTop: behavior.detailTop,
    highlightCard: behavior.highlightCard,
    bottomBar: behavior.bottomBar,
    guards: behavior.guards,
  };
}

function toCustomerUiState(status: QuoteStatusApi | string): CustomerUiState {
  return getCustomerUiStateFromBackendStatus(String(status ?? ""));
}

export const DEFAULT_QUOTE_ACTION_POLICY: QuoteActionPolicy = {
  ...buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.UNKNOWN),
  badgeLabel: DEFAULT_STATUS_LABEL,
};

export const QUOTE_ACTION_MATRIX: Record<QuoteStatusApi, QuoteActionPolicy> = {
  OPEN: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.REQUESTED),
  NEGOTIATING: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED),
  ASSIGNED: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.PAYMENT_REQUIRED),
  PREPARING: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.PAYMENT_REQUIRED),
  DRIVING: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS),
  ACCEPTED: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.PAYMENT_REQUIRED),
  PICKUP: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS),
  TRANSIT: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS),
  DROPOFF: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.COMPLETED),
  CANCELED: buildQuoteActionPolicyByUiState(CUSTOMER_UI_STATE.CANCELED),
};

export function getQuoteActionPolicy(status: QuoteStatusApi | string): QuoteActionPolicy {
  const uiState = toCustomerUiState(status);
  return buildQuoteActionPolicyByUiState(uiState);
}

export function getQuoteStatusLabel(status: QuoteStatusApi | string): string {
  return getQuoteActionPolicy(status).badgeLabel ?? DEFAULT_STATUS_LABEL;
}

function resolveToneKey(policy?: Pick<QuoteActionPolicy, "tone" | "category">): QuoteTonePaletteKey {
  if (!policy) return "neutral";

  if (policy.tone === "attention" || policy.tone === "progress" || policy.tone === "closed" || policy.tone === "neutral") {
    return policy.tone;
  }

  if (policy.category === "actionRequired") return "attention";
  if (policy.category === "inProgress") return "progress";
  if (policy.category === "closed") return "closed";
  return "neutral";
}

export function resolveTonePalette(theme: AppTheme, policy?: Pick<QuoteActionPolicy, "tone" | "category">): QuoteTonePalette {
  const c = theme.colors;
  const key = resolveToneKey(policy);

  if (key === "attention") {
    return {
      key,
      badgeBg: tint(c.brandPrimary, 0.1, c.bgSurfaceAlt),
      badgeBorder: tint(c.brandPrimary, 0.24, c.borderDefault),
      badgeText: c.brandPrimary,
      emphasisText: c.brandPrimary,
      iconColor: c.brandPrimary,
      iconChipBg: tint(c.brandPrimary, 0.1, c.bgSurface),
      iconChipBorder: tint(c.brandPrimary, 0.2, c.borderDefault),
      spotlightBg: tint(c.brandPrimary, 0.05, c.bgSurface),
      spotlightBorder: tint(c.brandPrimary, 0.18, c.borderDefault),
    };
  }

  if (key === "progress") {
    return {
      key,
      badgeBg: tint(c.brandAccent, 0.14, c.bgSurfaceAlt),
      badgeBorder: tint(c.brandAccent, 0.3, c.borderDefault),
      badgeText: c.brandAccent,
      emphasisText: c.textMain,
      iconColor: c.brandAccent,
      iconChipBg: tint(c.brandAccent, 0.1, c.bgSurface),
      iconChipBorder: tint(c.brandAccent, 0.22, c.borderDefault),
      spotlightBg: tint(c.brandAccent, 0.07, c.bgSurface),
      spotlightBorder: tint(c.brandAccent, 0.2, c.borderDefault),
    };
  }

  if (key === "closed") {
    return {
      key,
      badgeBg: tint(c.textMain, 0.05, c.bgSurfaceAlt),
      badgeBorder: tint(c.textMain, 0.14, c.borderDefault),
      badgeText: c.textSub,
      emphasisText: c.textMain,
      iconColor: c.textSub,
      iconChipBg: tint(c.textMain, 0.04, c.bgSurface),
      iconChipBorder: tint(c.textMain, 0.12, c.borderDefault),
      spotlightBg: tint(c.textMain, 0.02, c.bgSurface),
      spotlightBorder: tint(c.textMain, 0.1, c.borderDefault),
    };
  }

  return {
    key: "neutral",
    badgeBg: tint(c.semanticInfo, 0.08, c.bgSurfaceAlt),
    badgeBorder: tint(c.semanticInfo, 0.2, c.borderDefault),
    badgeText: c.semanticInfo,
    emphasisText: c.textMain,
    iconColor: c.semanticInfo,
    iconChipBg: tint(c.semanticInfo, 0.08, c.bgSurface),
    iconChipBorder: tint(c.semanticInfo, 0.18, c.borderDefault),
    spotlightBg: tint(c.semanticInfo, 0.05, c.bgSurface),
    spotlightBorder: tint(c.semanticInfo, 0.16, c.borderDefault),
  };
}
