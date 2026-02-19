import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/features/auth/model/useAuth";
import { safeString } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const BASE = {
  brand: "#FF6A00",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#111827",
  textSub: "#64748B",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate400: "#94A3B8",
  slate800: "#1E293B",
  slate900: "#0F172A",
  dangerText: "#DC2626",
};

type NoticeProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  title: string;
  time: string;
  message: string;
};

type QuickItemProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
};

function QuickItem({ icon, label }: QuickItemProps) {
  return (
    <Pressable style={styles.quickItem}>
      <View style={styles.quickIconCircle}>
        <Ionicons name={icon} size={20} color={BASE.brand} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function NoticeCard({ icon, iconColor, iconBg, title, time, message }: NoticeProps) {
  return (
    <View style={styles.noticeCard}>
      <View style={[styles.noticeIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.noticeContent}>
        <View style={styles.noticeHeader}>
          <Text style={styles.noticeTitle}>{title}</Text>
          <Text style={styles.noticeTime}>{time}</Text>
        </View>
        <Text style={styles.noticeMessage}>{message}</Text>
      </View>
    </View>
  );
}

export function DriverHomePage() {
  const router = useRouter();
  const auth = useAuth();
  const theme = useAppTheme();

  const [isOnDuty, setIsOnDuty] = useState(true);

  const isVerificationBlocked = auth.pendingVerificationRole === "driver";
  const cBrand = safeString(theme?.colors?.brandPrimary, BASE.brand);

  const heroLockStyle = useMemo<ViewStyle>(
    () => ({
      ...styles.heroLock,
      display: isVerificationBlocked ? "flex" : "none",
    }),
    [isVerificationBlocked]
  );

  const goVerification = () => {
    router.push("/(driver)/verification");
  };

  return (
    <PageScaffold
      title=""
      headerLeft={<Text style={[styles.logo, { color: cBrand }]}>Rodia</Text>}
      headerRight={
        <Pressable
          style={[styles.dutyToggle, isOnDuty && { backgroundColor: cBrand, borderColor: "rgba(255,106,0,0.25)" }]}
          onPress={() => setIsOnDuty((prev) => !prev)}
        >
          <View style={[styles.dutyDot, isOnDuty && styles.dutyDotOn]} />
          <Text style={[styles.dutyText, isOnDuty && styles.dutyTextOn]}>{isOnDuty ? "운행중 ON" : "대기 OFF"}</Text>
        </Pressable>
      }
      backgroundColor={BASE.bg}
      scroll={true}
      contentStyle={styles.pageContent}
    >
      {isVerificationBlocked ? (
        <View style={styles.topAlert}>
          <Ionicons name="alert-circle-outline" size={18} color={BASE.dangerText} />
          <Text style={styles.topAlertText}>운송 자격 인증이 필요합니다.</Text>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>2월 예상 매출</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>+12%</Text>
          </View>
        </View>

        <Text style={styles.heroAmount}>4,250,000원</Text>

        <View style={styles.heroStats}>
          <View style={styles.statItemDark}>
            <Text style={styles.statLabel}>이번 주 완료</Text>
            <Text style={styles.statValue}>8건</Text>
          </View>
          <View style={styles.statItemDark}>
            <Text style={styles.statLabel}>입금 예정</Text>
            <Text style={styles.statValue}>850,000원</Text>
          </View>
        </View>

        <View style={heroLockStyle}>
          <Text style={styles.heroLockTitle}>운행 자격 미인증</Text>
          <Text style={styles.heroLockDesc}>인증을 완료해야 오더 수락과 운행 기능을 사용할 수 있습니다.</Text>
          <Pressable style={[styles.heroLockBtn, { backgroundColor: cBrand }]} onPress={goVerification}>
            <Text style={styles.heroLockBtnText}>인증하러 가기</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>오늘 업무 현황</Text>
      </View>
      <View style={styles.dashboardContainer}>
        <Pressable style={styles.dashboardItem}>
          <Text style={styles.dashboardValue}>0</Text>
          <Text style={styles.dashboardLabel}>배정중</Text>
        </Pressable>
        <View style={styles.dashboardDivider} />
        <Pressable style={styles.dashboardItem}>
          <Text style={styles.dashboardValue}>1</Text>
          <Text style={styles.dashboardLabel}>결제대기</Text>
        </Pressable>
        <View style={styles.dashboardDivider} />
        <Pressable style={styles.dashboardItem}>
          <Text style={[styles.dashboardValue, { color: cBrand }]}>2</Text>
          <Text style={[styles.dashboardLabel, { color: cBrand }]}>운행중</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>빠른 실행</Text>
      </View>
      <View style={styles.quickGrid}>
        <QuickItem icon="document-text-outline" label="정산서 발행" />
        <QuickItem icon="receipt-outline" label="인수증 관리" />
        <QuickItem icon="notifications-outline" label="공지사항" />
        <QuickItem icon="headset-outline" label="고객센터" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>중요 알림</Text>
        <Text style={styles.sectionLink}>전체보기</Text>
      </View>
      <View style={styles.noticeList}>
        {isVerificationBlocked ? (
          <NoticeCard
            icon="information-circle-outline"
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
            title="서비스 이용 제한"
            time="지금"
            message="자격 미인증 상태입니다. 인증 전에는 오더 수락과 운행 기능이 제한됩니다."
          />
        ) : null}
        <NoticeCard
          icon="time-outline"
          iconColor="#D97706"
          iconBg="#FFFBEB"
          title="결제 대기"
          time="방금"
          message="화주가 결제를 진행 중인 오더가 있습니다."
        />
        <NoticeCard
          icon="information-circle-outline"
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          title="요청 응답 대기"
          time="10분 전"
          message="제안한 금액에 대한 화주 응답을 기다리고 있습니다."
        />
      </View>

      <Modal visible={isVerificationBlocked} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>계정 인증이 필요합니다</Text>
            <Text style={styles.modalDesc}>기사 인증이 완료되어야 오더 수락과 운행 시작 등 주요 기능을 사용할 수 있습니다.</Text>
            <AppButton title="인증하러 가기" size="lg" onPress={goVerification} />
          </View>
        </View>
      </Modal>
    </PageScaffold>
  );
}

export default DriverHomePage;

const styles = StyleSheet.create({
  pageContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  logo: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  dutyToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BASE.slate100,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 99,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Platform.select({
      ios: { shadowColor: BASE.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BASE.slate400,
  },
  dutyDotOn: {
    backgroundColor: BASE.surface,
  },
  dutyText: {
    fontSize: 13,
    fontWeight: "800",
    color: BASE.textSub,
    letterSpacing: -0.2,
  },
  dutyTextOn: {
    color: BASE.surface,
  },
  topAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    borderRadius: 12,
  },
  topAlertText: {
    fontSize: 14,
    fontWeight: "800",
    color: BASE.dangerText,
    flex: 1,
  },
  heroCard: {
    backgroundColor: BASE.slate800,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: BASE.surface,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: BASE.surface,
    marginBottom: 18,
    letterSpacing: -0.6,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12,
  },
  statItemDark: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 11,
    color: BASE.slate400,
    marginBottom: 4,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
    color: BASE.surface,
  },
  heroLock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    zIndex: 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroLockTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: BASE.surface,
    marginBottom: 8,
  },
  heroLockDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "700",
  },
  heroLockBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroLockBtnText: {
    color: BASE.surface,
    fontWeight: "900",
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: BASE.slate900,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 12,
    color: BASE.textSub,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  dashboardContainer: {
    flexDirection: "row",
    backgroundColor: BASE.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BASE.border,
    marginBottom: 24,
  },
  dashboardItem: {
    flex: 1,
    alignItems: "center",
  },
  dashboardDivider: {
    width: 1,
    backgroundColor: BASE.slate100,
    marginVertical: 4,
  },
  dashboardValue: {
    fontSize: 22,
    fontWeight: "900",
    color: BASE.slate800,
    marginBottom: 4,
  },
  dashboardLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: BASE.slate400,
  },
  quickGrid: {
    flexDirection: "row",
    backgroundColor: BASE.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BASE.border,
    marginBottom: 24,
    justifyContent: "space-between",
  },
  quickItem: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    backgroundColor: BASE.slate50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BASE.slate100,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: BASE.slate800,
  },
  noticeList: {
    gap: 10,
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: BASE.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BASE.border,
    gap: 12,
  },
  noticeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeContent: {
    flex: 1,
  },
  noticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: BASE.slate900,
  },
  noticeTime: {
    fontSize: 11,
    color: BASE.slate400,
    fontWeight: "800",
  },
  noticeMessage: {
    fontSize: 13,
    color: BASE.textSub,
    lineHeight: 18,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    backgroundColor: BASE.surface,
    borderWidth: 1,
    borderColor: BASE.border,
  },
  modalTitle: {
    color: BASE.text,
    fontSize: 20,
    fontWeight: "800",
  },
  modalDesc: {
    color: BASE.textSub,
    fontSize: 14,
    lineHeight: 20,
  },
});
