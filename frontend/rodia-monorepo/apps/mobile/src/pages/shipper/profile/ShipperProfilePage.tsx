// apps/mobile/src/pages/shipper/profile/ShipperProfilePage.tsx
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/shared/theme/useAppTheme";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { useAuth } from "@/features/auth/model/useAuth";

const VIEW_PRESSED: ViewStyle = { opacity: 0.85 };

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

function tint(color: string, opacity: number, fallback: string): string {
  const s = safeString(color).trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return fallback;

  const raw = s.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return fallback;

  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function ShipperProfilePage() {
  const theme = useAppTheme();
  const router = useRouter();
  const auth = useAuth();

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const subtleText = useMemo(() => tint(cText, 0.7, "rgba(17,24,39,0.7)"), [cText]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionTitle: { marginTop: 8, marginBottom: 10 },
        cardOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
        cardInner: { padding: 16 },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        item: {
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: tint("#000000", 0.06, "rgba(0,0,0,0.06)"),
        },
        pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start" },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint(cBorder, 0.9, cBorder),
          borderWidth: 2,
          borderColor: cCard,
          marginRight: 12,
        },
        topLeft: { flexDirection: "row", alignItems: "center" },
        ghostBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
      }),
    [cBorder, cCard]
  );

  const role = safeString(auth?.user?.role, "");
  const name = safeString((auth?.user as any)?.name, "화주");
  const company = safeString((auth?.user as any)?.companyName, "회사 정보 미등록");

  return (
    <PageScaffold title="내 정보" backgroundColor={cBg}>
      {auth?.status !== "authenticated" ? (
        <AppEmptyState
          fullScreen={false}
          title="로그인이 필요해요"
          description="내 정보는 로그인 후 확인할 수 있습니다."
          action={{ label: "로그인", onPress: () => router?.push?.("/(auth)/login") }}
        />
      ) : (
        <>
          <View style={styles.sectionTitle}>
            <AppText variant="heading" weight="800">
              계정
            </AppText>
          </View>

          <View style={styles.cardOuter}>
            <AppCard>
              <View style={styles.cardInner}>
                <View style={styles.row}>
                  <View style={styles.topLeft}>
                    <View style={styles.avatar} accessibilityLabel="프로필 아바타">
                      <Ionicons name="person" size={18} color={subtleText} />
                    </View>
                    <View>
                      <AppText variant="body" weight="900">
                        {name}
                      </AppText>
                      <View style={{ height: 4 }} />
                      <AppText variant="caption" weight="800" color={subtleText}>
                        {company}
                      </AppText>
                    </View>
                  </View>

                  <View style={[styles.pill, { backgroundColor: tint(cPrimary, 0.12, "rgba(255,106,0,0.12)") }]}>
                    <AppText variant="caption" weight="900" style={{ color: cPrimary }}>
                      {role ? `role: ${role}` : "role: -"}
                    </AppText>
                  </View>
                </View>

                <View style={styles.item} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="프로필 수정"
                  onPress={() => {}}
                  style={({ pressed }) => [styles.row, styles.item, pressed ? VIEW_PRESSED : undefined]}
                >
                  <AppText variant="body" weight="800">
                    프로필 수정
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={subtleText} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="결제 수단/예치금"
                  onPress={() => {}}
                  style={({ pressed }) => [styles.row, styles.item, pressed ? VIEW_PRESSED : undefined]}
                >
                  <AppText variant="body" weight="800">
                    결제 수단/예치금
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={subtleText} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="알림 설정"
                  onPress={() => {}}
                  style={({ pressed }) => [styles.row, styles.item, pressed ? VIEW_PRESSED : undefined]}
                >
                  <AppText variant="body" weight="800">
                    알림 설정
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={subtleText} />
                </Pressable>
              </View>
            </AppCard>
          </View>

          <View style={styles.sectionTitle}>
            <AppText variant="heading" weight="800">
              지원
            </AppText>
          </View>

          <View style={styles.cardOuter}>
            <AppCard>
              <View style={styles.cardInner}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="고객센터"
                  onPress={() => {}}
                  style={({ pressed }) => [styles.row, pressed ? VIEW_PRESSED : undefined]}
                >
                  <AppText variant="body" weight="800">
                    고객센터
                  </AppText>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={subtleText} />
                </Pressable>

                <View style={styles.item} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이용약관"
                  onPress={() => {}}
                  style={({ pressed }) => [styles.row, styles.item, pressed ? VIEW_PRESSED : undefined]}
                >
                  <AppText variant="body" weight="800">
                    이용약관
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={subtleText} />
                </Pressable>
              </View>
            </AppCard>
          </View>

          <View style={{ height: 8 }} />
          <AppButton
            title={auth.isBusy ? "로그아웃 중..." : "로그아웃"}
            variant="secondary"
            disabled={auth.isBusy}
            loading={auth.isBusy}
            onPress={() => auth.logout()}
          />
          <View style={{ height: 120 }} />
        </>
      )}
    </PageScaffold>
  );
}

export default ShipperProfilePage;

/*
요약(3줄)
- 화주 내정보는 “계정 카드 + 설정/지원 항목” 형태의 기본 뼈대를 제공합니다.
- 실제 사용자 데이터(auth.user) 연결을 고려해 안전한 기본값 처리로 크래시를 방지했습니다.
- 상세 화면/액션은 이후 features/entities로 연결할 수 있도록 버튼/행 구성만 잡았습니다.
*/
