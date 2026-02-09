// apps/mobile/src/pages/shipper/quotes/QuoteListPage.tsx
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { safeString, tint } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";

const VIEW_PRESSED: ViewStyle = { opacity: 0.85 };

type QuoteStatus = "draft" | "negotiating" | "matched";
type QuoteItem = {
  id: string;
  title: string;
  fromLabel: string;
  toLabel: string;
  priceHint: string;
  status: QuoteStatus;
};

export function QuoteListPage() {
  const theme = useAppTheme();
  const router = useRouter();

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const subtleText = useMemo(() => tint(cText, 0.7, "rgba(17,24,39,0.7)"), [cText]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
        ghostBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
        listItemOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
        listItemInner: { padding: 16 },
        topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start" },
        row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
        node: { flex: 1 },
        arrow: { width: 18, alignItems: "center", justifyContent: "center", marginHorizontal: 12 },
        divider: { height: 1, backgroundColor: tint("#000000", 0.06, "rgba(0,0,0,0.06)"), marginTop: 12 },
        bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
      }),
    [cText]
  );

  const quotes: QuoteItem[] = useMemo(
    () => [
      {
        id: "q-1",
        title: "사무용 집기 운송",
        fromLabel: "서울 강남",
        toLabel: "인천 연수",
        priceHint: "희망가 220,000원",
        status: "negotiating",
      },
      {
        id: "q-2",
        title: "원자재(팔레트) 운송",
        fromLabel: "경기 화성",
        toLabel: "충남 아산",
        priceHint: "제안 대기",
        status: "draft",
      },
    ],
    []
  );

  const statusUi = useMemo(() => {
    return {
      draft: { label: "등록됨", bg: tint(cBorder, 0.6, "rgba(229,231,235,0.6)"), fg: subtleText },
      negotiating: { label: "협상 중", bg: tint(cPrimary, 0.12, "rgba(255,106,0,0.12)"), fg: cPrimary },
      matched: { label: "매칭됨", bg: tint("#3B82F6", 0.12, "rgba(59,130,246,0.12)"), fg: "#3B82F6" },
    } as const;
  }, [cBorder, cPrimary, subtleText]);

  return (
    <PageScaffold title="견적" backgroundColor={cBg}>
      <View style={styles.headerRow}>
        <AppText variant="heading" weight="800">
          내 견적
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="견적 등록"
          onPress={() => router?.push?.("/(shipper)/quotes/create")}
          style={({ pressed }) => [styles.ghostBtn, pressed ? VIEW_PRESSED : undefined]}
        >
          <AppText variant="caption" weight="900" color={cPrimary}>
            + 등록
          </AppText>
        </Pressable>
      </View>

      {Array.isArray(quotes) && quotes.length > 0 ? (
        quotes.map((q) => {
          const ui = statusUi?.[q.status] ?? statusUi.draft;

          return (
            <View key={q.id} style={styles.listItemOuter}>
              <AppCard>
                <View style={styles.listItemInner}>
                  <View style={styles.topRow}>
                    <View style={[styles.badge, { backgroundColor: ui.bg }]}>
                      <AppText variant="caption" weight="900" style={{ color: ui.fg }}>
                        {ui.label}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={subtleText} />
                  </View>

                  <View style={{ height: 10 }} />
                  <AppText variant="body" weight="900">
                    {safeString(q.title, "")}
                  </AppText>

                  <View style={styles.row}>
                    <View style={styles.node}>
                      <AppText variant="caption" weight="700" color={subtleText}>
                        출발
                      </AppText>
                      <AppText variant="body" weight="800">
                        {safeString(q.fromLabel, "")}
                      </AppText>
                    </View>

                    <View style={styles.arrow}>
                      <AppText variant="caption" weight="700" color={subtleText}>
                        ➝
                      </AppText>
                    </View>

                    <View style={[styles.node, { alignItems: "flex-end" }]}>
                      <AppText variant="caption" weight="700" color={subtleText}>
                        도착
                      </AppText>
                      <AppText variant="body" weight="800">
                        {safeString(q.toLabel, "")}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.bottomRow}>
                    <AppText variant="body" color={subtleText}>
                      {safeString(q.priceHint, "")}
                    </AppText>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="상세 보기"
                      onPress={() => {}}
                      style={({ pressed }) => [styles.ghostBtn, pressed ? VIEW_PRESSED : undefined]}
                    >
                      <AppText variant="caption" weight="900" color={cText}>
                        상세
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </AppCard>
            </View>
          );
        })
      ) : (
        <AppEmptyState
          fullScreen={false}
          title="견적이 없어요"
          description="첫 견적을 등록하고 기사님의 제안을 받아보세요."
          action={{ label: "견적 등록", onPress: () => router?.push?.("/(shipper)/quotes/create") }}
        />
      )}

      <View style={{ height: 12 }} />
      <AppButton title="견적 등록" onPress={() => router?.push?.("/(shipper)/quotes/create")} />
      <View style={{ height: 120 }} />
    </PageScaffold>
  );
}

export default QuoteListPage;

/*
요약(3줄)
- 화주 견적 화면은 “목록 + 등록 CTA” 중심의 최소 뼈대(더미 데이터)로 구성했습니다.
- 상태 배지/출발-도착/가격 힌트 등 기본 카드 UI만 제공해 이후 features/entities 연결이 쉽습니다.
- 테마 누락 대비 기본값 + StyleSheet.create 기반으로 안전하게 동작합니다.
*/
