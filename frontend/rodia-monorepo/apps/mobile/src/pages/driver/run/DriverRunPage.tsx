import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

const STORAGE_KEY = "rodia_data_v2";

type RouteStatus = "MOVING" | "PAYMENT_WAIT" | "COMPLETED";

interface RouteItem {
  id: string;
  status: RouteStatus;
  from: string;
  to: string;
  price: number;
  movingStep?: number;
}

const COLORS = {
  brand: "#FF6A00",
  brandDark: "#E65F00",
  brandLight: "rgba(255,106,0,0.10)",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate800: "#1E293B",
  white: "#FFFFFF",
  success: "#059669",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  warn: "#D97706",
  warnBg: "#FFFBEB",
  warnBorder: "#FDE68A",
  textMain: "#111827",
  textSub: "#475569",
};

const STEPS = [
  { label: "준비", btn: "상차지로 출발", title: "상차지로 이동 중" },
  { label: "상차도착", btn: "도착 확인 (상차 시작)", title: "상차 진행 준비" },
  { label: "상차완료", btn: "하차지로 출발", title: "하차지로 이동 중" },
  { label: "하차도착", btn: "도착 확인 (하차 시작)", title: "하차 진행 준비" },
  { label: "하차완료", btn: "운행 종료 및 인수증 전송", title: "운행 마무리" },
];

export default function RouteScreen() {
  const router = useRouter();
  const [currentFilter, setCurrentFilter] = useState<RouteStatus>("MOVING");
  const [data, setData] = useState<RouteItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 초기 데이터 로드 (더미 데이터 포함)
  useEffect(() => {
    const loadData = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setData(JSON.parse(raw));
        } else {
          // 저장된 데이터가 없을 경우 보여줄 임시 더미 데이터
          const dummyData: RouteItem[] = [
            { id: "101", status: "MOVING", from: "경기 화성시", to: "서울 강남구", price: 150000, movingStep: 1 },
            { id: "102", status: "PAYMENT_WAIT", from: "인천 남동구", to: "부산 해운대구", price: 320000 },
            { id: "103", status: "COMPLETED", from: "서울 송파구", to: "대전 서구", price: 210000 },
          ];
          setData(dummyData);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dummyData));
        }
      } catch (e) {
        showToast("데이터를 불러오는데 실패했습니다.");
      }
    };
    loadData();
  }, []);

  const saveData = async (newData: RouteItem[]) => {
    try {
      setData(newData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      // ignore
    }
  };

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  }, []);

  const routeShort = (text: string) => {
    if (!text) return "정보없음";
    const parts = text.split(" ").filter(Boolean);
    return parts[1] ? parts[1] : parts[0];
  };

  const clampStep = (step?: number) => {
    const v = typeof step === "number" && isFinite(step) ? step : 0;
    return Math.max(0, Math.min(STEPS.length - 1, v));
  };

  const handleNextStep = (id: string) => {
    const idx = data.findIndex((x) => x.id === id);
    if (idx < 0) return;

    const cur = data[idx];
    if (cur.status !== "MOVING") {
      showToast("운행중 상태가 아닙니다.");
      return;
    }

    const step = clampStep(cur.movingStep);
    const next = step + 1;
    const newData = [...data];

    if (next >= STEPS.length) {
      newData[idx] = { ...cur, status: "COMPLETED", movingStep: STEPS.length - 1 };
      showToast("운행이 종료되었습니다.");
    } else {
      newData[idx] = { ...cur, movingStep: next };
      showToast(`단계 변경: ${STEPS[next].label}`);
    }

    saveData(newData);
  };

  const filteredData = data.filter((item) => item.status === currentFilter);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>운행 관리</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filteredData.length}건</Text>
          </View>
        </View>

        {/* Scroll Area */}
        <ScrollView contentContainerStyle={styles.scrollArea}>
          {/* Tabs */}
          <View style={styles.chipRow}>
            {(["MOVING", "PAYMENT_WAIT", "COMPLETED"] as RouteStatus[]).map((filter) => (
              <Pressable
                key={filter}
                style={[styles.chip, currentFilter === filter && styles.chipActive]}
                onPress={() => setCurrentFilter(filter)}
              >
                <Text
                  style={[
                    styles.chipText,
                    currentFilter === filter && styles.chipTextActive,
                  ]}
                >
                  {filter === "MOVING" ? "진행중" : filter === "PAYMENT_WAIT" ? "결제대기" : "완료"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* List */}
          {filteredData.length === 0 ? (
            <Text style={styles.emptyText}>해당되는 운행 내역이 없습니다.</Text>
          ) : (
            filteredData.map((item) => {
              const from = routeShort(item.from);
              const to = routeShort(item.to);
              const priceText = `${item.price.toLocaleString()}원`;

              return (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() => router.push(`/detail?id=${item.id}`)}
                >
                  {item.status === "MOVING" && (
                    <View style={[styles.stLine, { backgroundColor: COLORS.brand }]} />
                  )}
                  {item.status === "PAYMENT_WAIT" && (
                    <View style={[styles.stLine, { backgroundColor: COLORS.warn }]} />
                  )}
                  {item.status === "COMPLETED" && (
                    <View style={[styles.stLine, { backgroundColor: COLORS.success }]} />
                  )}

                  <View style={styles.topRow}>
                    <Text
                      style={[
                        styles.cardLabel,
                        item.status === "COMPLETED" && { color: COLORS.success },
                      ]}
                    >
                      {item.status === "MOVING"
                        ? `운행중 #${item.id}`
                        : item.status === "PAYMENT_WAIT"
                        ? `결제 대기 #${item.id}`
                        : `완료 #${item.id}`}
                    </Text>
                    {item.status === "COMPLETED" ? (
                      <View style={styles.donePill}>
                        <Text style={styles.donePillText}>완료</Text>
                      </View>
                    ) : (
                      <Text style={styles.price}>{priceText}</Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.routeSummary,
                      item.status === "COMPLETED" && { opacity: 0.65 },
                    ]}
                  >
                    {item.status === "MOVING" ? "🚚" : item.status === "PAYMENT_WAIT" ? "⏳" : "✅"} {from} → {to}
                  </Text>

                  {item.status === "COMPLETED" && (
                    <View style={[styles.topRow, { marginTop: 8 }]}>
                      <Text style={styles.cardLabel}>운송료</Text>
                      <Text style={styles.price}>{priceText}</Text>
                    </View>
                  )}

                  {item.status === "MOVING" && (
                    <>
                      <Text style={styles.routeSub}>{STEPS[clampStep(item.movingStep)].title}</Text>
                      <View style={styles.progressWrap}>
                        <View style={styles.progressHead}>
                          <Text style={styles.progressTitle}>현재 단계</Text>
                          <View style={styles.miniPill}>
                            <View style={styles.miniDot} />
                            <Text style={styles.miniPillText}>
                              {clampStep(item.movingStep) + 1}/{STEPS.length}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${((clampStep(item.movingStep) + 1) / STEPS.length) * 100}%` },
                            ]}
                          />
                        </View>

                        <View style={styles.progressSteps}>
                          {STEPS.map((stepItem, idx) => {
                            const curStep = clampStep(item.movingStep);
                            const isDone = idx < curStep;
                            const isActive = idx === curStep;
                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.stepChip,
                                  isDone && styles.stepChipDone,
                                  isActive && styles.stepChipActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.stepChipText,
                                    isDone && styles.stepChipTextDone,
                                    isActive && styles.stepChipTextActive,
                                  ]}
                                >
                                  {stepItem.label}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.toolsRow}>
                        <Pressable
                          style={styles.btnTool}
                          onPress={(e) => {
                            e.stopPropagation();
                            showToast("내비 실행 (데모)");
                          }}
                        >
                          <Text style={styles.btnToolText}>🧭 내비</Text>
                        </Pressable>
                        <Pressable
                          style={styles.btnTool}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleNextStep(item.id);
                          }}
                        >
                          <Text style={styles.btnToolText}>➡️ 다음 단계</Text>
                        </Pressable>
                      </View>
                    </>
                  )}

                  {item.status === "PAYMENT_WAIT" && (
                    <>
                      <View style={styles.lockedBox}>
                        <MaterialIcons name="lock-outline" size={14} color={COLORS.warn} />
                        <Text style={styles.lockedText}>화주 결제 확인 중입니다 (정보 잠금)</Text>
                      </View>
                      <Text style={styles.blurText}>
                        상세 주소: 서울특별시 ...{"\n"}전화번호: 010-****-****
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.nav}>
          <Pressable style={styles.navItem} onPress={() => router.replace("/home")}>
            <MaterialIcons name="home" size={24} color={COLORS.slate400} />
            <Text style={styles.navItemText}>홈</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.replace("/order")}>
            <MaterialIcons name="list-alt" size={24} color={COLORS.slate400} />
            <Text style={styles.navItemText}>오더</Text>
          </Pressable>
          <Pressable style={styles.navItem}>
            <MaterialIcons name="local-shipping" size={24} color={COLORS.brand} />
            <Text style={[styles.navItemText, { color: COLORS.brand }]}>운행</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.replace("/settle")}>
            <MaterialIcons name="account-balance-wallet" size={24} color={COLORS.slate400} />
            <Text style={styles.navItemText}>정산</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.replace("/profile")}>
            <MaterialIcons name="person" size={24} color={COLORS.slate400} />
            <Text style={styles.navItemText}>내정보</Text>
          </Pressable>
        </View>

        {/* Toast */}
        {toastMsg && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
    position: "relative",
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
    zIndex: 100,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
    color: COLORS.textMain,
  },
  countPill: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.18)",
  },
  countPillText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  scrollArea: {
    padding: 16,
    paddingBottom: 100, // nav bar 공간
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: COLORS.slate800,
    borderColor: COLORS.slate800,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.slate400,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 50,
    color: COLORS.slate400,
    fontSize: 14,
    fontWeight: "900",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    position: "relative",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.slate400,
  },
  price: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.brand,
  },
  routeSummary: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginBottom: 10,
    color: COLORS.textMain,
  },
  routeSub: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textSub,
    marginBottom: 12,
  },
  progressWrap: {
    marginBottom: 12,
  },
  progressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.textSub,
  },
  miniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.18)",
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brand,
  },
  miniPillText: {
    color: COLORS.brand,
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    backgroundColor: COLORS.slate100,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.brand,
    borderRadius: 999,
  },
  progressSteps: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 10,
  },
  stepChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  stepChipDone: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  stepChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: "rgba(255,106,0,0.22)",
  },
  stepChipText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.slate400,
    letterSpacing: -0.1,
  },
  stepChipTextDone: {
    color: COLORS.success,
  },
  stepChipTextActive: {
    color: COLORS.brand,
  },
  toolsRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnTool: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  btnToolText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.textMain,
  },
  lockedBox: {
    backgroundColor: COLORS.warnBg,
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.warnBorder,
    marginBottom: 8,
  },
  lockedText: {
    color: COLORS.warn,
    fontSize: 12,
    fontWeight: "900",
  },
  blurText: {
    opacity: 0.45, // RN 코어에서는 blur 필터를 지원하지 않으므로 opacity로 우회
    fontSize: 13,
    marginTop: 4,
    color: COLORS.textSub,
    fontWeight: "800",
  },
  donePill: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  donePillText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "900",
  },
  nav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: Platform.OS === "ios" ? 80 : 60,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    flexDirection: "row",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    zIndex: 200,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  navItemText: {
    color: COLORS.slate400,
    fontSize: 10,
    fontWeight: "800",
  },
  toast: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    alignSelf: "center",
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 500,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },
});