import React, { useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import type { AppTheme } from "@/shared/theme/types";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type VehicleType = { n: string; p: number };
type VehicleCategory = { name: string; types: VehicleType[] };

const VEHICLE_DATA: VehicleCategory[] = [
  {
    name: "1톤",
    types: [
      { n: "카고", p: 80000 },
      { n: "탑차", p: 90000 },
      { n: "윙바디", p: 100000 },
    ],
  },
  {
    name: "2.5톤",
    types: [
      { n: "카고", p: 150000 },
      { n: "탑차", p: 160000 },
    ],
  },
  {
    name: "5톤",
    types: [
      { n: "카고", p: 220000 },
      { n: "윙바디", p: 250000 },
    ],
  },
];

type CargoItem = { id: number; type: string; weight: string; volume: string };
type CargoField = "type" | "weight" | "volume";

const EXTRA_OPTIONS = [
  { id: "caution", title: "파손주의", price: 5000 },
  { id: "upright", title: "세워서 적재", price: 3000 },
  { id: "waterproof", title: "방수/습기주의", price: 5000 },
  { id: "shock", title: "충격주의", price: 5000 },
];

const PRESS_EFFECT: ViewStyle = { opacity: 0.92, transform: [{ scale: 0.98 }] };

function formatKrw(value: number) {
  return `${Math.floor(value).toLocaleString()}원`;
}

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);

  const cBase = c.bgMain;
  const cSurface = c.bgSurface;
  const cSurfaceAlt = c.bgSurfaceAlt;
  const cTextMain = c.textMain;
  const cTextSub = c.textSub;
  const cTextMuted = c.textMuted;
  const cTextOnBrand = c.textOnBrand;
  const cBorder = c.borderDefault;
  const cBorderStrong = c.borderStrong;
  const cPrimary = c.brandPrimary;
  const cSecondary = c.brandSecondary;
  const cDanger = c.semanticDanger;
  const cInfo = c.semanticInfo;

  const cLine = tint(cBorderStrong, 0.65, cBorderStrong);
  const cDivider = tint(cBorder, 0.7, cBorder);
  const cBrandBg = tint(cPrimary, 0.1, cSurfaceAlt);
  const cBadgeInfoBg = tint(cInfo, 0.16, cSurfaceAlt);
  const cBadgeSaleBg = tint(cDanger, 0.16, cSurfaceAlt);
  const cAiBanner = tint(cSecondary, 0.94, cSecondary);
  const cAiIconBg = tint(cSurface, 0.14, "rgba(255,255,255,0.14)");
  const cModalOverlay = tint(cTextMain, 0.45, "rgba(0,0,0,0.45)");

  return StyleSheet.create({
    content: { backgroundColor: cBase, paddingBottom: 120 },
    section: { marginBottom: spacing * 6 },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 2 + 2,
      paddingHorizontal: spacing,
    },
    card: {
      borderRadius: radiusCard,
      padding: spacing * 5,
    },

    routePoint: { marginBottom: spacing * 8, position: "relative", paddingLeft: spacing * 8 },
    timelineLine: {
      position: "absolute",
      left: 11,
      top: 24,
      bottom: -20,
      width: 2,
      backgroundColor: cLine,
      borderStyle: Platform.OS === "ios" ? "solid" : "dashed",
    },
    dot: {
      position: "absolute",
      left: 0,
      top: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    dotStart: { backgroundColor: cTextMain },
    dotEnd: { backgroundColor: cPrimary },
    dotText: { color: cTextOnBrand, fontSize: 10, fontWeight: "800" },

    rowHalf: {
      flexDirection: "row",
      gap: spacing * 2 + 2,
      marginBottom: spacing * 2 + 2,
      alignItems: "flex-start",
    },
    inputContainer: {
      flex: 1,
    },
    inputShell: {
      minHeight: 52,
      backgroundColor: cSurfaceAlt,
      borderRadius: radiusControl,
      borderColor: cBorder,
      borderWidth: 1,
      paddingHorizontal: 14,
    },
    inputShellSurface: {
      backgroundColor: cSurface,
    },
    inputShellMultiline: {
      minHeight: 88,
      alignItems: "flex-start",
      paddingTop: 8,
      paddingBottom: 8,
    },
    addrBtn: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      paddingHorizontal: 14,
      backgroundColor: cSurfaceAlt,
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: cBorder,
      gap: 8,
    },
    addrBtnFilled: { backgroundColor: cSurface, borderColor: cPrimary },
    addrText: { fontSize: 15, fontWeight: "500", color: cTextSub },
    addrTextFilled: { fontWeight: "700", color: cTextMain },
    dateTimeTrigger: {
      flex: 1,
      minHeight: 52,
      backgroundColor: cSurfaceAlt,
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: cBorder,
      justifyContent: "space-between",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
    },

    cargoItem: {
      backgroundColor: cSurfaceAlt,
      borderRadius: radiusControl,
      padding: spacing * 4,
      marginBottom: spacing * 3,
      borderWidth: 1,
      borderColor: cBorder,
    },
    cargoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing * 2 + 2 },
    btnAddCargo: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: cPrimary,
      borderStyle: "dashed",
      borderRadius: radiusControl,
      backgroundColor: cBrandBg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },

    aiBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: cAiBanner,
      borderRadius: radiusControl,
      paddingVertical: spacing * 3,
      paddingHorizontal: spacing * 4,
      marginBottom: spacing * 4,
    },
    aiIconCircle: {
      width: 32,
      height: 32,
      backgroundColor: cAiIconBg,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },

    ddTrigger: {
      flex: 1,
      minHeight: 50,
      backgroundColor: cSurface,
      borderWidth: 1,
      borderColor: cBorderStrong,
      borderRadius: radiusControl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
    },

    cpContainer: {
      flexDirection: "row",
      backgroundColor: cSurfaceAlt,
      padding: 4,
      borderRadius: radiusControl + 2,
      marginTop: spacing * 3,
    },
    cpOpt: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing * 2 + 2,
      borderRadius: radiusControl - 2,
    },
    cpOptActive: {
      backgroundColor: cSurface,
      shadowColor: cTextMain,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    badgeInfo: {
      fontSize: 10,
      color: cInfo,
      backgroundColor: cBadgeInfoBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      overflow: "hidden",
    },
    badgeSale: {
      fontSize: 10,
      color: cDanger,
      backgroundColor: cBadgeSaleBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      overflow: "hidden",
    },

    accordionCard: {
      borderRadius: radiusCard,
      padding: 0,
      overflow: "hidden",
    },
    accHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing * 5,
      backgroundColor: cSurface,
    },
    selectedBadge: {
      backgroundColor: cBrandBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    checkListWrap: {
      paddingHorizontal: spacing * 5,
      paddingBottom: spacing * 5,
      borderTopWidth: 1,
      borderTopColor: cDivider,
      borderStyle: "dashed",
    },
    checkRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing * 3 + 2,
      borderBottomWidth: 1,
      borderBottomColor: cSurfaceAlt,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: cBorderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleActive: {
      borderColor: cPrimary,
      backgroundColor: cPrimary,
    },

    bottomBar: {
      backgroundColor: cSurface,
      borderTopWidth: 1,
      borderTopColor: cBorder,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 4,
    },
    bottomSummary: {
      flex: 1,
      minWidth: 0,
    },
    bottomSummaryValue: {
      marginTop: 2,
    },
    bottomActionButton: {
      flex: 1,
      minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52) + 2,
    },
    requestModalOverlay: {
      flex: 1,
      backgroundColor: cModalOverlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing * 5,
    },
    requestModalWrap: {
      width: "100%",
      maxWidth: 420,
    },
    requestModalCard: {
      borderRadius: radiusCard,
      padding: spacing * 5,
      gap: spacing * 3,
    },
    requestModalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: cBrandBg,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 2,
    },
    requestMetaBox: {
      backgroundColor: cSurfaceAlt,
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: cBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    requestActions: {
      gap: spacing * 2,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: cModalOverlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: cSurface,
      borderTopLeftRadius: radiusCard,
      borderTopRightRadius: radiusCard,
      paddingHorizontal: spacing * 5,
      paddingVertical: spacing * 2,
    },
    modalItem: {
      paddingVertical: spacing * 4,
      borderBottomWidth: 1,
      borderBottomColor: cSurfaceAlt,
    },

    iosPickerSheet: {
      backgroundColor: cSurface,
      borderTopLeftRadius: radiusCard,
      borderTopRightRadius: radiusCard,
      padding: spacing * 4,
      paddingBottom: spacing * 6,
    },
    iosPickerHeader: {
      flexDirection: "row",
      gap: spacing * 2 + 2,
      marginBottom: spacing * 2,
    },
    iosPickerBtn: {
      flex: 1,
    },
  });
});

export function QuoteCreatePage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const [startAddr, setStartAddr] = useState("");
  const [endAddr, setEndAddr] = useState("");
  const [startAddrDetail, setStartAddrDetail] = useState("");
  const [endAddrDetail, setEndAddrDetail] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(() => {
    const initial = new Date();
    initial.setHours(9, 0, 0, 0);
    return initial;
  });

  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [iosPickerValue, setIosPickerValue] = useState<Date | null>(null);

  const [cargoList, setCargoList] = useState<CargoItem[]>([{ id: 1, type: "", weight: "", volume: "" }]);

  const [tonIdx, setTonIdx] = useState(0);
  const [typeIdx, setTypeIdx] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isPool, setIsPool] = useState(false);

  const [isAccOpen, setIsAccOpen] = useState(false);
  const [selectedOpts, setSelectedOpts] = useState<string[]>([]);
  const [budget, setBudget] = useState("");

  const [modalMode, setModalMode] = useState<"TON" | "TYPE" | null>(null);
  const [isSubmitDoneOpen, setIsSubmitDoneOpen] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  const toggleOption = (id: string) => {
    setSelectedOpts((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAccOpen((prev) => !prev);
  };

  const openPicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    if (Platform.OS === "ios") {
      setIosPickerValue(mode === "date" ? date : time);
    }
  };

  const closePicker = () => {
    setPickerMode(null);
    setIosPickerValue(null);
  };

  const handleDateTimePick = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed" || !selectedDate) {
        closePicker();
        return;
      }
      if (pickerMode === "date") {
        setDate(selectedDate);
      } else if (pickerMode === "time") {
        setTime(selectedDate);
      }
      closePicker();
      return;
    }

    if (selectedDate) {
      setIosPickerValue(selectedDate);
    }
  };

  const confirmIosPicker = () => {
    if (!pickerMode) return;
    const next = iosPickerValue ?? (pickerMode === "date" ? date : time);
    if (pickerMode === "date") {
      setDate(next);
    } else {
      setTime(next);
    }
    closePicker();
  };

  const addCargo = () => {
    const newId = cargoList.length > 0 ? cargoList[cargoList.length - 1].id + 1 : 1;
    setCargoList((prev) => [...prev, { id: newId, type: "", weight: "", volume: "" }]);
  };

  const removeCargo = (id: number) => {
    setCargoList((prev) => prev.filter((cargo) => cargo.id !== id));
  };

  const updateCargo = (id: number, field: CargoField, value: string) => {
    setCargoList((prev) => prev.map((cargo) => (cargo.id === id ? { ...cargo, [field]: value } : cargo)));
  };

  const basePrice = VEHICLE_DATA[tonIdx]?.types[typeIdx]?.p ?? 0;
  const frozenPrice = isFrozen ? 30000 : 0;
  const optionPrice = selectedOpts.reduce((acc, id) => {
    const opt = EXTRA_OPTIONS.find((item) => item.id === id);
    return acc + (opt ? opt.price : 0);
  }, 0);

  let subTotal = basePrice + frozenPrice;
  if (isPool) subTotal = Math.floor(subTotal * 0.8);
  const finalPrice = subTotal + optionPrice;

  const mockSearch = (type: "start" | "end") => {
    if (type === "start") setStartAddr("서울 강남구 테헤란로 427");
    else setEndAddr("경기 성남시 분당구 판교역로");
  };

  const showAIHelp = () => {
    Alert.alert(
      "AI 추천",
      "화물 종류(박스), 무게(200kg)를 분석했습니다.\n\n[추천] 1톤 카고 차량이 적합합니다.\n[팁] 비 예보가 있으니 '방수/습기주의' 옵션을 추천드려요."
    );
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace("/(shipper)/quotes");
  };

  const submitQuoteRequest = () => {
    setSubmittedAt(new Date());
    setIsSubmitDoneOpen(true);
  };

  const closeSubmitDone = () => {
    setIsSubmitDoneOpen(false);
  };

  const goToQuoteList = () => {
    setIsSubmitDoneOpen(false);
    router.replace("/(shipper)/quotes");
  };

  return (
    <PageScaffold
      title="견적 요청"
      onPressBack={goBack}
      backgroundColor={theme.colors.bgMain}
      contentStyle={StyleSheet.flatten([styles.content, { paddingTop: 20 }])}
      bottomBar={
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bottomSummary}>
            <AppText variant="caption" color="textMuted">
              예상 견적
            </AppText>
            <AppText variant="title" weight="800" color="brandPrimary" style={styles.bottomSummaryValue}>
              {formatKrw(finalPrice)}
            </AppText>
          </View>
          <AppButton
            title="요청하기"
            size="lg"
            style={styles.bottomActionButton}
            onPress={submitQuoteRequest}
          />
        </View>
      }
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" weight="700" color="textSub">
            운송 구간 & 일시
          </AppText>
        </View>
        <AppCard outlined style={styles.card}>
          <View style={styles.routePoint}>
            <View style={styles.timelineLine} />
            <View style={[styles.dot, styles.dotStart]}>
              <AppText style={styles.dotText}>출</AppText>
            </View>

            <View style={styles.rowHalf}>
              <AppInput
                placeholder="발송인 이름"
                containerStyle={styles.inputContainer}
                shellStyle={styles.inputShell}
              />
              <AppInput
                placeholder="발송인 연락처"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                shellStyle={styles.inputShell}
              />
            </View>

            <Pressable
              onPress={() => mockSearch("start")}
              style={({ pressed }) => [
                styles.addrBtn,
                startAddr ? styles.addrBtnFilled : undefined,
                pressed ? PRESS_EFFECT : undefined,
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={startAddr ? theme.colors.textMain : theme.colors.textMuted}
              />
              <AppText style={startAddr ? styles.addrTextFilled : styles.addrText}>
                {startAddr || "출발지 주소 검색"}
              </AppText>
            </Pressable>
            {startAddr ? (
              <AppInput
                placeholder="상세주소 (예: 101동)"
                value={startAddrDetail}
                onChangeText={setStartAddrDetail}
                containerStyle={{ marginTop: 10 }}
                shellStyle={styles.inputShell}
              />
            ) : null}
          </View>

          <View style={[styles.routePoint, { marginBottom: 24 }]}>
            <View style={[styles.dot, styles.dotEnd]}>
              <AppText style={styles.dotText}>도</AppText>
            </View>

            <View style={styles.rowHalf}>
              <AppInput
                placeholder="수취인 이름"
                containerStyle={styles.inputContainer}
                shellStyle={styles.inputShell}
              />
              <AppInput
                placeholder="수취인 연락처"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
                shellStyle={styles.inputShell}
              />
            </View>

            <Pressable
              onPress={() => mockSearch("end")}
              style={({ pressed }) => [
                styles.addrBtn,
                endAddr ? styles.addrBtnFilled : undefined,
                pressed ? PRESS_EFFECT : undefined,
              ]}
            >
              <Ionicons name="search" size={18} color={endAddr ? theme.colors.textMain : theme.colors.textMuted} />
              <AppText style={endAddr ? styles.addrTextFilled : styles.addrText}>
                {endAddr || "도착지 주소 검색"}
              </AppText>
            </Pressable>
            {endAddr ? (
              <AppInput
                placeholder="상세주소 입력"
                value={endAddrDetail}
                onChangeText={setEndAddrDetail}
                containerStyle={{ marginTop: 10 }}
                shellStyle={styles.inputShell}
              />
            ) : null}
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.borderDefault, marginBottom: 20 }} />

          <View style={[styles.rowHalf, { marginBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textMuted" style={{ marginBottom: 4 }}>
                날짜
              </AppText>
              <Pressable style={styles.dateTimeTrigger} onPress={() => openPicker("date")}>
                <AppText variant="body" color="textMain">
                  {date.toLocaleDateString("ko-KR")}
                </AppText>
                <Ionicons name="calendar" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textMuted" style={{ marginBottom: 4 }}>
                시간
              </AppText>
              <Pressable style={styles.dateTimeTrigger} onPress={() => openPicker("time")}>
                <AppText variant="body" color="textMain">
                  {time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </AppText>
                <Ionicons name="time" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" weight="700" color="textSub">
            화물 정보
          </AppText>
        </View>
        <AppCard outlined style={styles.card}>
          {cargoList.map((cargo, index) => (
            <View key={cargo.id} style={styles.cargoItem}>
              <View style={styles.cargoHeader}>
                <AppText variant="caption" weight="700" color="textSub">
                  화물 #{index + 1}
                </AppText>
                {index > 0 && (
                  <TouchableOpacity onPress={() => removeCargo(cargo.id)}>
                    <AppText variant="caption" color="semanticDanger" weight="600">
                      삭제
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
              <AppInput
                placeholder="화물 종류 (예: 박스)"
                value={cargo.type}
                onChangeText={(value) => updateCargo(cargo.id, "type", value)}
                containerStyle={{ marginBottom: 10 }}
                shellStyle={[styles.inputShell, styles.inputShellSurface]}
              />
              <View style={[styles.rowHalf, { marginBottom: 0 }]}>
                <AppInput
                  placeholder="무게 (kg)"
                  keyboardType="numeric"
                  value={cargo.weight}
                  onChangeText={(value) => updateCargo(cargo.id, "weight", value)}
                  containerStyle={styles.inputContainer}
                  shellStyle={[styles.inputShell, styles.inputShellSurface]}
                />
                <AppInput
                  placeholder="부피 (CBM)"
                  keyboardType="numeric"
                  value={cargo.volume}
                  onChangeText={(value) => updateCargo(cargo.id, "volume", value)}
                  containerStyle={styles.inputContainer}
                  shellStyle={[styles.inputShell, styles.inputShellSurface]}
                />
              </View>
            </View>
          ))}

          <Pressable style={({ pressed }) => [styles.btnAddCargo, pressed ? PRESS_EFFECT : undefined]} onPress={addCargo}>
            <Ionicons name="add" size={18} color={theme.colors.brandPrimary} />
            <AppText color="brandPrimary" weight="700">
              화물 추가하기
            </AppText>
          </Pressable>

          <AppInput
            placeholder="기사님 전달사항 (선택)"
            multiline
            containerStyle={{ marginTop: 12 }}
            shellStyle={[styles.inputShell, styles.inputShellMultiline]}
          />
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" weight="700" color="textSub">
            차량 선택
          </AppText>
        </View>
        <AppCard outlined style={styles.card}>
          <Pressable style={({ pressed }) => [styles.aiBanner, pressed ? PRESS_EFFECT : undefined]} onPress={showAIHelp}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.aiIconCircle}>
                <Ionicons name="sparkles" size={16} color={theme.colors.brandPrimary} />
              </View>
              <AppText color="textOnBrand" weight="600" size={14}>
                어떤 차량이 맞을까요? AI 추천
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>

          <View style={[styles.rowHalf, { marginBottom: 0 }]}>
            <Pressable style={styles.ddTrigger} onPress={() => setModalMode("TON")}>
              <AppText weight="600">{VEHICLE_DATA[tonIdx]?.name}</AppText>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
            </Pressable>
            <Pressable style={styles.ddTrigger} onPress={() => setModalMode("TYPE")}>
              <AppText weight="600">{VEHICLE_DATA[tonIdx]?.types[typeIdx]?.n}</AppText>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.cpContainer, { marginTop: 12, marginBottom: 4 }]}>
            <Pressable onPress={() => setIsFrozen(false)} style={[styles.cpOpt, !isFrozen ? styles.cpOptActive : undefined]}>
              <AppText weight="600" color={!isFrozen ? "textMain" : "textMuted"}>
                일반 (상온)
              </AppText>
            </Pressable>
            <Pressable onPress={() => setIsFrozen(true)} style={[styles.cpOpt, isFrozen ? styles.cpOptActive : undefined]}>
              <AppText weight="600" color={isFrozen ? "textMain" : "textMuted"}>
                냉장 / 냉동
              </AppText>
              <AppText style={styles.badgeInfo}>+30,000원</AppText>
            </Pressable>
          </View>

          <View style={styles.cpContainer}>
            <Pressable onPress={() => setIsPool(false)} style={[styles.cpOpt, !isPool ? styles.cpOptActive : undefined]}>
              <AppText weight="600" color={!isPool ? "textMain" : "textMuted"}>
                독차 배송
              </AppText>
            </Pressable>
            <Pressable onPress={() => setIsPool(true)} style={[styles.cpOpt, isPool ? styles.cpOptActive : undefined]}>
              <AppText weight="600" color={isPool ? "textMain" : "textMuted"}>
                합짐 (혼적)
              </AppText>
              <AppText style={styles.badgeSale}>-20% 할인</AppText>
            </Pressable>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <AppCard outlined style={styles.accordionCard}>
          <Pressable style={styles.accHead} onPress={toggleAccordion}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText weight="700">화물 취급 주의 (선택)</AppText>
              {selectedOpts.length > 0 && (
                <View style={styles.selectedBadge}>
                  <AppText variant="caption" color="brandPrimary">
                    {selectedOpts.length}개 선택
                  </AppText>
                </View>
              )}
            </View>
            <Ionicons name={isAccOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
          </Pressable>

          {isAccOpen && (
            <View style={styles.checkListWrap}>
              {EXTRA_OPTIONS.map((opt) => {
                const active = selectedOpts.includes(opt.id);
                return (
                  <Pressable key={opt.id} style={styles.checkRow} onPress={() => toggleOption(opt.id)}>
                    <View>
                      <AppText weight="600" size={14}>
                        {opt.title}
                      </AppText>
                      <AppText variant="caption" color="textMuted">
                        +{formatKrw(opt.price)}
                      </AppText>
                    </View>
                    <View style={[styles.checkCircle, active ? styles.checkCircleActive : undefined]}>
                      {active && <Ionicons name="checkmark" size={14} color={theme.colors.textOnBrand} />}
                    </View>
                  </Pressable>
                );
              })}
              <View style={{ marginTop: 16 }}>
                <AppText variant="caption" weight="600" color="textSub" style={{ marginBottom: 6 }}>
                  희망 운임 (선택)
                </AppText>
                <AppInput
                  placeholder="예산 입력 (원)"
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  shellStyle={styles.inputShell}
                />
              </View>
            </View>
          )}
        </AppCard>
      </View>

      {pickerMode && Platform.OS === "android" ? (
        <DateTimePicker value={pickerMode === "date" ? date : time} mode={pickerMode} display="default" onChange={handleDateTimePick} />
      ) : null}

      {pickerMode && Platform.OS === "ios" ? (
        <Modal transparent animationType="slide" onRequestClose={closePicker}>
          <Pressable style={styles.modalOverlay} onPress={closePicker}>
            <Pressable style={styles.iosPickerSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.iosPickerHeader}>
                <AppButton title="취소" variant="secondary" size="sm" style={styles.iosPickerBtn} onPress={closePicker} />
                <AppButton title="확인" size="sm" style={styles.iosPickerBtn} onPress={confirmIosPicker} />
              </View>
              <DateTimePicker
                value={iosPickerValue ?? (pickerMode === "date" ? date : time)}
                mode={pickerMode}
                display="spinner"
                onChange={handleDateTimePick}
                textColor={theme.colors.textMain}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <Modal visible={isSubmitDoneOpen} transparent animationType="fade" onRequestClose={closeSubmitDone}>
        <Pressable style={styles.requestModalOverlay} onPress={closeSubmitDone}>
          <Pressable style={styles.requestModalWrap} onPress={(e) => e.stopPropagation()}>
            <AppCard outlined elevated={false} style={styles.requestModalCard}>
              <View style={styles.requestModalIcon}>
                <Ionicons name="checkmark" size={28} color={theme.colors.brandPrimary} />
              </View>

              <AppText variant="title" weight="800" color="textMain" align="center">
                요청이 접수되었어요
              </AppText>
              <AppText variant="detail" color="textSub" align="center">
                견적 제안이 도착하면 내역 화면에서 바로 확인할 수 있어요.
              </AppText>

              <View style={styles.requestMetaBox}>
                <AppText variant="caption" weight="700" color="textMuted">
                  접수 시각
                </AppText>
                <AppText variant="detail" weight="700" color="textMain">
                  {submittedAt ? submittedAt.toLocaleString("ko-KR") : "-"}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  예상 견적 {formatKrw(finalPrice)}
                </AppText>
              </View>

              <View style={styles.requestActions}>
                <AppButton title="내역 확인하기" size="lg" onPress={goToQuoteList} />
                <AppButton title="이 화면에서 계속 보기" variant="secondary" size="lg" onPress={closeSubmitDone} />
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalMode(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {modalMode === "TON" &&
              VEHICLE_DATA.map((v, i) => (
                <Pressable key={v.name} style={styles.modalItem} onPress={() => {
                  setTonIdx(i);
                  setTypeIdx(0);
                  setModalMode(null);
                }}>
                  <AppText weight={tonIdx === i ? "700" : "400"} color={tonIdx === i ? "brandPrimary" : "textMain"}>
                    {v.name}
                  </AppText>
                </Pressable>
              ))}
            {modalMode === "TYPE" &&
              VEHICLE_DATA[tonIdx]?.types.map((t, i) => (
                <Pressable key={t.n} style={styles.modalItem} onPress={() => {
                  setTypeIdx(i);
                  setModalMode(null);
                }}>
                  <AppText weight={typeIdx === i ? "700" : "400"} color={typeIdx === i ? "brandPrimary" : "textMain"}>
                    {t.n}
                  </AppText>
                </Pressable>
              ))}
          </Pressable>
        </Pressable>
      </Modal>
    </PageScaffold>
  );
}

export default QuoteCreatePage;
