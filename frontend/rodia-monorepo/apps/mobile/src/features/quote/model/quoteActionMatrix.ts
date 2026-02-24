// features/quote/model/quoteActionMatrix.ts
import type { QuoteStatusApi } from "@/entities/quote/model/quote.types";
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

export const DEFAULT_QUOTE_ACTION_POLICY: QuoteActionPolicy = {
  category: "inProgress",
  tone: "neutral",
  stageOrder: 50,
  badgeLabel: DEFAULT_STATUS_LABEL,
  ctaLabel: "상세 보기",
  listCtaKind: "nav",
  detailTop: { title: "진행 상태를 확인해주세요" },
  highlightCard: { type: "none", quickActions: [] },
  bottomBar: null,
};

export const QUOTE_ACTION_MATRIX: Record<QuoteStatusApi, QuoteActionPolicy> = {
  OPEN: {
    category: "inProgress",
    tone: "neutral",
    stageOrder: 10,
    badgeLabel: "요청 접수",
    ctaLabel: "상세 보기",
    listCtaKind: "nav",
    detailTop: {
      title: "요청이 접수되었습니다",
      subtitle: "배차 가능한 기사님을 확인 중입니다.",
    },
    highlightCard: { type: "progressInfo", quickActions: [] },
    bottomBar: { primary: "cancelRequest" },
    guards: { confirmPrimary: true },
  },
  NEGOTIATING: {
    category: "actionRequired",
    tone: "attention",
    stageOrder: 5,
    badgeLabel: "협의 필요",
    ctaLabel: "제안 확인",
    listCtaKind: "action",
    detailTop: {
      title: "운임 제안이 도착했습니다",
      subtitle: "수락 또는 거절을 선택할 수 있습니다.",
    },
    highlightCard: { type: "priceCompare", quickActions: [] },
    bottomBar: { primary: "acceptOffer", secondary: "rejectOffer" },
    guards: { confirmPrimary: true, confirmSecondary: true },
  },
  ASSIGNED: {
    category: "actionRequired",
    tone: "attention",
    stageOrder: 15,
    badgeLabel: "결제 필요",
    ctaLabel: "결제하기",
    listCtaKind: "action",
    detailTop: {
      title: "배차가 완료되었습니다",
      subtitle: "결제를 완료하면 운송이 시작됩니다.",
    },
    highlightCard: { type: "driverProfile", quickActions: ["callDriver"] },
    bottomBar: { primary: "pay", secondary: "cancelRequest" },
    guards: { confirmSecondary: true },
  },
  PICKUP: {
    category: "inProgress",
    tone: "progress",
    stageOrder: 20,
    badgeLabel: "상차 중",
    ctaLabel: "상차 현황",
    listCtaKind: "nav",
    detailTop: {
      title: "상차가 진행 중입니다",
      subtitle: "현장 사진과 기사님 연락 기능을 확인할 수 있습니다.",
    },
    highlightCard: { type: "miniMap", quickActions: ["viewPickupPhotos", "callDriver"] },
    bottomBar: null,
  },
  TRANSIT: {
    category: "inProgress",
    tone: "progress",
    stageOrder: 30,
    badgeLabel: "운송 중",
    ctaLabel: "위치 확인",
    listCtaKind: "nav",
    detailTop: {
      title: "화물이 이동 중입니다",
      subtitle: "실시간 위치와 이동 상태를 확인할 수 있습니다.",
    },
    highlightCard: { type: "miniMap", quickActions: ["viewLiveLocation", "callDriver"] },
    bottomBar: null,
  },
  DROPOFF: {
    category: "closed",
    tone: "closed",
    stageOrder: 90,
    badgeLabel: "운송 완료",
    ctaLabel: "운임 확인",
    listCtaKind: "price",
    detailTop: {
      title: "운송이 완료되었습니다",
      subtitle: "인수증을 확인할 수 있습니다.",
    },
    highlightCard: { type: "proof", quickActions: ["viewPOD"] },
    bottomBar: { primary: "reRequestRoute" },
  },
  CANCELED: {
    category: "closed",
    tone: "closed",
    stageOrder: 99,
    badgeLabel: "요청 취소",
    ctaLabel: "다시 요청",
    listCtaKind: "nav",
    detailTop: {
      title: "요청이 취소되었습니다",
      subtitle: "같은 경로로 다시 요청할 수 있습니다.",
    },
    highlightCard: { type: "none", quickActions: [] },
    bottomBar: { primary: "reRequestRoute" },
  },
};

export function getQuoteActionPolicy(status: QuoteStatusApi | string): QuoteActionPolicy {
  const policy = (QUOTE_ACTION_MATRIX as Record<string, QuoteActionPolicy>)[status];
  return policy ?? DEFAULT_QUOTE_ACTION_POLICY;
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
