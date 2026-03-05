import React from "react";
import { Alert, Image, InteractionManager, LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  cancelShipperMatch,
  createShipperMatch,
  getShipperMatchTracking,
  listMyShipperMatches,
  type ShipperMatchItem,
  type ShipperTrackingSnapshot,
} from "@/features/matching/api";
import {
  acceptShipperCounterOffer,
  isCounterOfferPending,
  listShipperCounterOffers,
  rejectShipperCounterOffer,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import {
  confirmShipperPayment,
  getMatchPaymentSnapshot,
  hasCompletedPaymentForMatch,
  prepareShipperPayment,
  type PrepareShipperPaymentResult,
} from "@/features/payment/api/payment-api";
import { TossPaymentModal } from "@/features/payment/ui/TossPaymentModal";
import { deleteShipperQuote } from "@/features/quote/api";
import {
  getQuoteActionPolicyByUiState,
  resolveTonePalette,
  type DecisionActionId,
} from "@/features/quote/model/quoteActionMatrix";
import { useQuoteDetail, type QuoteActionsContext } from "@/features/quote/model/useQuoteDetail";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import { BottomActionRouter } from "@/features/quote/ui/actions/BottomActionRouter";
import { RecoRouteWebView } from "@/features/driver-reco/ui/RecoRouteWebView";
import type { NormalizedRouteStop } from "@/features/driver-reco/model/routeSummary";
import { getShipperMatchPhotos as getShipperMatchPhotosGenerated } from "@/shared/api/generated/delivery-photo-controller/delivery-photo-controller";
import type { DeliveryPhotoResponse } from "@/shared/api/generated/schemas/deliveryPhotoResponse";
import { getApiBaseUrl } from "@/shared/lib/config/env";
import { DriverVehicleInfo } from "@/features/quote/ui/DriverVehicleInfo";
import { QuoteRouteInfo } from "@/features/quote/ui/QuoteRouteInfo";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatDateTime, formatDistance, formatKrw } from "@/shared/lib/format/display";
import {
  CUSTOMER_UI_STATE,
  getCustomerUiStateFromBackendStatus,
  resolveDeliveryTimelineIndex,
  resolveEffectiveQuoteStatus,
  type CustomerUiState,
} from "@/shared/lib/policy";
import type { PaymentResponseMethod } from "@/shared/api/generated/schemas/paymentResponseMethod";
import type { PaymentResponseStatus } from "@/shared/api/generated/schemas/paymentResponseStatus";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteDetailView = ReturnType<typeof useQuoteDetail>;
type QuoteDetailQuote = QuoteDetailView["quote"];
type MatchSnapshot = { cancelableMatch: ShipperMatchItem | null; nonCanceledMatch: ShipperMatchItem | null };
type PriceSummary = { primaryLabel: string; primaryText: string; secondaryText: string };
type QuoteDecisionAction = Exclude<DecisionActionId, "cancelRequest">;
type DeliveryTimelineStep = { key: string; label: string };

const DELIVERY_TIMELINE_STEPS: readonly DeliveryTimelineStep[] = [
  { key: "ASSIGNED", label: "배차 완료" },
  { key: "PICKUP", label: "상차 완료" },
  { key: "TRANSIT", label: "운송 중" },
  { key: "DROPOFF", label: "배송 완료" },
];

const POLICY_ACTION_UI_STATES: ReadonlySet<CustomerUiState> = new Set([
  CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED,
  CUSTOMER_UI_STATE.PAYMENT_REQUIRED,
  CUSTOMER_UI_STATE.COMPLETED,
  CUSTOMER_UI_STATE.CANCELED,
]);
const FOCUS_REFETCH_THROTTLE_MS = 1500;

const EMPTY_MATCH_SNAPSHOT: MatchSnapshot = { cancelableMatch: null, nonCanceledMatch: null };

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const s = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    pageContent: { paddingTop: s * 2, paddingHorizontal: s * 5, paddingBottom: s * 6, backgroundColor: c.bgMain },
    sectionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },

    statusSection: { marginTop: s, marginBottom: s * 3, gap: s * 2 },
    statusRow: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: s * 2 },
    statusBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: s * 2, paddingVertical: s, maxWidth: "62%" },
    statusText: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    statusMeta: {
      flex: 1,
      textAlign: "right",
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    paymentMetaText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    cancelBox: { backgroundColor: c.bgSurface, borderRadius: safeNumber(theme.layout.radii.card, 16), padding: s * 3, gap: s + 2 },
    cancelRow: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: s },
    cancelIcon: { color: c.semanticWarning, fontSize: 16 },
    cancelLabel: {
      width: 56,
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    cancelValue: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },
    paymentDoneCard: {
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: tint(c.brandPrimary, 0.2, c.borderDefault),
      padding: s * 4,
      gap: s * 2,
    },
    paymentDoneHeader: { flexDirection: "row", alignItems: "center", gap: s * 2 },
    paymentDoneIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(c.brandPrimary, 0.12, c.bgSurfaceAlt),
    },
    paymentDoneIcon: { color: c.brandPrimary, fontSize: 16 },
    paymentDoneTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    paymentDoneDesc: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    deliveryDoneCard: {
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: tint(c.brandPrimary, 0.2, c.borderDefault),
      padding: s * 4,
      gap: s * 1.5,
    },
    deliveryDoneHeader: { flexDirection: "row", alignItems: "center", gap: s * 2 },
    deliveryDoneIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(c.semanticSuccess, 0.12, c.bgSurfaceAlt),
    },
    deliveryDoneIcon: {
      color: c.semanticSuccess,
      fontSize: 18,
    },
    deliveryDoneTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    deliveryDoneMeta: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    deliveryCard: {
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s * 4,
      gap: s * 3,
    },
    deliveryTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14) + 1,
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20) + 1,
      fontWeight: "900",
    },
    deliveryStepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: s + 2,
    },
    deliveryStepNode: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    deliveryStepNodeActive: {
      borderColor: c.brandPrimary,
      backgroundColor: tint(c.brandPrimary, 0.14, c.bgSurface),
    },
    deliveryStepNodeDone: {
      borderColor: c.semanticSuccess,
      backgroundColor: tint(c.semanticSuccess, 0.14, c.bgSurface),
    },
    deliveryStepNodeIdle: {
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
    },
    deliveryStepConnector: {
      flex: 1,
      height: 2,
      backgroundColor: c.borderDefault,
    },
    deliveryStepConnectorDone: {
      backgroundColor: c.semanticSuccess,
    },
    deliveryStepLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      marginTop: 6,
      textAlign: "center",
    },
    deliveryStepLabelActive: {
      color: c.brandPrimary,
      fontWeight: "900",
    },
    deliveryStepFuture: {
      opacity: 0.42,
    },
    photoGallerySection: {
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s * 4,
      gap: s * 3,
    },
    photoGroupWrap: { gap: s * 2 },
    photoGroupTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12) + 1,
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16) + 1,
      fontWeight: "900",
    },
    photoThumbRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: s * 2,
    },
    photoThumb: {
      width: 80,
      height: 80,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    photoThumbIndex: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    photoWaitText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12) + 1,
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    photoCompactHint: {
      minHeight: 22,
      justifyContent: "center",
      borderRadius: 8,
      backgroundColor: tint(c.textMain, 0.04, c.bgMain),
      paddingHorizontal: s * 2,
      paddingVertical: s,
    },
    photoCompactHintText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },

    counterOfferSection: { marginBottom: s * 3 },
    counterOfferCard: {
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: c.brandPrimary,
      padding: s * 4,
      gap: s * 2,
    },
    counterOfferHeader: { flexDirection: "row", alignItems: "center", gap: s * 2 },
    counterOfferBadge: {
      borderRadius: 999,
      paddingHorizontal: s * 2,
      paddingVertical: s,
      backgroundColor: c.brandPrimary,
    },
    counterOfferBadgeText: {
      color: c.textOnBrand,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      fontWeight: "900",
    },
    counterOfferTitle: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      fontWeight: "900",
    },
    counterOfferPrice: {
      color: c.brandPrimary,
      fontSize: safeNumber(theme.typography.scale.display.size, 30),
      lineHeight: safeNumber(theme.typography.scale.display.lineHeight, 38),
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    counterOfferPriceLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      fontWeight: "700",
      marginBottom: s / 2,
    },
    counterOfferDivider: { height: 1, backgroundColor: c.borderDefault },
    counterOfferMessageLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      fontWeight: "700",
    },
    counterOfferMessage: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      fontWeight: "700",
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
    },

    routeSection: { marginBottom: s * 3, gap: s * 2 },
    routeCard: { backgroundColor: c.bgSurface },
    routeInner: { padding: s * 4, gap: s },
    routeRow: { flexDirection: "row", alignItems: "stretch", gap: s },
    routeRail: { width: 20, alignItems: "center" },
    routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: c.borderStrong },
    routeDotOrigin: { backgroundColor: c.textMain },
    routeDotWaypoint: { backgroundColor: c.brandPrimary },
    routeDotDestination: { backgroundColor: c.semanticSuccess },
    routeLine: { width: 2, flex: 1, marginTop: 4, backgroundColor: tint(c.textMain, 0.12, c.borderDefault) },
    routeBody: { flex: 1, paddingBottom: s * 2 },
    routeNodeTitle: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    routeAddress: { color: c.textMain, fontSize: 17, lineHeight: 24, fontWeight: "900", marginTop: 2 },
    routeWaypointCaption: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      marginTop: 2,
    },

    summarySection: { marginBottom: s * 3, gap: s * 2 },
    summaryCard: { borderWidth: 1 },
    summaryInner: { padding: s * 4, gap: s * 2 },
    summaryTop: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: s + 2 },
    summaryChip: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    summaryEyebrow: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
    },
    summaryRow: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: s },
    summaryLeft: { flexDirection: "row", alignItems: "center", gap: s, flex: 1 },
    summaryIcon: { color: c.textSub, fontSize: 14 },
    summaryLabel: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    summaryValue: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    summaryDivider: { height: 1, backgroundColor: tint(c.textMain, 0.06, c.borderDefault) },
    priceWrap: { marginTop: s, gap: s },
    priceLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    priceMain: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.display.size, 30),
      lineHeight: safeNumber(theme.typography.scale.display.lineHeight, 38),
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    priceSecondary: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },

    detailSection: { marginBottom: s * 3 },
    accordionHeader: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: s * 3,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    accordionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    accordionRight: { flexDirection: "row", alignItems: "center", gap: s / 2 },
    accordionState: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    accordionChevron: { color: c.textMuted, fontSize: 16 },
    archiveUnifiedCard: {
      backgroundColor: c.bgSurface,
      padding: s * 3,
    },
    archiveSectionTitle: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
      letterSpacing: 0.3,
      marginBottom: s,
      marginTop: s,
    },
    archiveSectionDivider: {
      height: 1,
      backgroundColor: tint(c.textMain, 0.08, c.borderDefault),
      marginVertical: s * 1.5,
    },
    archiveRow: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: s * 2,
      paddingVertical: s * 0.75,
      borderBottomWidth: 1,
      borderBottomColor: tint(c.textMain, 0.06, c.borderDefault),
    },
    archiveRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    archiveLabelWrap: { width: "40%" },
    archiveLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    archiveValue: {
      flex: 1,
      textAlign: "right",
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },
    archiveGrid: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: s * 2,
      paddingVertical: s * 0.75,
      borderBottomWidth: 1,
      borderBottomColor: tint(c.textMain, 0.06, c.borderDefault),
    },
    archiveGridLast: { borderBottomWidth: 0, paddingBottom: 0 },
    archiveGridCell: { flex: 1, gap: 2 },
    archiveGridCellRight: {
      borderLeftWidth: 1,
      borderLeftColor: tint(c.textMain, 0.06, c.borderDefault),
      paddingLeft: s * 2,
    },
    archiveGridLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    archiveGridValue: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "800",
    },

    bottomBar: {
      backgroundColor: c.bgSurface,
      paddingHorizontal: s * 5,
      paddingTop: s * 2,
      borderTopLeftRadius: safeNumber(theme.layout.radii.card, 16),
      borderTopRightRadius: safeNumber(theme.layout.radii.card, 16),
      shadowColor: c.textMain,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 14,
    },
    bottomPlaceholder: {
      minHeight: 46,
      borderRadius: safeNumber(theme.layout.radii.card, 12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(c.textMain, 0.04, c.bgMain),
    },
    bottomPlaceholderText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    bottomButton: { minHeight: 48 },
  });
});

function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parsePositiveIntParam(value: string | string[] | undefined): number {
  return parsePositiveInt(readRouteParamText(value));
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function withAbsoluteApiUrl(pathOrUrl: unknown): string {
  const raw = toText(pathOrUrl);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${getApiBaseUrl().replace(/\/+$/, "")}${normalizedPath}`;
}

function resolvePhotoTypeToken(value: unknown): "PICKUP" | "DELIVERY" | "" {
  const token = toStatusToken(value);
  if (token === "PICKUP") return "PICKUP";
  if (token === "DELIVERY") return "DELIVERY";
  return "";
}

function toShipperPhotoUrisByType(photos: DeliveryPhotoResponse[]): {
  pickup: string[];
  delivery: string[];
} {
  const pickup: string[] = [];
  const delivery: string[] = [];
  photos.forEach((photo) => {
    const uri = withAbsoluteApiUrl(photo.fileUrl);
    if (!uri) return;
    const type = resolvePhotoTypeToken(photo.type);
    if (type === "PICKUP") {
      pickup.push(uri);
      return;
    }
    if (type === "DELIVERY") {
      delivery.push(uri);
    }
  });
  return { pickup, delivery };
}

function toDisplayText(value: unknown): string {
  const text = toText(value);
  return text || "-";
}

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function toPaymentStatusLabel(value: PaymentResponseStatus | null): string {
  if (value === "PENDING") return "결제 대기";
  if (value === "COMPLETED") return "결제 완료";
  if (value === "FAILED") return "결제 실패";
  if (value === "REFUNDED") return "환불 완료";
  return "상태 확인";
}

function toPaymentMethodLabel(value: PaymentResponseMethod | null): string {
  if (value === "CARD") return "카드";
  if (value === "TRANSFER") return "계좌이체";
  if (value === "PREPAID") return "선불";
  return "";
}

function toPositiveAmount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function resolvePriceSummary(quote: QuoteDetailQuote): PriceSummary {
  const uiState = getCustomerUiStateFromBackendStatus(toText(quote.status));
  const desired = toPositiveAmount(quote.desiredPrice);
  const finalPrice = toPositiveAmount(quote.finalPrice);
  const estimated = toPositiveAmount(quote.basePrice) + toPositiveAmount(quote.distancePrice) + toPositiveAmount(quote.extraPrice);
  // 결제 금액(source of truth)과 화면 금액을 일치시킨다.
  const estimatedAmount = finalPrice > 0 ? finalPrice : estimated;
  const isCompleted = uiState === CUSTOMER_UI_STATE.COMPLETED;

  if (isCompleted && finalPrice > 0) {
    return {
      primaryLabel: "정산 금액",
      primaryText: formatKrw(finalPrice),
      secondaryText: desired > 0 ? `희망 운임 ${formatKrw(desired)}` : "",
    };
  }

  if (desired > 0) {
    return {
      primaryLabel: "희망 운임",
      primaryText: formatKrw(desired),
      secondaryText: estimatedAmount > 0 ? `예상 금액 ${formatKrw(estimatedAmount)}` : "",
    };
  }

  return {
    primaryLabel: "예상 금액",
    primaryText: formatKrw(estimatedAmount),
    secondaryText: "",
  };
}

function getPostPaymentSummary(status: string): { title: string; description: string } {
  const token = toStatusToken(status);
  if (token === "PREPARING") {
    return {
      title: "결제 완료",
      description: "결제가 완료되었고 기사님이 상차를 준비 중입니다.",
    };
  }
  if (token === "PICKUP") {
    return {
      title: "결제 완료",
      description: "결제가 완료되었고 기사님이 상차를 준비 중입니다.",
    };
  }
  if (token === "TRANSIT" || token === "DRIVING" || token === "IN_TRANSIT") {
    return {
      title: "결제 완료",
      description: "결제가 완료되었고 화물이 운송 중입니다.",
    };
  }
  return {
    title: "결제 완료",
    description: "결제가 완료되었고 운송 절차가 마무리되었습니다.",
  };
}

function isCanceledMatchStatus(value: unknown): boolean {
  const token = toStatusToken(value);
  return token === "CANCELLED" || token === "CANCELED" || token === "CANCEL";
}

function shouldRequirePaymentAfterCounterOfferAccept(
  value:
    | {
        paymentRequired?: unknown;
        nextAction?: unknown;
        quoteStatus?: unknown;
        matchStatus?: unknown;
      }
    | null
    | undefined
): boolean {
  if (value?.paymentRequired === true) return true;

  const nextAction = toStatusToken(value?.nextAction);
  if (nextAction === "PAY" || nextAction === "PAYMENT_REQUIRED") return true;

  const status = toStatusToken(value?.matchStatus ?? value?.quoteStatus);
  return status === "ASSIGNED" || status === "ACCEPTED" || status === "READY" || status === "MATCHED";
}

function buildOptimisticAcceptedMatch(matchId: number, quoteId: number, statusSource: unknown): ShipperMatchItem {
  const safeMatchId = parsePositiveInt(matchId);
  const safeQuoteId = parsePositiveInt(quoteId);
  const status = toStatusToken(statusSource) || "ASSIGNED";
  const nowIso = new Date().toISOString();

  return {
    matchId: safeMatchId,
    ...(safeQuoteId > 0 ? { quoteId: safeQuoteId } : {}),
    accepted: true,
    acceptedAt: nowIso,
    status,
    state: status,
    updatedAt: nowIso,
    cancelable: !isCanceledMatchStatus(status),
  };
}

function toUpdatedAtTime(value: unknown): number {
  const raw = toText(value);
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveMatchSnapshotForQuote(matches: unknown, quoteId: number): MatchSnapshot {
  const safeQuoteId = parsePositiveInt(quoteId);
  if (safeQuoteId <= 0) return EMPTY_MATCH_SNAPSHOT;
  const safeMatches = Array.isArray(matches) ? matches : [];
  let cancelableMatch: ShipperMatchItem | null = null;
  let cancelableUpdatedAt = -1;
  let nonCanceledMatch: ShipperMatchItem | null = null;
  let nonCanceledUpdatedAt = -1;
  for (const match of safeMatches as ShipperMatchItem[]) {
    const matchQuoteId = parsePositiveInt((match as { quoteId?: unknown }).quoteId);
    if (matchQuoteId !== safeQuoteId) continue;
    const updatedAt = toUpdatedAtTime((match as { updatedAt?: unknown }).updatedAt);
    const canceled = isCanceledMatchStatus((match as { status?: unknown; state?: unknown }).status ?? (match as { state?: unknown }).state);
    const cancelable = (match as { cancelable?: unknown }).cancelable === true;
    if (!canceled && cancelable && updatedAt >= cancelableUpdatedAt) {
      cancelableMatch = match;
      cancelableUpdatedAt = updatedAt;
    }
    if (!canceled && updatedAt >= nonCanceledUpdatedAt) {
      nonCanceledMatch = match;
      nonCanceledUpdatedAt = updatedAt;
    }
  }
  return { cancelableMatch, nonCanceledMatch };
}

type SpecRow = QuoteDetailView["specificationArchive"][number]["rows"][number];
type RowGroup = { kind: "single"; row: SpecRow } | { kind: "pair"; left: SpecRow; right: SpecRow };

function groupRows(rows: SpecRow[]): RowGroup[] {
  const groups: RowGroup[] = [];
  let i = 0;
  while (i < rows.length) {
    const curr = rows[i];
    const next = rows[i + 1];
    if (curr.twoCol && next?.twoCol) {
      groups.push({ kind: "pair", left: curr, right: next });
      i += 2;
    } else {
      groups.push({ kind: "single", row: curr });
      i += 1;
    }
  }
  return groups;
}

function buildShipperTrackingStops(
  quote: QuoteDetailQuote,
  tracking: ShipperTrackingSnapshot | null
): NormalizedRouteStop[] {
  const stops: NormalizedRouteStop[] = [];
  const originLat = Number(quote.originLat);
  const originLng = Number(quote.originLng);
  const destinationLat = Number(quote.destinationLat);
  const destinationLng = Number(quote.destinationLng);
  const currentLat = Number(tracking?.currentLocation?.lat);
  const currentLng = Number(tracking?.currentLocation?.lng);

  if (Number.isFinite(originLat) && Number.isFinite(originLng)) {
    stops.push({
      name: toText(quote.originAddress) || "출발지",
      lat: originLat,
      lng: originLng,
      type: "pickup",
    });
  }
  if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
    stops.push({
      name: "기사 현재 위치",
      lat: currentLat,
      lng: currentLng,
      type: "waypoint",
    });
  }
  if (Number.isFinite(destinationLat) && Number.isFinite(destinationLng)) {
    stops.push({
      name: toText(quote.destinationAddress) || "도착지",
      lat: destinationLat,
      lng: destinationLng,
      type: "dropoff",
    });
  }
  return stops.length >= 2 ? stops : [];
}

function CounterOfferCard({ offer }: { offer: CounterOfferItem }) {
  const styles = useStyles();
  return (
    <View style={styles.counterOfferSection}>
      <AppCard elevated={false} style={styles.counterOfferCard}>
        <View style={styles.counterOfferHeader}>
          <View style={styles.counterOfferBadge}>
            <AppText style={styles.counterOfferBadgeText}>기사 역제안</AppText>
          </View>
          <AppText style={styles.counterOfferTitle}>기사가 운임을 제안했습니다</AppText>
        </View>
        <View>
          <AppText style={styles.counterOfferPriceLabel}>제안 금액</AppText>
          <AppText style={styles.counterOfferPrice}>{formatKrw(offer.proposedPrice)}</AppText>
        </View>
        {offer.message ? (
          <>
            <View style={styles.counterOfferDivider} />
            <View>
              <AppText style={styles.counterOfferMessageLabel}>제안 사유</AppText>
              <AppText style={styles.counterOfferMessage}>{offer.message}</AppText>
            </View>
          </>
        ) : null}
      </AppCard>
    </View>
  );
}

function SummaryCard({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const theme = useAppTheme();
  const palette = resolveTonePalette(theme, view.policy);
  const distanceText = formatDistance(view.quote.distanceKm);
  const loadText = toDisplayText(formatWorkMethodLabel(view.quote.loadMethod));
  const unloadText = toDisplayText(formatWorkMethodLabel(view.quote.unloadMethod));
  const price = React.useMemo(
    () => resolvePriceSummary(view.quote),
    [view.quote.basePrice, view.quote.desiredPrice, view.quote.distancePrice, view.quote.extraPrice, view.quote.finalPrice, view.quote.status]
  );
  return (
    <View style={styles.summarySection}>
      <AppCard elevated={false} style={[styles.summaryCard, { borderColor: palette.spotlightBorder, backgroundColor: palette.spotlightBg }]}>
        <View style={styles.summaryInner}>
          <View style={styles.summaryTop}>
            <View style={[styles.summaryChip, { backgroundColor: palette.iconChipBg, borderColor: palette.iconChipBorder }]}>
              <Ionicons name="information-circle-outline" style={[styles.summaryIcon, { color: palette.iconColor }]} />
            </View>
            <AppText style={[styles.summaryEyebrow, { color: palette.badgeText }]}>운송 요약</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="git-network-outline" style={styles.summaryIcon} />
              <AppText style={styles.summaryLabel}>운송 거리</AppText>
            </View>
            <AppText style={styles.summaryValue}>{distanceText}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="cube-outline" style={styles.summaryIcon} />
              <AppText style={styles.summaryLabel}>상차 방식</AppText>
            </View>
            <AppText style={styles.summaryValue}>{loadText}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="exit-outline" style={styles.summaryIcon} />
              <AppText style={styles.summaryLabel}>하차 방식</AppText>
            </View>
            <AppText style={styles.summaryValue}>{unloadText}</AppText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.priceWrap}>
            {price.primaryLabel ? <AppText style={styles.priceLabel}>{price.primaryLabel}</AppText> : null}
            <AppText style={[styles.priceMain, { color: palette.emphasisText }]}>{price.primaryText}</AppText>
            {price.secondaryText ? <AppText style={styles.priceSecondary}>{price.secondaryText}</AppText> : null}
          </View>
        </View>
      </AppCard>
    </View>
  );
}

function SpecificationArchive({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  if (view.specificationArchive.length === 0) return null;

  return (
    <View style={styles.detailSection}>
      <Pressable onPress={toggle} style={styles.accordionHeader}>
        <AppText style={styles.accordionTitle}>요청 상세 정보</AppText>
        <View style={styles.accordionRight}>
          <AppText style={styles.accordionState}>{open ? "접기" : "보기"}</AppText>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} style={styles.accordionChevron} />
        </View>
      </Pressable>
      {open ? (
        <AppCard elevated={false} style={styles.archiveUnifiedCard}>
          {view.specificationArchive.map((section, sIdx) => {
            const isLastSection = sIdx === view.specificationArchive.length - 1;
            const groups = groupRows(section.rows);
            return (
              <View key={section.title}>
                <AppText style={styles.archiveSectionTitle}>{section.title}</AppText>
                {groups.map((group, gIdx) => {
                  const isLastGroup = gIdx === groups.length - 1;
                  if (group.kind === "pair") {
                    return (
                      <View
                        key={`${group.left.label}-${group.right.label}`}
                        style={[styles.archiveGrid, isLastGroup ? styles.archiveGridLast : null]}
                      >
                        <View style={styles.archiveGridCell}>
                          <AppText style={styles.archiveGridLabel}>{group.left.label}</AppText>
                          <AppText style={styles.archiveGridValue}>{group.left.value}</AppText>
                        </View>
                        <View style={[styles.archiveGridCell, styles.archiveGridCellRight]}>
                          <AppText style={styles.archiveGridLabel}>{group.right.label}</AppText>
                          <AppText style={styles.archiveGridValue}>{group.right.value}</AppText>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View
                      key={group.row.label}
                      style={[styles.archiveRow, isLastGroup ? styles.archiveRowLast : null]}
                    >
                      <View style={styles.archiveLabelWrap}>
                        <AppText style={styles.archiveLabel}>{group.row.label}</AppText>
                      </View>
                      <AppText style={styles.archiveValue}>{group.row.value}</AppText>
                    </View>
                  );
                })}
                {!isLastSection ? <View style={styles.archiveSectionDivider} /> : null}
              </View>
            );
          })}
        </AppCard>
      ) : null}
    </View>
  );
}

function PhotoThumbShipper({
  uri,
  index,
  styles,
  theme,
}: {
  uri: string;
  index: number;
  styles: ReturnType<typeof useStyles>;
  theme: ReturnType<typeof useAppTheme>;
}) {
  const [failed, setFailed] = React.useState(false);
  if (!failed && uri.startsWith("http")) {
    return (
      <Image
        source={{ uri }}
        style={[styles.photoThumb, { overflow: "hidden" }]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={styles.photoThumb}>
      <Ionicons name="image-outline" size={20} color={theme.colors.brandPrimary} />
      <AppText style={styles.photoThumbIndex}>#{index + 1}</AppText>
    </View>
  );
}

export default function QuoteDetailPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; action?: string | string[] }>();

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isMatchSubmitting, setIsMatchSubmitting] = React.useState(false);
  const [isPaying, setIsPaying] = React.useState(false);
  const [hasCompletedPayment, setHasCompletedPayment] = React.useState(false);
  const [paidMatchId, setPaidMatchId] = React.useState(0);
  const [latestPaymentStatus, setLatestPaymentStatus] = React.useState<PaymentResponseStatus | null>(null);
  const [latestPaymentMethod, setLatestPaymentMethod] = React.useState<PaymentResponseMethod | null>(null);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [pendingPaymentRequest, setPendingPaymentRequest] = React.useState<PrepareShipperPaymentResult | null>(null);
  const [forcePaymentRequired, setForcePaymentRequired] = React.useState(false);
  const [matchSnapshot, setMatchSnapshot] = React.useState<MatchSnapshot>(EMPTY_MATCH_SNAPSHOT);
  const [matchHydrated, setMatchHydrated] = React.useState(false);
  const [bottomBarHeight, setBottomBarHeight] = React.useState(140);
  const [pendingCounterOffer, setPendingCounterOffer] = React.useState<CounterOfferItem | null>(null);
  const [trackingSnapshot, setTrackingSnapshot] = React.useState<ShipperTrackingSnapshot | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = React.useState(false);
  const [trackingErrorMessage, setTrackingErrorMessage] = React.useState<string | null>(null);
  const [shipperPhotos, setShipperPhotos] = React.useState<DeliveryPhotoResponse[]>([]);
  const [isNavigatingReceipt, setIsNavigatingReceipt] = React.useState(false);
  const [isProgressRefreshing, setIsProgressRefreshing] = React.useState(false);
  const matchLoadTokenRef = React.useRef(0);
  const focusRefetchMetaRef = React.useRef({ hasFocusedOnce: false, lastRefetchAt: 0 });
  const refreshInFlightRef = React.useRef<Promise<void> | null>(null);
  const receiptNavUnlockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const quoteIdentifier = readRouteParamText(params.id);
  const routeQuoteId = parsePositiveIntParam(params.id);
  const view = useQuoteDetail(quoteIdentifier);
  const actionQuoteId = React.useMemo(() => {
    const fromView = parsePositiveInt(view.quote.quoteId);
    return fromView > 0 ? fromView : routeQuoteId;
  }, [routeQuoteId, view.quote.quoteId]);

  const isBlockedByFetchState = view.isLoading || Boolean(view.errorMessage);
  const activeQuoteMatch = React.useMemo(
    () => matchSnapshot.cancelableMatch ?? matchSnapshot.nonCanceledMatch ?? null,
    [matchSnapshot.cancelableMatch, matchSnapshot.nonCanceledMatch]
  );
  const activeMatchWithPhotos = activeQuoteMatch as (ShipperMatchItem & {
    loadingPhotos?: string[];
    unloadingPhotos?: string[];
  }) | null;
  const legacyLoadingPhotos = React.useMemo(
    () => (Array.isArray(activeMatchWithPhotos?.loadingPhotos) ? activeMatchWithPhotos.loadingPhotos : []),
    [activeMatchWithPhotos?.loadingPhotos]
  );
  const legacyUnloadingPhotos = React.useMemo(
    () => (Array.isArray(activeMatchWithPhotos?.unloadingPhotos) ? activeMatchWithPhotos.unloadingPhotos : []),
    [activeMatchWithPhotos?.unloadingPhotos]
  );
  const loadingPhotos = React.useMemo(() => {
    const byType = toShipperPhotoUrisByType(shipperPhotos);
    return byType.pickup.length > 0 ? byType.pickup : legacyLoadingPhotos;
  }, [legacyLoadingPhotos, shipperPhotos]);
  const unloadingPhotos = React.useMemo(() => {
    const byType = toShipperPhotoUrisByType(shipperPhotos);
    return byType.delivery.length > 0 ? byType.delivery : legacyUnloadingPhotos;
  }, [legacyUnloadingPhotos, shipperPhotos]);
  const hasActiveQuoteMatch = Boolean(activeQuoteMatch);
  const cancelTargetMatchId = React.useMemo(() => parsePositiveInt(activeQuoteMatch?.matchId), [activeQuoteMatch?.matchId]);
  const isCancelIdInvalid = hasActiveQuoteMatch && cancelTargetMatchId <= 0;
  const routeAction = readRouteParamText(params.action).toUpperCase();
  const isRoutePayRequested = routeAction === "PAY";
  const hasPendingCounterOffer = React.useMemo(
    () => Boolean(pendingCounterOffer && isCounterOfferPending(pendingCounterOffer.status)),
    [pendingCounterOffer]
  );
  const isAcceptedByMatch = React.useMemo(() => {
    if (!activeQuoteMatch) return false;
    if (activeQuoteMatch.accepted === true) return true;
    return toText(activeQuoteMatch.acceptedAt).length > 0;
  }, [activeQuoteMatch]);
  const hasLocallyCompletedPaymentForActiveMatch = React.useMemo(
    () => paidMatchId > 0 && cancelTargetMatchId > 0 && paidMatchId === cancelTargetMatchId,
    [cancelTargetMatchId, paidMatchId]
  );

  const effectiveQuoteStatus = React.useMemo(() => {
    const matchStatus = matchHydrated ? activeQuoteMatch?.status ?? activeQuoteMatch?.state : null;
    const matchAccepted = matchHydrated ? isAcceptedByMatch : null;
    const paymentStatusForResolver = hasCompletedPayment || hasLocallyCompletedPaymentForActiveMatch ? "COMPLETED" : latestPaymentStatus;
    return resolveEffectiveQuoteStatus({
      quoteStatus: view.quote.status,
      matchStatus,
      matchAccepted,
      paymentStatus: paymentStatusForResolver,
    });
  }, [activeQuoteMatch?.state, activeQuoteMatch?.status, hasCompletedPayment, hasLocallyCompletedPaymentForActiveMatch, isAcceptedByMatch, latestPaymentStatus, matchHydrated, view.quote.status]);

  const shouldForcePaymentRequired = React.useMemo(() => {
    if (hasPendingCounterOffer) return false;
    if (hasLocallyCompletedPaymentForActiveMatch || hasCompletedPayment || latestPaymentStatus === "COMPLETED") return false;
    if (!isAcceptedByMatch) return false;

    const hasExplicitPayIntent = forcePaymentRequired || isRoutePayRequested;
    if (!hasExplicitPayIntent) return false;

    const uiState = getCustomerUiStateFromBackendStatus(effectiveQuoteStatus);
    return uiState === CUSTOMER_UI_STATE.PAYMENT_REQUIRED || uiState === CUSTOMER_UI_STATE.REQUESTED || uiState === CUSTOMER_UI_STATE.UNKNOWN;
  }, [effectiveQuoteStatus, forcePaymentRequired, hasCompletedPayment, hasLocallyCompletedPaymentForActiveMatch, hasPendingCounterOffer, isAcceptedByMatch, isRoutePayRequested, latestPaymentStatus]);
  const statusUiState = React.useMemo(() => getCustomerUiStateFromBackendStatus(effectiveQuoteStatus), [effectiveQuoteStatus]);
  const actionUiState = React.useMemo(
    () =>
      shouldForcePaymentRequired
        ? CUSTOMER_UI_STATE.PAYMENT_REQUIRED
        : hasPendingCounterOffer
          ? CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED
          : statusUiState,
    [hasPendingCounterOffer, shouldForcePaymentRequired, statusUiState]
  );
  const statusPolicy = React.useMemo(() => getQuoteActionPolicyByUiState(actionUiState), [actionUiState]);
  const actionPolicy = statusPolicy;
  const effectiveActionsContext = React.useMemo(
    () => ({ ...view.actionsContext, status: effectiveQuoteStatus }),
    [effectiveQuoteStatus, view.actionsContext]
  );

  const postPaymentSummary = React.useMemo(() => getPostPaymentSummary(effectiveQuoteStatus), [effectiveQuoteStatus]);
  const deliveryTimelineIndex = React.useMemo(() => resolveDeliveryTimelineIndex(effectiveQuoteStatus), [effectiveQuoteStatus]);
  const isPickupInProgress = statusUiState === CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS;
  const isTransitInProgress = statusUiState === CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS;
  const isCompletedStatus = statusUiState === CUSTOMER_UI_STATE.COMPLETED;
  const shouldShowDeliveryTimeline = isPickupInProgress || isTransitInProgress;
  const shouldShowPostPaymentSummary = shouldShowDeliveryTimeline || isCompletedStatus;
  const canShowTrackingCard = (isPickupInProgress || isTransitInProgress) && cancelTargetMatchId > 0;

  const loadShipperTracking = React.useCallback(
    async (targetMatchId: number) => {
      const safeMatchId = parsePositiveInt(targetMatchId);
      if (safeMatchId <= 0) {
        setTrackingSnapshot(null);
        setTrackingErrorMessage(null);
        return;
      }
      try {
        setIsTrackingLoading(true);
        setTrackingErrorMessage(null);
        const snapshot = await getShipperMatchTracking(safeMatchId);
        setTrackingSnapshot(snapshot);
      } catch (error) {
        setTrackingSnapshot(null);
        setTrackingErrorMessage(readApiErrorMessage(error, "기사 위치를 불러오지 못했습니다."));
      } finally {
        setIsTrackingLoading(false);
      }
    },
    []
  );

  const loadShipperPhotos = React.useCallback(async (targetMatchId: number) => {
    const safeMatchId = parsePositiveInt(targetMatchId);
    if (safeMatchId <= 0) {
      setShipperPhotos([]);
      return;
    }
    try {
      const photos = await getShipperMatchPhotosGenerated(safeMatchId);
      setShipperPhotos(Array.isArray(photos) ? photos : []);
    } catch {
      setShipperPhotos([]);
    }
  }, []);

  React.useEffect(() => {
    if (isRoutePayRequested) {
      setForcePaymentRequired(true);
    }
  }, [isRoutePayRequested]);

  React.useEffect(() => {
    if (
      statusUiState === CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS ||
      statusUiState === CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS ||
      statusUiState === CUSTOMER_UI_STATE.COMPLETED ||
      statusUiState === CUSTOMER_UI_STATE.CANCELED
    ) {
      setForcePaymentRequired(false);
    }
  }, [statusUiState]);

  React.useEffect(() => {
    if (actionQuoteId <= 0) {
      setHasCompletedPayment(false);
      setPaidMatchId(0);
      setLatestPaymentStatus(null);
      setLatestPaymentMethod(null);
      setShipperPhotos([]);
    }
  }, [actionQuoteId]);

  const palette = resolveTonePalette(theme, statusPolicy);
  const effectiveStatusLabel = statusPolicy.badgeLabel;

  const loadMatchSnapshot = React.useCallback(async (targetQuoteId: number): Promise<MatchSnapshot> => {
    const safeQuoteId = parsePositiveInt(targetQuoteId);
    if (safeQuoteId <= 0) {
      setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
      return EMPTY_MATCH_SNAPSHOT;
    }
    try {
      const matches = await listMyShipperMatches();
      const snapshot = resolveMatchSnapshotForQuote(matches, safeQuoteId);
      setMatchSnapshot(snapshot);
      return snapshot;
    } catch {
      setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
      return EMPTY_MATCH_SNAPSHOT;
    }
  }, []);

  const loadPendingCounterOffer = React.useCallback(async (targetQuoteId: number) => {
    const safeQuoteId = parsePositiveInt(targetQuoteId);
    if (safeQuoteId <= 0) {
      setPendingCounterOffer(null);
      return;
    }
    try {
      const offers = await listShipperCounterOffers(safeQuoteId);
      const pending = offers.find((o) => isCounterOfferPending(o.status)) ?? null;
      setPendingCounterOffer(pending);
    } catch {
      setPendingCounterOffer(null);
    }
  }, []);

  const loadPaymentCompletion = React.useCallback(async (targetMatchId: number) => {
    const safeMatchId = parsePositiveInt(targetMatchId);
    if (safeMatchId <= 0) {
      setHasCompletedPayment(false);
      setLatestPaymentStatus(null);
      setLatestPaymentMethod(null);
      return;
    }
    try {
      const snapshot = await getMatchPaymentSnapshot(safeMatchId);
      setLatestPaymentStatus(snapshot.effectiveStatus ?? null);
      setLatestPaymentMethod(snapshot.effectiveMethod ?? null);
      setHasCompletedPayment(snapshot.hasCompleted);
      if (snapshot.hasCompleted) {
        setPaidMatchId(safeMatchId);
      }
      if (!snapshot.hasCompleted) {
        const completed = await hasCompletedPaymentForMatch(safeMatchId);
        if (completed) {
          setHasCompletedPayment(true);
          setLatestPaymentStatus("COMPLETED");
          setPaidMatchId(safeMatchId);
        }
      }
    } catch {
      // keep current local state on transient API error
    }
  }, []);

  const refreshQuoteAndMatchData = React.useCallback(async () => {
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const task = (async () => {
      const quoteRefetchTask = view.refetch();
      const tasks: Array<Promise<unknown>> = [];
      if (actionQuoteId > 0) {
        const snapshot = await loadMatchSnapshot(actionQuoteId);
        tasks.push(loadPendingCounterOffer(actionQuoteId));
        const activeMatchId = parsePositiveInt(
          (snapshot.cancelableMatch ?? snapshot.nonCanceledMatch)?.matchId
        );
        if (activeMatchId > 0) {
          tasks.push(loadPaymentCompletion(activeMatchId));
          tasks.push(loadShipperTracking(activeMatchId));
          tasks.push(loadShipperPhotos(activeMatchId));
        } else {
          setHasCompletedPayment(false);
          setLatestPaymentStatus(null);
          setLatestPaymentMethod(null);
          setTrackingSnapshot(null);
          setTrackingErrorMessage(null);
          setShipperPhotos([]);
        }
      }
      await Promise.all([quoteRefetchTask, ...tasks]);
    })();

    refreshInFlightRef.current = task;
    try {
      await task;
    } finally {
      if (refreshInFlightRef.current === task) {
        refreshInFlightRef.current = null;
      }
    }
  }, [actionQuoteId, loadMatchSnapshot, loadPaymentCompletion, loadPendingCounterOffer, loadShipperPhotos, loadShipperTracking, view.refetch]);

  React.useEffect(() => {
    const safeQuoteId = parsePositiveInt(actionQuoteId);
    matchLoadTokenRef.current += 1;
    const token = matchLoadTokenRef.current;
    let canceled = false;
    if (safeQuoteId <= 0) {
      setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
      setPendingCounterOffer(null);
      setHasCompletedPayment(false);
      setLatestPaymentStatus(null);
      setLatestPaymentMethod(null);
      setMatchHydrated(true);
      return;
    }
    // quote 전환 시 이전 상세 상태가 잠깐 노출되지 않도록 로컬 상태를 먼저 초기화한다.
    setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
    setPendingCounterOffer(null);
    setHasCompletedPayment(false);
    setLatestPaymentStatus(null);
    setLatestPaymentMethod(null);
    setPaidMatchId(0);
    setMatchHydrated(false);
    const task = InteractionManager.runAfterInteractions(() => {
      if (canceled || matchLoadTokenRef.current !== token) return;
      void (async () => {
        const snapshot = await loadMatchSnapshot(safeQuoteId);
        if (canceled || matchLoadTokenRef.current !== token) return;

        await loadPendingCounterOffer(safeQuoteId);
        if (canceled || matchLoadTokenRef.current !== token) return;

        const activeMatchId = parsePositiveInt(
          (snapshot.cancelableMatch ?? snapshot.nonCanceledMatch)?.matchId
        );
        if (activeMatchId > 0) {
          await loadPaymentCompletion(activeMatchId);
          await loadShipperPhotos(activeMatchId);
        } else {
          setHasCompletedPayment(false);
          setLatestPaymentStatus(null);
          setLatestPaymentMethod(null);
          setTrackingSnapshot(null);
          setTrackingErrorMessage(null);
          setShipperPhotos([]);
        }
      })().finally(() => {
        if (canceled || matchLoadTokenRef.current !== token) return;
        setMatchHydrated(true);
      });
    });
    return () => {
      canceled = true;
      task.cancel();
    };
  }, [actionQuoteId, loadMatchSnapshot, loadPaymentCompletion, loadPendingCounterOffer, loadShipperPhotos]);

  useFocusEffect(
    React.useCallback(() => {
      if (actionQuoteId <= 0) return undefined;

      const focusMeta = focusRefetchMetaRef.current;
      if (!focusMeta.hasFocusedOnce) {
        focusMeta.hasFocusedOnce = true;
        return undefined;
      }

      const now = Date.now();
      if (now - focusMeta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) return undefined;
      focusMeta.lastRefetchAt = now;

      void refreshQuoteAndMatchData();
      return undefined;
    }, [actionQuoteId, refreshQuoteAndMatchData])
  );

  React.useEffect(() => {
    if (!canShowTrackingCard) {
      setTrackingSnapshot(null);
      setTrackingErrorMessage(null);
      return;
    }
    void loadShipperTracking(cancelTargetMatchId);
  }, [canShowTrackingCard, cancelTargetMatchId, loadShipperTracking]);

  const handleCreateMatch = React.useCallback(async () => {
    if (isMatchSubmitting) return;
    if (actionQuoteId <= 0) {
      Alert.alert("배차 요청 실패", "유효한 견적 정보를 찾을 수 없습니다.");
      return;
    }
    try {
      setIsMatchSubmitting(true);
      await createShipperMatch(actionQuoteId);
      await refreshQuoteAndMatchData();
      Alert.alert("배차 요청", "배차 요청이 생성되었습니다.");
    } catch (error) {
      Alert.alert("배차 요청 실패", readApiErrorMessage(error));
    } finally {
      setIsMatchSubmitting(false);
    }
  }, [actionQuoteId, isMatchSubmitting, refreshQuoteAndMatchData]);

  const handleCancelMatch = React.useCallback(async () => {
    if (isMatchSubmitting) return;
    if (cancelTargetMatchId <= 0) {
      Alert.alert("배차 취소 실패", "취소할 배차 요청을 찾을 수 없습니다.");
      return;
    }
    try {
      setIsMatchSubmitting(true);
      await cancelShipperMatch(cancelTargetMatchId);
      await refreshQuoteAndMatchData();
      Alert.alert("배차 취소", "배차 요청을 취소했습니다.");
    } catch (error) {
      Alert.alert("배차 취소 실패", readApiErrorMessage(error));
    } finally {
      setIsMatchSubmitting(false);
    }
  }, [cancelTargetMatchId, isMatchSubmitting, refreshQuoteAndMatchData]);

  const resolvePendingCounterOfferId = React.useCallback(async () => {
    const localOfferId = parsePositiveInt(pendingCounterOffer?.counterOfferId);
    if (localOfferId > 0 && isCounterOfferPending(pendingCounterOffer?.status ?? "")) {
      return localOfferId;
    }
    if (actionQuoteId <= 0) return 0;
    const offers = await listShipperCounterOffers(actionQuoteId);
    const pendingOffer = offers.find((offer) => isCounterOfferPending(offer.status));
    if (pendingOffer) {
      setPendingCounterOffer(pendingOffer);
    }
    return parsePositiveInt(pendingOffer?.counterOfferId);
  }, [actionQuoteId, pendingCounterOffer]);

  const executePayment = React.useCallback(async () => {
    if (isPaying) return;
    if (cancelTargetMatchId <= 0) {
      Alert.alert("Payment failed", "No active match found.");
      return;
    }

    const finalPrice = toPositiveAmount(view.quote.finalPrice);
    const desiredPrice = toPositiveAmount(view.quote.desiredPrice);
    const basePrice = toPositiveAmount(view.quote.basePrice);
    const resolvedAmount = finalPrice || desiredPrice || basePrice;
    if (resolvedAmount <= 0) {
      Alert.alert("Payment failed", "Unable to resolve payment amount.");
      return;
    }

    const safeAmount = Math.max(100, resolvedAmount);
    const origin = toText(view.quote.originAddress) || "Origin";
    const destination = toText(view.quote.destinationAddress) || "Destination";
    const orderName = `${origin} -> ${destination}`;

    try {
      setIsPaying(true);
      const prepared = await prepareShipperPayment({
        matchId: cancelTargetMatchId,
        amount: safeAmount,
        orderName,
      });
      if (!prepared.clientKey) {
        throw new Error("결제창을 열 수 없습니다. clientKey가 없습니다.");
      }
      setPendingPaymentRequest(prepared);
      setShowPaymentModal(true);
    } catch (error) {
      Alert.alert("Payment failed", readApiErrorMessage(error, "Payment could not be completed."));
    } finally {
      setIsPaying(false);
    }
  }, [cancelTargetMatchId, isPaying, view.quote.basePrice, view.quote.desiredPrice, view.quote.destinationAddress, view.quote.finalPrice, view.quote.originAddress]);

  const handleClosePaymentModal = React.useCallback(() => {
    setShowPaymentModal(false);
    setPendingPaymentRequest(null);
  }, []);

  const handlePaymentSuccess = React.useCallback(
    async (payload: { paymentKey: string; orderId: string; amount: number }) => {
      if (!pendingPaymentRequest) {
        Alert.alert("Payment failed", "결제 요청 정보를 찾을 수 없습니다.");
        return;
      }

      setShowPaymentModal(false);
      try {
        setIsPaying(true);
        const paymentResult = await confirmShipperPayment({
          paymentKey: payload.paymentKey,
          orderId: payload.orderId || pendingPaymentRequest.orderId,
          amount: payload.amount || pendingPaymentRequest.amount,
          matchIdForMock: cancelTargetMatchId,
        });

        const confirmed = !paymentResult?.status || paymentResult.status === "COMPLETED";
        if (confirmed && cancelTargetMatchId > 0) {
          setPaidMatchId(cancelTargetMatchId);
        }
        setLatestPaymentStatus(paymentResult?.status ?? "COMPLETED");
        setLatestPaymentMethod(paymentResult?.method ?? latestPaymentMethod ?? null);
        setHasCompletedPayment(confirmed);
        setForcePaymentRequired(false);
        await refreshQuoteAndMatchData();
        Alert.alert(
          confirmed ? "Payment completed" : "Payment pending",
          confirmed ? "Your payment has been processed." : "결제 상태가 확정되지 않았습니다. 잠시 후 다시 확인해주세요."
        );
      } catch (error) {
        Alert.alert("Payment failed", readApiErrorMessage(error, "Payment could not be completed."));
      } finally {
        setIsPaying(false);
        setPendingPaymentRequest(null);
      }
    },
    [cancelTargetMatchId, latestPaymentMethod, pendingPaymentRequest, refreshQuoteAndMatchData]
  );

  const handlePaymentFail = React.useCallback((payload: { code?: string; message?: string }) => {
    setShowPaymentModal(false);
    setPendingPaymentRequest(null);
    setLatestPaymentStatus("FAILED");
    setLatestPaymentMethod(null);
    const message = payload?.message ? `결제가 취소/실패했습니다.\n(${payload.message})` : "결제가 취소/실패했습니다.";
    Alert.alert("Payment failed", message);
  }, []);

  const runPolicyAction = React.useCallback(
    async (action: QuoteDecisionAction, _ctx: QuoteActionsContext) => {
      if (isMatchSubmitting || isPaying) return;

      if (action === "acceptOffer") {
        try {
          setIsMatchSubmitting(true);
          const offerId = await resolvePendingCounterOfferId();
          if (offerId <= 0) {
            Alert.alert("협상 제안 수락", "대기 중인 역제안을 찾을 수 없습니다.");
            return;
          }
          const accepted = await acceptShipperCounterOffer(offerId);
          const acceptedMatchId = parsePositiveInt(accepted?.matchId);
          const shouldRequirePayment = shouldRequirePaymentAfterCounterOfferAccept(accepted);

          setPendingCounterOffer(null);
          if (acceptedMatchId > 0) {
            const optimisticMatch = buildOptimisticAcceptedMatch(
              acceptedMatchId,
              actionQuoteId,
              accepted?.matchStatus ?? accepted?.quoteStatus
            );
            setMatchSnapshot({
              cancelableMatch: optimisticMatch.cancelable ? optimisticMatch : null,
              nonCanceledMatch: optimisticMatch,
            });
          }
          if (shouldRequirePayment) {
            setForcePaymentRequired(true);
          }
          await refreshQuoteAndMatchData();
          if (acceptedMatchId > 0) {
            setMatchSnapshot((prev) => {
              const currentMatchId = parsePositiveInt((prev.cancelableMatch ?? prev.nonCanceledMatch)?.matchId);
              if (currentMatchId > 0) return prev;
              const optimisticMatch = buildOptimisticAcceptedMatch(
                acceptedMatchId,
                actionQuoteId,
                accepted?.matchStatus ?? accepted?.quoteStatus
              );
              return {
                cancelableMatch: optimisticMatch.cancelable ? optimisticMatch : null,
                nonCanceledMatch: optimisticMatch,
              };
            });
          }
          Alert.alert("협상 제안 수락", "역제안을 수락했습니다.");
        } catch (error) {
          Alert.alert("협상 제안 수락 실패", readApiErrorMessage(error));
        } finally {
          setIsMatchSubmitting(false);
        }
        return;
      }

      if (action === "rejectOffer") {
        try {
          setIsMatchSubmitting(true);
          const offerId = await resolvePendingCounterOfferId();
          if (offerId <= 0) {
            Alert.alert("협상 제안 거절", "대기 중인 역제안을 찾을 수 없습니다.");
            return;
          }
          await rejectShipperCounterOffer(offerId);
          setPendingCounterOffer(null);
          await refreshQuoteAndMatchData();
          Alert.alert("협상 제안 거절", "역제안을 거절했습니다.");
        } catch (error) {
          Alert.alert("협상 제안 거절 실패", readApiErrorMessage(error));
        } finally {
          setIsMatchSubmitting(false);
        }
        return;
      }

      if (action === "reRequestRoute") {
        router.push("/(shipper)/quotes/create");
        return;
      }

      if (action === "pay") {
        await executePayment();
        return;
      }
    },
    [actionQuoteId, executePayment, isMatchSubmitting, isPaying, refreshQuoteAndMatchData, resolvePendingCounterOfferId, router]
  );

  const handlePolicyCancelRequest = React.useCallback(
    (_payload: { quoteId: number; reason: string }) => {
      void handleCancelMatch();
    },
    [handleCancelMatch]
  );

  const handlePressEdit = React.useCallback(() => {
    if (isBlockedByFetchState) return;
    const preferredIdentifier = toText(view.quote.quotePublicId || quoteIdentifier);
    const routeIdentifier = preferredIdentifier || (actionQuoteId > 0 ? String(actionQuoteId) : "");
    if (!routeIdentifier) {
      Alert.alert("수정 이동 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }
    router.push({ pathname: "/(shipper)/quotes/edit/[id]", params: { id: routeIdentifier } });
  }, [actionQuoteId, isBlockedByFetchState, quoteIdentifier, router, view.quote.quotePublicId]);

  const runDelete = React.useCallback(async () => {
    if (isDeleting || isBlockedByFetchState) return;
    const targetIdentifier = toText(view.quote.quotePublicId || quoteIdentifier || (actionQuoteId > 0 ? String(actionQuoteId) : ""));
    if (!targetIdentifier) {
      Alert.alert("견적 삭제 실패", "유효한 견적 식별자를 찾을 수 없습니다.");
      return;
    }
    try {
      setIsDeleting(true);
      await deleteShipperQuote(targetIdentifier);
      router.replace("/(shipper)/quotes");
    } catch (error) {
      Alert.alert("견적 삭제 실패", readApiErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [actionQuoteId, isBlockedByFetchState, isDeleting, quoteIdentifier, router, view.quote.quotePublicId]);

  const handlePressDelete = React.useCallback(() => {
    if (isBlockedByFetchState || isDeleting) return;
    Alert.alert("견적 삭제", "해당 견적을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => void runDelete() },
    ]);
  }, [isBlockedByFetchState, isDeleting, runDelete]);

  const handleOpenManageMenu = React.useCallback(() => {
    if (isBlockedByFetchState || isDeleting) return;
    Alert.alert("견적 관리", "작업을 선택해 주세요.", [
      { text: "취소", style: "cancel" },
      { text: "수정", onPress: handlePressEdit },
      { text: "삭제", style: "destructive", onPress: handlePressDelete },
    ]);
  }, [handlePressDelete, handlePressEdit, isBlockedByFetchState, isDeleting]);

  const handleDetailErrorRetry = React.useCallback(() => {
    if (view.isSessionExpired) {
      router.replace("/(auth)/login");
      return;
    }
    void view.refetch();
  }, [router, view.isSessionExpired, view.refetch]);

  const handleRefreshTransportProgress = React.useCallback(async () => {
    if (isProgressRefreshing || isMatchSubmitting || isPaying) return;
    try {
      setIsProgressRefreshing(true);
      await refreshQuoteAndMatchData();
    } catch (error) {
      Alert.alert("상태 갱신 실패", readApiErrorMessage(error, "운송 상태를 새로고침하지 못했습니다."));
    } finally {
      setIsProgressRefreshing(false);
    }
  }, [isMatchSubmitting, isPaying, isProgressRefreshing, refreshQuoteAndMatchData]);

  const canOpenSettlementReceipt = isCompletedStatus && cancelTargetMatchId > 0;
  const hasDriverPhotos = loadingPhotos.length > 0 || unloadingPhotos.length > 0;
  const shouldShowPhotoSection = isTransitInProgress || (isCompletedStatus && hasDriverPhotos);
  const shouldShowLoadingPhotoWait = isTransitInProgress && loadingPhotos.length === 0;
  const shouldShowUnloadingPhotoWaitCompact = isTransitInProgress && unloadingPhotos.length === 0;

  const handleOpenSettlementReceipt = React.useCallback(() => {
    if (!canOpenSettlementReceipt || isNavigatingReceipt) return;
    setIsNavigatingReceipt(true);
    const receiptParams =
      actionQuoteId > 0
        ? {
            matchId: String(cancelTargetMatchId),
            quoteId: String(actionQuoteId),
          }
        : {
            matchId: String(cancelTargetMatchId),
          };
    router.push({
      pathname: "/(shipper)/settings/tax-invoices/[matchId]",
      params: receiptParams,
    } as never);

    if (receiptNavUnlockTimerRef.current) {
      clearTimeout(receiptNavUnlockTimerRef.current);
    }
    receiptNavUnlockTimerRef.current = setTimeout(() => {
      setIsNavigatingReceipt(false);
      receiptNavUnlockTimerRef.current = null;
    }, 300);
  }, [actionQuoteId, canOpenSettlementReceipt, cancelTargetMatchId, isNavigatingReceipt, router]);

  React.useEffect(() => {
    initLayoutAnimationForAndroid();
  }, []);

  React.useEffect(() => {
    return () => {
      if (receiptNavUnlockTimerRef.current) {
        clearTimeout(receiptNavUnlockTimerRef.current);
      }
    };
  }, []);

  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const shouldUsePolicyActionBar = POLICY_ACTION_UI_STATES.has(actionUiState) && Boolean(actionPolicy.bottomBar);
  const isDeliveryLifecycleState = shouldShowDeliveryTimeline || isCompletedStatus;
  const bottomTitle = hasActiveQuoteMatch ? "배차 요청 취소" : "배차 요청";
  const bottomVariant = React.useMemo(() => {
    if (hasActiveQuoteMatch) return "destructive";
    if (statusUiState === CUSTOMER_UI_STATE.UNKNOWN) return "secondary";
    return "primary";
  }, [hasActiveQuoteMatch, statusUiState]);
  const handlePressBottomAction = React.useCallback(() => {
    if (hasActiveQuoteMatch) {
      void handleCancelMatch();
      return;
    }
    void handleCreateMatch();
  }, [handleCancelMatch, handleCreateMatch, hasActiveQuoteMatch]);

  const bottomBar = !isBlockedByFetchState ? (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing * 2 }]} onLayout={(e) => {
      const nextHeight = e?.nativeEvent?.layout?.height;
      if (!nextHeight) return;
      setBottomBarHeight((prev) => Math.max(prev, nextHeight));
    }}>
      {!matchHydrated ? (
        <View style={styles.bottomPlaceholder}>
          <AppText style={styles.bottomPlaceholderText}>상태 동기화 중...</AppText>
        </View>
      ) : shouldUsePolicyActionBar ? (
        <BottomActionRouter
          ctx={effectiveActionsContext}
          bottomBar={actionPolicy.bottomBar}
          guards={actionPolicy.guards}
          onCancelRequest={handlePolicyCancelRequest}
          onRunAction={(action, ctx) => runPolicyAction(action, ctx)}
        />
      ) : isCompletedStatus ? (
        canOpenSettlementReceipt ? (
          <AppButton
            title="거래명세서 / 영수증 보기"
            variant="primary"
            style={styles.bottomButton}
            onPress={handleOpenSettlementReceipt}
            loading={isNavigatingReceipt}
            disabled={isNavigatingReceipt}
          />
        ) : (
          <View style={styles.bottomPlaceholder}>
            <AppText style={styles.bottomPlaceholderText}>영수증 정보를 준비 중입니다. 잠시 후 다시 확인해 주세요.</AppText>
          </View>
        )
      ) : shouldShowDeliveryTimeline ? (
        <AppButton
          title={isTransitInProgress ? "운송 상태 새로고침" : "상차 상태 새로고침"}
          variant="secondary"
          style={styles.bottomButton}
          onPress={() => void handleRefreshTransportProgress()}
          loading={isProgressRefreshing}
          disabled={isProgressRefreshing || isMatchSubmitting || isPaying}
        />
      ) : (
        <AppButton
          title={bottomTitle}
          variant={bottomVariant}
          style={styles.bottomButton}
          onPress={handlePressBottomAction}
          loading={isMatchSubmitting || isPaying}
          disabled={isDeliveryLifecycleState || isMatchSubmitting || isPaying || (hasActiveQuoteMatch && isCancelIdInvalid) || actionQuoteId <= 0}
        />
      )}
    </View>
  ) : null;

  return (
    <PageScaffold
      title="견적 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={StyleSheet.flatten([styles.pageContent, { paddingBottom: bottomBarHeight + spacing * 3 }])}
      onPressBack={() => router.back()}
      backLabel="이전"
      headerRight={
        <AppButton size="icon" variant="secondary" accessibilityLabel="견적 관리 메뉴" onPress={handleOpenManageMenu} disabled={isBlockedByFetchState || isDeleting}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMain} />
        </AppButton>
      }
      bottomBar={bottomBar}
    >
      <AppRequestState
        isLoading={view.isLoading}
        loadingLabel="견적 상세를 불러오는 중입니다."
        errorMessage={view.isSessionExpired ? "세션이 만료되었습니다. 다시 로그인해 주세요." : view.errorMessage}
        errorTitle={view.isSessionExpired ? "세션이 만료되었습니다" : "견적 상세를 불러오지 못했어요"}
        retryLabel={view.isSessionExpired ? "로그인으로 이동" : "다시 시도"}
        onRetry={handleDetailErrorRetry}
        fullScreen={false}
      >
        <>
          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: palette.badgeBg, borderColor: palette.badgeBorder }]}>
                <AppText style={[styles.statusText, { color: palette.badgeText }]} numberOfLines={1}>
                  {effectiveStatusLabel}
                </AppText>
              </View>
              <AppText style={styles.statusMeta} numberOfLines={1}>
                {view.commandCenter.metaText || `#${view.quote.quoteId || routeQuoteId}`}
              </AppText>
            </View>
            {latestPaymentStatus ? (
              <AppText style={styles.paymentMetaText}>
                {`결제 상태: ${toPaymentStatusLabel(latestPaymentStatus)}${latestPaymentMethod ? ` · 수단: ${toPaymentMethodLabel(latestPaymentMethod)}` : ""}`}
              </AppText>
            ) : null}
            {view.commandCenter.cancelReasonText ? (
              <View style={styles.cancelBox}>
                <View style={styles.cancelRow}>
                  <Ionicons name="alert-circle" style={styles.cancelIcon} />
                  <AppText style={styles.cancelLabel}>취소 사유</AppText>
                  <AppText style={styles.cancelValue}>{view.commandCenter.cancelReasonText}</AppText>
                </View>
                <View style={styles.cancelRow}>
                  <Ionicons name="time-outline" style={styles.cancelIcon} />
                  <AppText style={styles.cancelLabel}>취소 시간</AppText>
                  <AppText style={styles.cancelValue}>{toDisplayText(view.commandCenter.canceledAtText)}</AppText>
                </View>
              </View>
            ) : null}

            {shouldShowPostPaymentSummary && !isCompletedStatus ? (
              <View style={styles.paymentDoneCard}>
                <View style={styles.paymentDoneHeader}>
                  <View style={styles.paymentDoneIconWrap}>
                    <Ionicons name="checkmark-circle" style={styles.paymentDoneIcon} />
                  </View>
                  <AppText style={styles.paymentDoneTitle}>{postPaymentSummary.title}</AppText>
                </View>
                <AppText style={styles.paymentDoneDesc}>{postPaymentSummary.description}</AppText>
              </View>
            ) : null}
          </View>
          {pendingCounterOffer ? <CounterOfferCard offer={pendingCounterOffer} /> : null}
          {isCompletedStatus ? (
            <View style={styles.deliveryDoneCard}>
              <View style={styles.deliveryDoneHeader}>
                <View style={styles.deliveryDoneIconWrap}>
                  <Ionicons name="checkmark-circle" style={styles.deliveryDoneIcon} />
                </View>
                <AppText style={styles.deliveryDoneTitle}>결제 완료 · 운송이 무사히 완료되었습니다.</AppText>
              </View>
              <AppText style={styles.deliveryDoneMeta}>{postPaymentSummary.description}</AppText>
              {view.coreSummary.completedAtText ? (
                <AppText style={styles.deliveryDoneMeta}>
                  완료일시: {toDisplayText(view.coreSummary.completedAtText)}
                </AppText>
              ) : null}
            </View>
          ) : shouldShowDeliveryTimeline ? (
            <View style={styles.deliveryCard}>
              <AppText style={styles.deliveryTitle}>배송 진행 현황</AppText>

              <View style={styles.deliveryStepRow}>
                {DELIVERY_TIMELINE_STEPS.map((step, index) => {
                  const isDone = index < deliveryTimelineIndex;
                  const isActive = index === deliveryTimelineIndex;
                  const isFutureDeliveryStep = isTransitInProgress && step.key === "DROPOFF";
                  const nodeStyle = isDone
                    ? styles.deliveryStepNodeDone
                    : isActive
                    ? styles.deliveryStepNodeActive
                    : styles.deliveryStepNodeIdle;

                  return (
                    <React.Fragment key={step.key}>
                      <View style={[{ flex: 1, alignItems: "center" }, isFutureDeliveryStep ? styles.deliveryStepFuture : null]}>
                        <View style={[styles.deliveryStepNode, nodeStyle]}>
                          {isDone ? (
                            <Ionicons name="checkmark" size={12} color={theme.colors.semanticSuccess} />
                          ) : isActive ? (
                            <Ionicons name="ellipse" size={8} color={theme.colors.brandPrimary} />
                          ) : null}
                        </View>
                        <AppText style={[styles.deliveryStepLabel, isActive ? styles.deliveryStepLabelActive : null]}>
                          {step.label}
                        </AppText>
                      </View>
                      {index < DELIVERY_TIMELINE_STEPS.length - 1 ? (
                        <View style={[styles.deliveryStepConnector, isDone ? styles.deliveryStepConnectorDone : null]} />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          ) : null}
          {shouldShowPhotoSection ? (
            <View style={styles.photoGallerySection}>
              <AppText style={styles.deliveryTitle}>기사 사진</AppText>

              <View style={styles.photoGroupWrap}>
                <AppText style={styles.photoGroupTitle}>상차 사진</AppText>
                {loadingPhotos.length > 0 ? (
                  <View style={styles.photoThumbRow}>
                    {loadingPhotos.map((uri, index) => (
                      <PhotoThumbShipper key={`loading-${uri}-${index}`} uri={uri} index={index} styles={styles} theme={theme} />
                    ))}
                  </View>
                ) : shouldShowLoadingPhotoWait ? (
                  <AppText style={styles.photoWaitText}>상차 사진 대기 중</AppText>
                ) : null}
              </View>

              <View style={styles.photoGroupWrap}>
                <AppText style={styles.photoGroupTitle}>하차 사진</AppText>
                {unloadingPhotos.length > 0 ? (
                  <View style={styles.photoThumbRow}>
                    {unloadingPhotos.map((uri, index) => (
                      <PhotoThumbShipper key={`unloading-${uri}-${index}`} uri={uri} index={index} styles={styles} theme={theme} />
                    ))}
                  </View>
                ) : shouldShowUnloadingPhotoWaitCompact ? (
                  <View style={styles.photoCompactHint}>
                    <AppText style={styles.photoCompactHintText}>하차 사진은 배송 완료 후 등록됩니다.</AppText>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
          {hasActiveQuoteMatch ? (
            <DriverVehicleInfo
              title="기사/차량 정보"
              driverId={activeQuoteMatch?.driverId}
              truckId={view.quote.truckId}
              vehicleType={view.quote.vehicleType}
              vehicleBodyType={view.quote.vehicleBodyType}
              transportDateTime={view.coreSummary.completedAtText ? view.quote.updatedAt : undefined}
            />
          ) : null}
          <QuoteRouteInfo
            title="운송 경로"
            originAddress={view.coreSummary.originAddress}
            destinationAddress={view.coreSummary.destinationAddress}
            waypointAddresses={view.coreSummary.waypointAddresses}
          />
          <SummaryCard view={view} />
          <SpecificationArchive view={view} />
        </>
      </AppRequestState>
      <TossPaymentModal
        visible={showPaymentModal}
        request={
          pendingPaymentRequest && pendingPaymentRequest.clientKey
            ? {
                clientKey: pendingPaymentRequest.clientKey,
                orderId: pendingPaymentRequest.orderId,
                orderName: pendingPaymentRequest.orderName || "Freight payment",
                amount: pendingPaymentRequest.amount,
              }
            : null
        }
        onClose={handleClosePaymentModal}
        onSuccess={handlePaymentSuccess}
        onFail={handlePaymentFail}
      />
    </PageScaffold>
  );
}
