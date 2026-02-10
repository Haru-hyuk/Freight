// apps/mobile/src/pages/shipper/matchings/MatchingListPage.tsx
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

type MatchingStatus = "payment" | "loading" | "moving" | "completed";
type MatchingItem = {
  id: string;
  title: string;
  fromLabel: string;
  toLabel: string;
  status: MatchingStatus;
  rightHint: string;
};

export function MatchingListPage() {
  const theme = useAppTheme();
  const router = useRouter();

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cBlue = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const cMint = safeString(theme?.colors?.brandAccent, "#00E5A8");
  const subtleText = useMemo(() => tint(cText, 0.7, "rgba(17,24,39,0.7)"), [cText]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
        ghostBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },

        itemOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
        itemInner: { padding: 16 },
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

  const matchings: MatchingItem[] = useMemo(
    () => [
      { id: "m-1", title: "배차 확정", fromLabel: "인천 남동구", toLabel: "대전 유성", status: "payment", rightHint: "결제 대기" },
      { id: "m-2", title: "상차 진행", fromLabel: "서울 강남", toLabel: "부산 해운대", status: "loading", rightHint: "기사님 도착" },
      { id: "m-3", title: "이동 중", fromLabel: "경기 평택", toLabel: "전남 여수", status: "moving", rightHint: "도착 예정 14:30" },
    ],
    []
  );

  const statusUi = useMemo(() => {
    return {
      payment: { label: "결제", bg: tint(cBlue, 0.12, "rgba(59,130,246,0.12)"), fg: cBlue },
      loading: { label: "상차", bg: tint(cMint, 0.12, "rgba(0,229,168,0.12)"), fg: cMint },
      moving: { label: "이동", bg: tint(cMint, 0.12, "rgba(0,229,168,0.12)"), fg: cMint },
      completed: { label: "완료", bg: tint(cBorder, 0.6, "rgba(229,231,235,0.6)"), fg: subtleText },
    } as const;
  }, [cBlue, cMint, cBorder, subtleText]);

  return (
    <PageScaffold title="매칭" backgroundColor={cBg}>
      <View style={styles.headerRow}>
        <AppText variant="heading" weight="800">
          진행 중인 운송
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="견적 목록으로"
          onPress={() => router?.push?.("/(shipper)/quotes")}
          style={({ pressed }) => [styles.ghostBtn, pressed ? VIEW_PRESSED : undefined]}
        >
          <AppText variant="caption" weight="900" color={cPrimary}>
            견적 보기
          </AppText>
        </Pressable>
      </View>

      {Array.isArray(matchings) && matchings.length > 0 ? (
        matchings.map((m) => {
          const ui = statusUi?.[m.status] ?? statusUi.completed;

          return (
            <View key={m.id} style={styles.itemOuter}>
              <AppCard>
                <View style={styles.itemInner}>
                  <View style={styles.topRow}>
                    <View style={[styles.badge, { backgroundColor: ui.bg }]}>
                      <AppText variant="caption" weight="900" style={{ color: ui.fg }}>
                        {ui.label}
                      </AppText>
                    </View>
                    <AppText variant="caption" weight="800" color={subtleText}>
                      {safeString(m.rightHint, "")}
                    </AppText>
                  </View>

                  <View style={{ height: 10 }} />
                  <AppText variant="body" weight="900">
                    {safeString(m.title, "")}
                  </AppText>

                  <View style={styles.row}>
                    <View style={styles.node}>
                      <AppText variant="caption" weight="700" color={subtleText}>
                        출발
                      </AppText>
                      <AppText variant="body" weight="800">
                        {safeString(m.fromLabel, "")}
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
                        {safeString(m.toLabel, "")}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.bottomRow}>
                    <AppText variant="body" color={subtleText}>
                      상세/결제/관제는 이후 widgets(features)로 연결
                    </AppText>
                    <Ionicons name="chevron-forward" size={18} color={subtleText} />
                  </View>
                </View>
              </AppCard>
            </View>
          );
        })
      ) : (
        <AppEmptyState
          fullScreen={false}
          title="진행 중인 매칭이 없어요"
          description="견적을 등록하고 기사님의 제안을 수락하면 매칭이 생성됩니다."
          action={{ label: "견적 등록", onPress: () => router?.push?.("/(shipper)/quotes/create") }}
        />
      )}

      <View style={{ height: 12 }} />
      <AppButton title="견적 등록" onPress={() => router?.push?.("/(shipper)/quotes/create")} />
      <View style={{ height: 120 }} />
    </PageScaffold>
  );
}

export default MatchingListPage;

/*
요약(3줄)
- 화주 매칭 화면은 “진행 중 목록 카드 + 상태 배지” 중심의 최소 뼈대(더미 데이터)입니다.
- 결제/관제/완료확정 등은 이후 widgets/features로 확장할 수 있게 카드 구조만 잡았습니다.
- 테마 기본값/옵셔널 체이닝으로 데이터 미연결 상태에서도 안정적으로 렌더링됩니다.
*/
