// apps/mobile/src/pages/shipper/quotes/QuoteListPage.tsx
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteStatus = "received" | "dispatching" | "negotiating" | "assigned" | "pickup" | "transit" | "dropoff";
type PrimaryView = "inProgress" | "completed";
type ListCategory = "actionRequired" | "inProgress" | "completed";
type QuoteCardTone = "default" | "actionRequired" | "paymentRequired";

type QuoteItem = {
  id: string;
  requestId?: string;
  updatedAt?: string;

  // 서버/도메인에서는 title/rightHint/ctaLabel이 내려올 수 있으나
  // 목록에서는 중복 표시를 피하기 위해 조건부로만 노출한다.
  title?: string;
  fromLabel: string;
  toLabel: string;
  cargoHint?: string;
  rightHint?: string;
  ctaLabel?: string;

  status: QuoteStatus;
};

const PREVIEW_LIMIT = 3;
const CARD_PRESSED: ViewStyle = { opacity: 0.95, transform: [{ scale: 0.985 }] };
const TOGGLE_PRESSED: ViewStyle = { opacity: 0.86 };
const BIG_FILTER_PRESSED: ViewStyle = { opacity: 0.92 };
const FAB_PRESSED: ViewStyle = { transform: [{ scale: 0.95 }] };

const SAMPLE_QUOTES: QuoteItem[] = [
  {
    id: "q-1",
    requestId: "req-101",
    updatedAt: "2026-02-09T09:30:00Z",
    title: "120,000원 금액 제안이 도착했어요",
    fromLabel: "경기 성남",
    toLabel: "충북 청주",
    cargoHint: "5톤 윙바디 · 독차",
    rightHint: "응답 필요",
    ctaLabel: "제안 보기",
    status: "negotiating",
  },
  {
    id: "q-2",
    requestId: "req-102",
    updatedAt: "2026-02-09T08:45:00Z",
    title: "배차가 확정됐어요",
    fromLabel: "인천 남동구",
    toLabel: "대전 유성",
    cargoHint: "5톤 윙바디 · 합짐",
    rightHint: "결제 필요",
    ctaLabel: "결제",
    status: "assigned",
  },
  {
    id: "q-2",
    requestId: "req-102",
    updatedAt: "2026-02-08T19:00:00Z",
    title: "배차가 확정됐어요",
    fromLabel: "인천 남동구",
    toLabel: "대전 유성",
    cargoHint: "5톤 윙바디 · 합짐",
    rightHint: "중복 샘플",
    ctaLabel: "결제",
    status: "assigned",
  },
  {
    id: "q-3",
    requestId: "req-103",
    updatedAt: "2026-02-09T07:20:00Z",
    title: "배차 중입니다",
    fromLabel: "서울 마포",
    toLabel: "경기 고양",
    cargoHint: "1톤 카고",
    rightHint: "배차 중",
    ctaLabel: "현황",
    status: "dispatching",
  },
  {
    id: "q-4",
    requestId: "req-104",
    updatedAt: "2026-02-08T14:10:00Z",
    title: "이동 중입니다",
    fromLabel: "서울 강남",
    toLabel: "부산 해운대",
    cargoHint: "11톤 카고 · 왕복",
    rightHint: "진행 중",
    ctaLabel: "위치",
    status: "transit",
  },
  {
    id: "q-5",
    requestId: "req-201",
    updatedAt: "2026-02-07T16:20:00Z",
    title: "운송이 완료됐어요",
    fromLabel: "경기 평택",
    toLabel: "전남 여수",
    cargoHint: "11톤 카고 · 왕복",
    rightHint: "완료 · 2월 7일",
    ctaLabel: "인수 확인",
    status: "dropoff",
  },
  {
    id: "q-6",
    requestId: "req-202",
    updatedAt: "2026-02-05T13:00:00Z",
    title: "운송이 완료됐어요",
    fromLabel: "강원 원주",
    toLabel: "서울 송파",
    cargoHint: "5톤 냉동탑 · 독차",
    rightHint: "완료 · 2월 5일",
    ctaLabel: "인수 확인",
    status: "dropoff",
  },
  {
    id: "q-7",
    requestId: "req-202",
    updatedAt: "2026-02-04T18:00:00Z",
    title: "운송이 완료됐어요",
    fromLabel: "강원 원주",
    toLabel: "서울 송파",
    cargoHint: "5톤 냉동탑 · 독차",
    rightHint: "중복 샘플",
    ctaLabel: "인수 확인",
    status: "dropoff",
  },
];

function norm(input?: string | number | null): string {
  return safeString(input, "").trim();
}

function toMillis(input?: string): number {
  const parsed = Date.parse(norm(input));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickNewest(a: QuoteItem, b: QuoteItem): QuoteItem {
  return toMillis(a?.updatedAt) >= toMillis(b?.updatedAt) ? a : b;
}

function dedupeQuotes(raw: QuoteItem[]): QuoteItem[] {
  const byId = new Map<string, QuoteItem>();

  for (const item of raw ?? []) {
    const id = norm(item?.id);
    if (!id) continue;

    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, item);
      continue;
    }
    byId.set(id, pickNewest(item, prev));
  }

  const byParent = new Map<string, QuoteItem>();
  const noParent: QuoteItem[] = [];

  for (const item of byId.values()) {
    const parentKey = norm(item?.requestId);
    if (!parentKey) {
      noParent.push(item);
      continue;
    }

    const prev = byParent.get(parentKey);
    if (!prev) {
      byParent.set(parentKey, item);
      continue;
    }
    byParent.set(parentKey, pickNewest(item, prev));
  }

  const merged = [...byParent.values(), ...noParent];
  merged.sort((a, b) => toMillis(b?.updatedAt) - toMillis(a?.updatedAt));
  return merged;
}

function hasDigits(input?: string | null): boolean {
  const v = norm(input);
  return v ? /\d/.test(v) : false;
}

function isCompletedLike(item?: QuoteItem | null): boolean {
  const status = item?.status;
  if (status !== "dropoff") return false;

  const title = norm(item?.title);
  const hint = norm(item?.rightHint);

  // 드롭오프 단계에서 '완료' 문구/날짜가 포함되면 완료로 분류
  if (title.includes("완료")) return true;
  if (hint.includes("완료")) return true;

  return false;
}

function toListCategoryByItem(item: QuoteItem): ListCategory {
  if (isCompletedLike(item)) return "completed";
  if (item.status === "negotiating" || item.status === "assigned") return "actionRequired";
  return "inProgress";
}

function progressStepLabel(status: QuoteStatus): string {
  // customer.progress.steps: ["접수","배차","상차","이동","완료"]
  if (status === "received") return "접수";
  if (status === "dispatching" || status === "negotiating" || status === "assigned") return "배차";
  if (status === "pickup") return "상차";
  if (status === "transit") return "이동";
  return "완료"; // dropoff
}

function defaultTitleByStatus(status: QuoteStatus): string {
  // customer.status.*.title 기반(목록에서는 조건부 노출)
  if (status === "received") return "운송 요청이 접수됐어요";
  if (status === "dispatching") return "배차 중입니다";
  if (status === "negotiating") return "금액 제안이 도착했어요";
  if (status === "assigned") return "배차가 확정됐어요";
  if (status === "pickup") return "상차 진행 중입니다";
  if (status === "transit") return "이동 중입니다";
  return "하차 진행 중입니다";
}

function defaultCtaByStatus(status: QuoteStatus, category: ListCategory): string {
  // customer.status.*.cta.primary 기반(완료 목록에서는 상세 보기로 단순화)
  if (category === "completed") return "요청 보기";
  if (status === "received") return "요청 보기";
  if (status === "dispatching") return "현황";
  if (status === "negotiating") return "제안 보기";
  if (status === "assigned") return "결제";
  if (status === "pickup") return "위치";
  if (status === "transit") return "위치";
  return "인수 확인";
}

function shouldShowRightHint(params: {
  hint?: string;
  title?: string;
  ctaLabel?: string;
  status?: QuoteStatus;
  category?: ListCategory;
  badgeLabel?: string;
}): boolean {
  const hint = norm(params?.hint);
  if (!hint) return false;

  // 샘플/디버그성 문구는 목록에서 제거
  if (hint.includes("중복")) return false;

  const title = norm(params?.title);
  const cta = norm(params?.ctaLabel);
  const badgeLabel = norm(params?.badgeLabel);

  // 배지/타이틀/CTA와 사실상 동일하면 숨김
  if (badgeLabel && hint === badgeLabel) return false;
  if (title && (title === hint || title.includes(hint) || hint.includes(title))) return false;
  if (cta && (cta === hint || cta.includes(hint) || hint.includes(cta))) return false;

  const status = params?.status;
  const category = params?.category;

  // 진행형 상태에서는 "진행 중/배차 중" 같은 일반 힌트를 숨겨 과밀감을 줄임
  if (category === "inProgress") {
    if (hint.includes("진행") || hint.includes("배차") || hint.endsWith("중")) return false;
  }

  // 완료는 날짜/식별 정보가 있는 경우만 유지
  if (category === "completed") {
    if (hint.includes("완료") && !hasDigits(hint)) return false;
  }

  // 액션 필요(제안/결제)는 힌트가 유용한 경우가 많아 유지
  if (status === "negotiating" || status === "assigned") return true;

  return true;
}

function shouldShowTitle(params: {
  category: ListCategory;
  title?: string;
  hint?: string;
  ctaLabel?: string;
  status?: QuoteStatus;
}): boolean {
  const category = params?.category;
  const title = norm(params?.title);
  if (!title) return false;

  // 목록 정보량 축소: 조치 필요에서만 타이틀 노출
  if (category !== "actionRequired") return false;

  const hint = norm(params?.hint);
  const cta = norm(params?.ctaLabel);
  const status = params?.status;

  // 중복이면 숨김
  if (hint && (title === hint || title.includes(hint))) return false;
  if (cta && (title === cta || title.includes(cta))) return false;

  // 배차 확정(결제 필요) 같은 경우: 타이틀보다 결제 힌트/CTA가 핵심이라 타이틀은 생략
  if (status === "assigned" && (hint.includes("결제") || cta.includes("결제"))) return false;

  return true;
}

const useStyles = createThemedStyles((theme) => {
  const border = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const controlRadius = safeNumber(theme?.layout?.radii?.control, 12);
  const cardPadding = safeNumber(theme?.components?.card?.paddingMd, 20);
  const cardRadius = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 20));
  const cBg = safeString(theme?.colors?.bgMain, "#F8FAFC");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cText = safeString(theme?.colors?.textMain, "#111827");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 18,
      backgroundColor: cBg,
    },

    bigFilterRow: {
      flexDirection: "row",
      gap: spacing * 2,
      marginBottom: spacing * 4,
    },
    bigFilterButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: border,
      borderRadius: controlRadius,
      backgroundColor: cSurface,
      paddingVertical: spacing * 3,
      paddingHorizontal: spacing * 3,
    },
    bigFilterButtonActive: {
      borderColor: cText,
      backgroundColor: tint(cText, 0.05, cSurface),
    },
    bigFilterTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing,
    },

    sectionWrap: {
      marginBottom: spacing * 4,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 3,
    },

    feedCard: {
      marginBottom: spacing * 3,
      borderRadius: cardRadius,
      overflow: "hidden",
    },
    feedInner: {
      padding: cardPadding,
    },

    feedTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 3,
      gap: spacing * 2,
    },
    badgeWrap: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing + 1,
      borderRadius: 8,
    },
    rightHintWrap: {
      flex: 1,
      alignItems: "flex-end",
    },

    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing * 2,
    },
    routeCol: {
      flex: 1,
    },
    routeColRight: {
      alignItems: "flex-end",
    },
    routeArrow: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: spacing * 2,
    },

    footerRow: {
      marginTop: spacing * 3,
      paddingTop: spacing * 3,
      borderTopWidth: 1,
      borderTopColor: tint(border, 0.1, "rgba(0,0,0,0.06)"),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    ctaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    toggleWrap: {
      alignItems: "center",
      marginTop: spacing,
    },
    toggleButton: {
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing + 2,
      borderRadius: controlRadius,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: cSurface,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },

    tailSpacer: {
      height: spacing * 5,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });
});

export function QuoteListPage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cBlue = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const cMint = safeString(theme?.colors?.brandAccent, "#00E5A8");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");
  const cBgMain = safeString(theme?.colors?.bgMain, "#F8FAFC");

  const [primaryView, setPrimaryView] = useState<PrimaryView>("inProgress");
  const [showAllActionRequired, setShowAllActionRequired] = useState(false);
  const [showAllInProgress, setShowAllInProgress] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const dedupedQuotes = useMemo(() => dedupeQuotes(SAMPLE_QUOTES), []);

  const grouped = useMemo(() => {
    const actionRequired: QuoteItem[] = [];
    const inProgress: QuoteItem[] = [];
    const completed: QuoteItem[] = [];

    for (const item of dedupedQuotes ?? []) {
      const category = toListCategoryByItem(item);
      if (category === "actionRequired") actionRequired.push(item);
      else if (category === "inProgress") inProgress.push(item);
      else completed.push(item);
    }

    return { actionRequired, inProgress, completed };
  }, [dedupedQuotes]);

  const counts = useMemo(() => {
    const inProgressCount = safeNumber(grouped?.actionRequired?.length, 0) + safeNumber(grouped?.inProgress?.length, 0);
    const completedCount = safeNumber(grouped?.completed?.length, 0);
    return { inProgressCount, completedCount };
  }, [grouped]);

  const ui = useMemo(() => {
    const completedToneText = tint(cTextMain, 0.75, cTextMain);
    const completedBg = tint(cTextMain, 0.08, "rgba(17,24,39,0.08)");

    const inProgressBg = tint(cMint, 0.12, "rgba(0,229,168,0.12)");
    const dispatchBg = tint(cMint, 0.12, "rgba(0,229,168,0.12)");
    const receivedBg = tint(cMint, 0.12, "rgba(0,229,168,0.12)");
    const pickupBg = tint(cMint, 0.12, "rgba(0,229,168,0.12)");
    const transitBg = tint(cMint, 0.12, "rgba(0,229,168,0.12)");
    const dropoffBg = tint(cMint, 0.12, "rgba(0,229,168,0.12)");

    return {
      section: {
        actionRequired: {
          label: "즉시 확인 필요",
          sub: "금액 제안 / 결제",
          tone: "actionRequired" as QuoteCardTone,
        },
        inProgress: {
          label: "진행 중 요청",
          sub: "접수/배차/상차/이동",
          tone: "default" as QuoteCardTone,
        },
        completed: {
          label: "완료 내역",
          sub: "운송 완료",
          tone: "default" as QuoteCardTone,
        },
      },
      badge: {
        received: { label: progressStepLabel("received"), badgeBg: receivedBg, badgeFg: cMint },
        dispatching: { label: progressStepLabel("dispatching"), badgeBg: dispatchBg, badgeFg: cMint },
        negotiating: { label: progressStepLabel("negotiating"), badgeBg: tint(cPrimary, 0.12, "rgba(255,106,0,0.12)"), badgeFg: cPrimary },
        assigned: { label: progressStepLabel("assigned"), badgeBg: tint(cBlue, 0.12, "rgba(59,130,246,0.12)"), badgeFg: cBlue },
        pickup: { label: progressStepLabel("pickup"), badgeBg: pickupBg, badgeFg: cMint },
        transit: { label: progressStepLabel("transit"), badgeBg: transitBg, badgeFg: cMint },
        dropoff: { label: progressStepLabel("dropoff"), badgeBg: dropoffBg, badgeFg: cMint },
      } as const,
      completedBadge: {
        badgeBg: completedBg,
        badgeFg: completedToneText,
      },
      colors: {
        completedText: completedToneText,
      },
    } as const;
  }, [cBlue, cMint, cPrimary, cTextMain]);

  const onPressCard = useCallback(
    (item: QuoteItem) => {
      const id = norm(item?.id);
      const status = norm(item?.status);
      if (!id) return;
      router.push(`/(shipper)/quotes/detail?quoteId=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}`);
    },
    [router]
  );

  const onPressCreate = useCallback(() => {
    router.push("/(shipper)/quotes/create");
  }, [router]);

  const bottomInset = Math.max(0, safeNumber(insets?.bottom, 0));
  const floating = (
    <Pressable
      onPress={onPressCreate}
      accessibilityRole="button"
      accessibilityLabel="요청 등록"
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: cPrimary, marginBottom: Math.max(0, bottomInset - 8) },
        pressed ? FAB_PRESSED : undefined,
      ]}
    >
      <Ionicons name="add" size={26} color={cOnBrand} />
    </Pressable>
  );

  const renderCards = useCallback(
    (items: QuoteItem[]) => {
      return (items ?? []).map((item) => {
        const status = (item?.status ?? "received") as QuoteStatus;
        const category = toListCategoryByItem(item);

        const isDone = category === "completed";
        const tone: QuoteCardTone =
          category === "actionRequired" ? (status === "assigned" ? "paymentRequired" : "actionRequired") : "default";

        const badgeBase = ui.badge?.[status] ?? ui.badge.received;
        const badgeLabel = norm(badgeBase?.label) || progressStepLabel(status);

        const badgeBg = isDone ? ui.completedBadge.badgeBg : badgeBase.badgeBg;
        const badgeFg = isDone ? ui.completedBadge.badgeFg : badgeBase.badgeFg;

        const title = norm(item?.title) || defaultTitleByStatus(status);
        const hint = norm(item?.rightHint);
        const ctaLabel = norm(item?.ctaLabel) || defaultCtaByStatus(status, category);
        const cargoHint = norm(item?.cargoHint);

        const showHint = shouldShowRightHint({
          hint,
          title,
          ctaLabel,
          status,
          category,
          badgeLabel,
        });

        const showTitle = shouldShowTitle({
          category,
          title,
          hint: showHint ? hint : "",
          ctaLabel,
          status,
        });

        return (
          <View key={norm(item?.id)} style={styles.feedCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="요청 상세 보기"
              onPress={() => onPressCard(item)}
              style={({ pressed }) => [pressed ? CARD_PRESSED : undefined]}
            >
              <AppCard tone={tone} elevated outlined={false}>
                <View style={styles.feedInner}>
                  <View style={styles.feedTopRow}>
                    <View style={[styles.badgeWrap, { backgroundColor: badgeBg }]}>
                      <AppText variant="caption" weight="800" color={badgeFg}>
                        {badgeLabel}
                      </AppText>
                    </View>

                    {showHint ? (
                      <View style={styles.rightHintWrap}>
                        <AppText variant="caption" weight="800" color={badgeFg}>
                          {hint}
                        </AppText>
                      </View>
                    ) : (
                      <View style={styles.rightHintWrap} />
                    )}
                  </View>

                  {showTitle ? (
                    <AppText variant="heading" size={16} weight="800" color={cTextMain}>
                      {title}
                    </AppText>
                  ) : null}

                  <View style={styles.routeRow}>
                    <View style={styles.routeCol}>
                      <AppText variant="caption" color={cTextMuted}>
                        출발
                      </AppText>
                      <AppText variant="body" weight="800" color={cTextMain}>
                        {norm(item?.fromLabel)}
                      </AppText>
                    </View>

                    <View style={styles.routeArrow}>
                      <Ionicons name="arrow-forward" size={14} color={cTextMuted} />
                    </View>

                    <View style={[styles.routeCol, styles.routeColRight]}>
                      <AppText variant="caption" color={cTextMuted}>
                        도착
                      </AppText>
                      <AppText variant="body" weight="800" color={cTextMain}>
                        {norm(item?.toLabel)}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.footerRow}>
                    <AppText variant="detail" color={cTextMuted}>
                      {cargoHint}
                    </AppText>

                    <View style={styles.ctaRow}>
                      <AppText variant="detail" weight="800" color={badgeFg}>
                        {ctaLabel || "요청 보기"}
                      </AppText>
                      <Ionicons name="chevron-forward" size={14} color={badgeFg} />
                    </View>
                  </View>
                </View>
              </AppCard>
            </Pressable>
          </View>
        );
      });
    },
    [cTextMain, cTextMuted, onPressCard, styles, ui]
  );

  const actionRequiredPreview = showAllActionRequired ? grouped.actionRequired : grouped.actionRequired.slice(0, PREVIEW_LIMIT);
  const inProgressPreview = showAllInProgress ? grouped.inProgress : grouped.inProgress.slice(0, PREVIEW_LIMIT);
  const completedPreview = showAllCompleted ? grouped.completed : grouped.completed.slice(0, PREVIEW_LIMIT);

  const hasInProgressAny = safeNumber(grouped?.actionRequired?.length, 0) > 0 || safeNumber(grouped?.inProgress?.length, 0) > 0;
  const hasCompletedAny = safeNumber(grouped?.completed?.length, 0) > 0;

  return (
    <PageScaffold title="요청 내역" backgroundColor={cBgMain} contentStyle={styles.content} floating={floating}>
      <View style={styles.bigFilterRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="진행/대기 보기"
          onPress={() => setPrimaryView("inProgress")}
          style={({ pressed }) => [
            styles.bigFilterButton,
            primaryView === "inProgress" ? styles.bigFilterButtonActive : undefined,
            pressed ? BIG_FILTER_PRESSED : undefined,
          ]}
        >
          <View style={styles.bigFilterTop}>
            <AppText variant="detail" weight="800" color={primaryView === "inProgress" ? cTextMain : cTextSub}>
              진행/대기
            </AppText>
            <AppText variant="caption" weight="900" color={cPrimary}>
              {String(safeNumber(counts?.inProgressCount, 0))}건
            </AppText>
          </View>
          <AppText variant="caption" color={cTextMuted}>
            {ui.section.inProgress.sub}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="완료 보기"
          onPress={() => setPrimaryView("completed")}
          style={({ pressed }) => [
            styles.bigFilterButton,
            primaryView === "completed" ? styles.bigFilterButtonActive : undefined,
            pressed ? BIG_FILTER_PRESSED : undefined,
          ]}
        >
          <View style={styles.bigFilterTop}>
            <AppText variant="detail" weight="800" color={primaryView === "completed" ? cTextMain : cTextSub}>
              완료
            </AppText>
            <AppText variant="caption" weight="900" color={cTextMain}>
              {String(safeNumber(counts?.completedCount, 0))}건
            </AppText>
          </View>
          <AppText variant="caption" color={cTextMuted}>
            {ui.section.completed.sub}
          </AppText>
        </Pressable>
      </View>

      {primaryView === "inProgress" ? (
        hasInProgressAny ? (
          <>
            {grouped.actionRequired.length > 0 ? (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <View>
                    <AppText variant="heading" weight="800" color={cTextMain}>
                      {ui.section.actionRequired.label}
                    </AppText>
                    <AppText variant="caption" color={cTextMuted}>
                      {ui.section.actionRequired.sub}
                    </AppText>
                  </View>

                  <AppText variant="caption" weight="700" color={cTextMuted}>
                    {String(safeNumber(grouped?.actionRequired?.length, 0))}건
                  </AppText>
                </View>

                {renderCards(actionRequiredPreview)}

                {grouped.actionRequired.length > PREVIEW_LIMIT ? (
                  <View style={styles.toggleWrap}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showAllActionRequired ? "접기" : "더보기"}
                      onPress={() => setShowAllActionRequired((prev) => !prev)}
                      style={({ pressed }) => [styles.toggleButton, pressed ? TOGGLE_PRESSED : undefined]}
                    >
                      <AppText variant="caption" weight="800" color={cTextSub}>
                        {showAllActionRequired ? "접기" : "더보기"}
                      </AppText>
                      <Ionicons name={showAllActionRequired ? "chevron-up" : "chevron-down"} size={14} color={cTextSub} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            {grouped.inProgress.length > 0 ? (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <View>
                    <AppText variant="heading" weight="800" color={cTextMain}>
                      {ui.section.inProgress.label}
                    </AppText>
                    <AppText variant="caption" color={cTextMuted}>
                      {ui.section.inProgress.sub}
                    </AppText>
                  </View>

                  <AppText variant="caption" weight="700" color={cTextMuted}>
                    {String(safeNumber(grouped?.inProgress?.length, 0))}건
                  </AppText>
                </View>

                {renderCards(inProgressPreview)}

                {grouped.inProgress.length > PREVIEW_LIMIT ? (
                  <View style={styles.toggleWrap}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showAllInProgress ? "접기" : "더보기"}
                      onPress={() => setShowAllInProgress((prev) => !prev)}
                      style={({ pressed }) => [styles.toggleButton, pressed ? TOGGLE_PRESSED : undefined]}
                    >
                      <AppText variant="caption" weight="800" color={cTextSub}>
                        {showAllInProgress ? "접기" : "더보기"}
                      </AppText>
                      <Ionicons name={showAllInProgress ? "chevron-up" : "chevron-down"} size={14} color={cTextSub} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <AppEmptyState
            fullScreen={false}
            title="진행 중인 요청이 없어요"
            description="새 요청을 등록하고 기사님의 제안을 받아보세요."
            action={{ label: "요청 등록", onPress: onPressCreate }}
          />
        )
      ) : hasCompletedAny ? (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <View>
              <AppText variant="heading" weight="800" color={cTextMain}>
                {ui.section.completed.label}
              </AppText>
              <AppText variant="caption" color={cTextMuted}>
                {ui.section.completed.sub}
              </AppText>
            </View>

            <AppText variant="caption" weight="700" color={cTextMuted}>
              {String(safeNumber(grouped?.completed?.length, 0))}건
            </AppText>
          </View>

          {renderCards(completedPreview)}

          {grouped.completed.length > PREVIEW_LIMIT ? (
            <View style={styles.toggleWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showAllCompleted ? "접기" : "더보기"}
                onPress={() => setShowAllCompleted((prev) => !prev)}
                style={({ pressed }) => [styles.toggleButton, pressed ? TOGGLE_PRESSED : undefined]}
              >
                <AppText variant="caption" weight="800" color={cTextSub}>
                  {showAllCompleted ? "접기" : "더보기"}
                </AppText>
                <Ionicons name={showAllCompleted ? "chevron-up" : "chevron-down"} size={14} color={cTextSub} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <AppEmptyState
          fullScreen={false}
          title="완료된 내역이 없어요"
          description="운송이 완료되면 여기에서 인수/정산 내역을 확인할 수 있어요."
          action={{ label: "진행/대기 보기", onPress: () => setPrimaryView("inProgress") }}
        />
      )}

      <View style={styles.tailSpacer} />
    </PageScaffold>
  );
}

export default QuoteListPage;

/*
요약:
1) 상태값을 customer 플로우(received/dispatching/negotiating/assigned/pickup/transit/dropoff)로 전환하고, dropoff의 “완료” 문구는 완료 목록으로 분리했습니다.
2) 카드 중복 요소를 줄이기 위해 타이틀은 ‘조치 필요’에서만, rightHint는 의미 있을 때만 노출하도록 조건부 처리했습니다.
3) 기존 레이아웃/스타일은 유지하고(배지·경로·CTA), 목록에서 과도한 상태 텍스트 노출을 제거했습니다.
*/
