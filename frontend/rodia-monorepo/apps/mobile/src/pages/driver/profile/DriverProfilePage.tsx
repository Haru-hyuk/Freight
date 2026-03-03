import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/model/useAuth";
import { listDriverTrucks } from "@/features/driver-profile/api/driver-profile-api";
import { listDriverSettlementsMe } from "@/features/driver-profile/api/driver-settlement-api";
import { listDriverInquiriesMe } from "@/features/driver-profile/api/driver-inquiry-api";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const COLORS = {
  brand: "#FF6A00",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#111827",
  textSub: "#64748B",
  textMuted: "#94A3B8",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1E293B",
  slate900: "#0F172A",
  successBg: "#ECFDF5",
  successText: "#059669",
  warnBg: "#FFFBEB",
  warnText: "#D97706",
  dangerBg: "#FEF2F2",
  dangerText: "#DC2626",
};

type StatusLevel = "success" | "warn" | "danger";

function getAcceptStatus(isLicenseVerified: boolean, isTruckApproved: boolean): {
  level: StatusLevel;
  text: string;
  pill: string;
} {
  if (!isLicenseVerified) {
    return { level: "danger", text: "수락 불가(자격 미인증)", pill: "BLOCK" };
  }
  if (!isTruckApproved) {
    return { level: "warn", text: "제한됨(차량 심사중)", pill: "LIMIT" };
  }
  return { level: "success", text: "수락 가능", pill: "OK" };
}

function getReasonText(isLicenseVerified: boolean, isTruckApproved: boolean): { text: string; color: string } {
  if (!isLicenseVerified) return { text: "화물 운송 자격증 인증이 필요합니다.", color: COLORS.dangerText };
  if (!isTruckApproved) return { text: "차량 심사가 진행 중입니다. 일부 오더가 제한됩니다.", color: COLORS.warnText };
  return { text: "모든 인증이 완료되어 오더를 정상 수락할 수 있습니다.", color: COLORS.successText };
}

export function DriverProfilePage() {
  const router = useRouter();
  const auth = useAuth();

  const [isOnDuty, setIsOnDuty] = useState(true);
  const [isTruckApproved, setIsTruckApproved] = useState(false);
  const [truckApprovedFromServer, setTruckApprovedFromServer] = useState<boolean | null>(null);
  const [isLicenseVerified, setIsLicenseVerified] = useState(auth.pendingVerificationRole !== "driver");
  const [pendingSettlementCount, setPendingSettlementCount] = useState(0);
  const [unansweredInquiryCount, setUnansweredInquiryCount] = useState(0);
  const [truckTitle, setTruckTitle] = useState("차량 등록 (-)");

  const [toastMsg, setToastMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (msg: string) => {
      setToastMsg(msg);
      fadeAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start();
        }, 1400);
      });
    },
    [fadeAnim]
  );

  useEffect(() => {
    let cancelled = false;

    if (auth.status !== "authenticated") {
      setTruckApprovedFromServer(null);
      setPendingSettlementCount(0);
      setUnansweredInquiryCount(0);
      setTruckTitle("차량 등록 (-)");
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const [trucks, settlements, inquiries] = await Promise.all([
        listDriverTrucks().catch(() => []),
        listDriverSettlementsMe().catch(() => []),
        listDriverInquiriesMe().catch(() => []),
      ]);
      if (cancelled) return;

      const firstTruck = trucks[0];
      const tonnageLabel =
        typeof firstTruck?.tonnage === "number" && Number.isFinite(firstTruck.tonnage) ? `${firstTruck.tonnage}톤` : "";
      const truckName = typeof firstTruck?.name === "string" ? firstTruck.name.trim() : "";
      const truckLabel = [tonnageLabel, truckName].filter(Boolean).join(" ");
      setTruckTitle(truckLabel ? `차량 등록 (${truckLabel})` : "차량 등록 (-)");

      const approved = trucks.find((t) => typeof t.approved === "boolean")?.approved;
      setTruckApprovedFromServer(typeof approved === "boolean" ? approved : null);

      setPendingSettlementCount(settlements.filter((s) => s?.settlementStatus === "PENDING").length);
      setUnansweredInquiryCount(inquiries.filter((q) => !q?.answer).length);
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.status]);

  const effectiveTruckApproved = truckApprovedFromServer ?? isTruckApproved;
  const status = useMemo(() => getAcceptStatus(isLicenseVerified, effectiveTruckApproved), [isLicenseVerified, effectiveTruckApproved]);
  const reason = useMemo(() => getReasonText(isLicenseVerified, effectiveTruckApproved), [isLicenseVerified, effectiveTruckApproved]);

  const profileName = auth.user?.name?.trim() || "기사 사용자";
  const profilePhone = auth.user?.phone ?? "-";
  const bankName = auth.user?.bankName ?? "-";
  const bankAccount = auth.user?.bankAccount ?? "-";

  const toggleDuty = () => {
    setIsOnDuty((prev) => {
      const next = !prev;
      showToast(next ? "출근 처리되었습니다." : "퇴근 처리되었습니다.");
      return next;
    });
  };

  const onLogout = async () => {
    if (auth.isBusy) return;
    try {
      await auth.logout();
      showToast("로그아웃 되었습니다.");
    } catch (error) {
      console.error(error);
      showToast("로그아웃 중 오류가 발생했습니다.");
    }
  };

  return (
    <View style={styles.root}>
      <PageScaffold
        title="내정보"
        subtitle="수락 가능 상태 / 인증"
        headerRight={
          <Pressable style={[styles.dutyToggle, isOnDuty && styles.dutyToggleOn]} onPress={toggleDuty}>
            <View style={[styles.dutyDot, isOnDuty && styles.dutyDotOn]} />
            <Text style={[styles.dutyText, isOnDuty && styles.dutyTextOn]}>{isOnDuty ? "운행중 ON" : "퇴근 OFF"}</Text>
          </Pressable>
        }
        backgroundColor={COLORS.bg}
        scroll={true}
        contentStyle={styles.scrollContent}
      >
        <View style={[styles.secHeader, { marginTop: 0 }]}>
          <Text style={styles.secTitle}>내 정보</Text>
          <Text style={styles.secSub}>수락 가능 상태</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 14 }]}>
            <View style={[styles.row, { gap: 12, justifyContent: "flex-start" }]}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={COLORS.slate400} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={styles.txtHeading}>{profileName}</Text>
                <Text style={styles.txtDetail}>{profilePhone}</Text>
              </View>
            </View>
            <View style={[styles.pill, styles.pillGray]}>
              <Text style={styles.pillTextGray}>프로필</Text>
            </View>
          </View>

          <View
            style={[
              styles.acceptBox,
              status.level === "success"
                ? styles.acceptBoxSuccess
                : status.level === "warn"
                  ? styles.acceptBoxWarn
                  : styles.acceptBoxDanger,
            ]}
          >
            <Text
              style={[
                styles.acceptText,
                status.level === "success"
                  ? { color: COLORS.successText }
                  : status.level === "warn"
                    ? { color: COLORS.warnText }
                    : { color: COLORS.dangerText },
              ]}
            >
              수락 상태: {status.text}
            </Text>
            <View
              style={[
                styles.pill,
                status.level === "success"
                  ? styles.pillSuccess
                  : status.level === "warn"
                    ? styles.pillWarn
                    : styles.pillDanger,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  status.level === "success"
                    ? { color: COLORS.successText }
                    : status.level === "warn"
                      ? { color: COLORS.warnText }
                      : { color: COLORS.dangerText },
                ]}
              >
                {status.pill}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.secHeader}>
          <Text style={styles.secTitle}>인증 / 차량</Text>
          <Text style={styles.secSub}>제한 사유 확인</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <Text style={styles.txtBody}>화물운송자격증</Text>
            <View style={[styles.pill, isLicenseVerified ? styles.pillSuccess : styles.pillDanger]}>
              <Text style={[styles.pillText, isLicenseVerified ? { color: COLORS.successText } : { color: COLORS.dangerText }]}>
                {isLicenseVerified ? "인증완료" : "미인증"}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.txtBody}>{truckTitle}</Text>
            <View style={[styles.pill, effectiveTruckApproved ? styles.pillSuccess : styles.pillWarn]}>
              <Text style={[styles.pillText, effectiveTruckApproved ? { color: COLORS.successText } : { color: COLORS.warnText }]}>
                {effectiveTruckApproved ? "승인완료" : "심사중"}
              </Text>
            </View>
          </View>

          <View style={styles.softBox}>
            <Text style={[styles.txtCaption, { color: reason.color }]}>{reason.text}</Text>
          </View>

          <View style={styles.btnRow}>
            <Pressable
              style={styles.demoBtn}
              onPress={() => {
                setIsTruckApproved(true);
                showToast("차량 승인이 완료되었습니다.");
              }}
            >
              <Text style={styles.demoBtnText}>차량 승인(데모)</Text>
            </Pressable>
            <Pressable
              style={styles.demoBtn}
              onPress={() => {
                setIsLicenseVerified((prev) => {
                  const next = !prev;
                  showToast(next ? "자격 인증 복구" : "자격 해제됨");
                  return next;
                });
              }}
            >
              <Text style={styles.demoBtnText}>자격 토글(데모)</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.secHeader}>
          <Text style={styles.secTitle}>정산 계좌</Text>
          <Text style={styles.secSub}>주거래</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ gap: 4 }}>
              <Text style={[styles.txtCaption, { color: COLORS.slate400 }]}>{bankName}</Text>
              <Text style={[styles.txtBody, { fontWeight: "800", letterSpacing: -0.2 }]}>{bankAccount}</Text>
            </View>
            <View style={[styles.pill, styles.pillGray]}>
              <Text style={styles.pillTextGray}>기본</Text>
            </View>
          </View>
        </View>

        <View style={styles.secHeader}>
          <Text style={styles.secTitle}>내 정보</Text>
          <Text style={styles.secSub}>바로가기</Text>
        </View>

        <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
          <Pressable style={styles.menuItem} onPress={() => router.push("/(driver)/settings/account" as never)}>
            <Text style={styles.menuText}>회원정보 수정</Text>
            <Text style={styles.menuRightText}>수정</Text>
          </Pressable>
          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem} onPress={() => router.push("/(driver)/settings/trucks" as never)}>
            <Text style={styles.menuText}>차량 승인 상태</Text>
            <Text style={styles.menuRightText}>보기</Text>
          </Pressable>
          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem} onPress={() => router.push("/(driver)/settlement" as never)}>
            <Text style={styles.menuText}>정산 내역</Text>
            <Text style={styles.menuRightText}>{pendingSettlementCount > 0 ? `${pendingSettlementCount}건` : "보기"}</Text>
          </Pressable>
          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem} onPress={() => router.push("/(driver)/inquiries" as never)}>
            <Text style={styles.menuText}>1:1 문의 / 고객센터</Text>
            <Text style={styles.menuRightText}>{unansweredInquiryCount > 0 ? `${unansweredInquiryCount}건` : "보기"}</Text>
          </Pressable>
          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem} onPress={onLogout}>
            <Text style={[styles.menuText, { color: COLORS.dangerText }]}>
              {auth.isBusy ? "로그아웃 중..." : "로그아웃"}
            </Text>
            <Text style={[styles.menuRightText, { color: COLORS.dangerText }]}>⟶</Text>
          </Pressable>
        </View>
      </PageScaffold>

      <Animated.View
        style={[
          styles.toast,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

export default DriverProfilePage;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  dutyToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.slate100,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  dutyToggleOn: {
    backgroundColor: COLORS.brand,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  dutyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.slate400 },
  dutyDotOn: { backgroundColor: COLORS.surface },
  dutyText: { fontSize: 13, fontWeight: "700", color: COLORS.slate500 },
  dutyTextOn: { color: COLORS.surface },

  scrollContent: { padding: 20, paddingTop: 12, paddingBottom: 120 },

  txtHeading: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, color: COLORS.slate900 },
  txtDetail: { fontSize: 13, fontWeight: "600", color: COLORS.slate500 },
  txtBody: { fontSize: 15, fontWeight: "700", color: COLORS.slate800 },
  txtCaption: { fontSize: 12, fontWeight: "600", color: COLORS.slate500 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginVertical: 14,
    paddingHorizontal: 4,
  },
  secTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  secSub: { fontSize: 12, fontWeight: "500", color: COLORS.textSub },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
    justifyContent: "center",
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  pillGray: { backgroundColor: COLORS.slate100 },
  pillTextGray: { fontSize: 12, fontWeight: "700", color: COLORS.slate600 },
  pillSuccess: { backgroundColor: COLORS.successBg },
  pillWarn: { backgroundColor: COLORS.warnBg },
  pillDanger: { backgroundColor: COLORS.dangerBg },

  acceptBox: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    backgroundColor: COLORS.slate50,
  },
  acceptText: { fontSize: 13, fontWeight: "800", letterSpacing: -0.2 },
  acceptBoxSuccess: { backgroundColor: COLORS.successBg, borderColor: "rgba(5,150,105,0.18)" },
  acceptBoxWarn: { backgroundColor: COLORS.warnBg, borderColor: "rgba(217,119,6,0.18)" },
  acceptBoxDanger: { backgroundColor: COLORS.dangerBg, borderColor: "rgba(220,38,38,0.18)" },

  softBox: {
    marginTop: 12,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 14,
    padding: 14,
  },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  demoBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.slate800 },

  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  menuDivider: { height: 1, backgroundColor: COLORS.slate100 },
  menuText: { fontSize: 15, fontWeight: "700", color: COLORS.slate800 },
  menuRightText: { fontSize: 12, fontWeight: "700", color: COLORS.slate400 },

  toast: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 99,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  toastText: { color: COLORS.surface, fontSize: 13, fontWeight: "700" },
});
