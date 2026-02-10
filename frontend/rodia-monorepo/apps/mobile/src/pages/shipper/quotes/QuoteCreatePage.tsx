import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DateType = "즉시" | "예약";
type Vehicle = {
  id: string;
  name: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  price: number;
};
type ExtraOption = { id: string; title: string; description: string; price: number };

const VEHICLES: Vehicle[] = [
  { id: "light-van", name: "라보/다마스", hint: "소형 화물", icon: "cube-outline", price: 40000 },
  { id: "cargo-1t", name: "1톤 카고", hint: "일반 소형 운송", icon: "cube", price: 80000 },
  { id: "wing-5t", name: "5톤 윙바디", hint: "팔레트/중형 운송", icon: "car-outline", price: 120000 },
  { id: "cargo-11t", name: "11톤 카고", hint: "대형 장거리 운송", icon: "bus-outline", price: 180000 },
];

const EXTRA_OPTIONS: ExtraOption[] = [
  { id: "helper", title: "상하차 보조", description: "기사와 보조 인력이 함께 작업합니다.", price: 20000 },
  { id: "express", title: "긴급 배차", description: "우선 배차로 빠르게 차량을 연결합니다.", price: 10000 },
  { id: "stairs", title: "계단 작업", description: "엘리베이터 없는 현장 작업 포함", price: 5000 },
];

const KOR_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const PRESS_EFFECT: ViewStyle = { opacity: 0.92, transform: [{ scale: 0.98 }] };

function formatKrw(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString()}원`;
}

function formatDateKorean(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = KOR_WEEKDAYS[date.getDay()] ?? "";
  return `${y}년 ${m}월 ${d}일 (${w})`;
}

function formatTimeKorean(date: Date) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const isPm = hour >= 12;
  const period = isPm ? "오후" : "오전";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}:${String(minute).padStart(2, "0")}`;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const radiusCard = safeNumber(theme?.components?.card?.radius, 16);
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const cardPadding = safeNumber(theme?.components?.card?.paddingMd, 20);

  const cBase = safeString(theme?.colors?.bgMain, "#F8FAFC");
  const cWhite = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cInputBg = safeString(theme?.colors?.bgSurfaceAlt, "#F1F5F9");
  const cTextMain = safeString(theme?.colors?.textMain, "#0F172A");
  const cTextSub = safeString(theme?.colors?.textSub, "#475569");
  const cTextHint = safeString(theme?.colors?.textMuted, "#94A3B8");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cShadow = safeString(theme?.colors?.textMain, "#000000");
  const cOverlay = tint(cTextMain, 0.35, "rgba(15,23,42,0.35)");

  const floatingCard = {
    backgroundColor: cWhite,
    borderWidth: 1,
    borderColor: cBorder,
    shadowColor: cShadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as ViewStyle;

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      backgroundColor: cBase,
    },
    section: {
      marginBottom: spacing * 5,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontWeight: "900",
    },
    requiredBadge: {
      borderRadius: 999,
      backgroundColor: tint(cPrimary, 0.09, cWhite),
      paddingHorizontal: spacing * 2,
      paddingVertical: Math.max(3, spacing),
    },

    groupedCard: {
      borderRadius: radiusCard,
      padding: cardPadding,
      gap: spacing * 3,
      ...floatingCard,
    },
    inputShell: {
      backgroundColor: cInputBg,
      borderColor: cBorder,
      borderRadius: radiusControl,
    },

    routeConnector: {
      position: "absolute",
      left: cardPadding + 6,
      top: cardPadding + 34,
      bottom: cardPadding + 34,
      width: 1,
      borderLeftWidth: 2,
      borderStyle: "dashed",
      borderLeftColor: tint(cBorder, 0.95, cBorder),
    },
    routeRow: {
      position: "relative",
    },
    routeDot: {
      position: "absolute",
      left: 0,
      top: 22,
      width: 12,
      height: 12,
      borderRadius: 6,
      zIndex: 3,
    },
    routeDotStart: {
      backgroundColor: cTextMain,
    },
    routeDotEnd: {
      backgroundColor: cWhite,
      borderWidth: 3,
      borderColor: cPrimary,
    },
    routeFields: {
      marginLeft: spacing * 6,
      gap: spacing * 2,
    },

    dateTypeRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    dateTypeItem: {
      flex: 1,
      borderRadius: radiusControl,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 3,
      gap: spacing,
      ...floatingCard,
    },
    dateTypeActive: {
      borderColor: cPrimary,
    },
    reserveFieldRow: {
      flexDirection: "row",
      gap: spacing * 2,
      marginTop: spacing * 2,
    },
    reserveField: {
      flex: 1,
      borderRadius: radiusControl,
      minHeight: 56,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
      justifyContent: "center",
      gap: 4,
      ...floatingCard,
    },
    reserveFieldLabel: {
      color: cTextHint,
      fontWeight: "700",
    },
    reserveFieldValue: {
      color: cTextMain,
      fontWeight: "800",
    },

    vehicleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 2,
    },
    vehicleItem: {
      width: "48.5%",
      borderRadius: radiusControl,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 3,
      alignItems: "center",
      gap: spacing,
      ...floatingCard,
    },
    vehicleItemActive: {
      borderColor: cPrimary,
    },

    twoCols: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    col: {
      flex: 1,
    },

    optionItem: {
      borderRadius: radiusControl,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 2,
      ...floatingCard,
    },
    optionItemActive: {
      borderColor: cPrimary,
    },
    optionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: cTextHint,
      backgroundColor: cWhite,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxActive: {
      borderColor: cPrimary,
      backgroundColor: cPrimary,
    },

    bottomBar: {
      backgroundColor: cWhite,
      borderTopWidth: 1,
      borderTopColor: cBorder,
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: spacing * 2,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    totalTitle: {
      fontWeight: "700",
      color: cTextSub,
    },
    totalValue: {
      fontWeight: "900",
      color: cTextMain,
    },
    submitButton: {
      minWidth: 160,
    },

    iosPickerBackdrop: {
      flex: 1,
      backgroundColor: cOverlay,
      justifyContent: "flex-end",
    },
    iosPickerCard: {
      backgroundColor: cWhite,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
    },
    iosPickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    successOverlay: {
      flex: 1,
      backgroundColor: cOverlay,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    successCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: radiusCard,
      backgroundColor: cWhite,
      padding: cardPadding,
      alignItems: "center",
      gap: spacing * 2,
      ...floatingCard,
    },
    successIcon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: cPrimary,
      marginBottom: spacing,
    },
  });
});

export function QuoteCreatePage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const cTextMain = safeString(theme?.colors?.textMain, "#0F172A");
  const cTextSub = safeString(theme?.colors?.textSub, "#475569");
  const cTextHint = safeString(theme?.colors?.textMuted, "#94A3B8");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);

  const [origin, setOrigin] = useState("경기 성남시 분당구");
  const [originDetail, setOriginDetail] = useState("");
  const [destination, setDestination] = useState("충북 청주시 흥덕구");
  const [destinationDetail, setDestinationDetail] = useState("");

  const [dateType, setDateType] = useState<DateType>("즉시");
  const [reserveDate, setReserveDate] = useState<Date>(new Date(2026, 1, 10));
  const [reserveTime, setReserveTime] = useState<Date>(new Date(2026, 1, 10, 9, 0, 0, 0));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [cargoName, setCargoName] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [cargoVolume, setCargoVolume] = useState("");

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(VEHICLES[0]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const optionsTotal = useMemo(
    () => EXTRA_OPTIONS.filter((item) => selectedOptions.includes(item.id)).reduce((acc, cur) => acc + cur.price, 0),
    [selectedOptions]
  );
  const totalPrice = useMemo(() => selectedVehicle.price + optionsTotal, [selectedVehicle.price, optionsTotal]);

  const pageContentStyle = useMemo(
    () => ({
      ...(StyleSheet.flatten(styles.content) as object),
      paddingBottom: insets.bottom + 148 + spacing * 4,
    }),
    [insets.bottom, spacing, styles.content]
  );

  const canSubmit =
    origin.trim().length > 0 && destination.trim().length > 0 && cargoName.trim().length > 0 && !isSubmitting;

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const onChangeDate = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed" || !value) return;
    setReserveDate(value);
  };

  const onChangeTime = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed" || !value) return;
    setReserveTime(value);
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    router.replace("/(shipper)/quotes");
  };

  const openProfile = () => {
    router.push("/(shipper)/profile");
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (!canSubmit) {
      Alert.alert("필수 입력 확인", "출발지, 도착지, 화물명은 필수 입력 항목입니다.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 800);
  };

  const goToQuoteList = () => {
    setShowSuccess(false);
    router.replace("/(shipper)/quotes");
  };

  const bottomBar = (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.bottomRow}>
        <View>
          <AppText variant="caption" style={styles.totalTitle}>
            예상 결제 금액
          </AppText>
          <AppText variant="title" style={styles.totalValue}>
            {formatKrw(totalPrice)}
          </AppText>
        </View>

        <AppButton
          accessibilityLabel="견적 요청하기"
          disabled={!canSubmit}
          onPress={handleSubmit}
          size="lg"
          style={styles.submitButton}
          title={isSubmitting ? "요청 접수 중..." : "견적 요청하기"}
          right={!isSubmitting ? <Ionicons name="chevron-forward" size={18} color={cOnBrand} /> : undefined}
        />
      </View>
    </View>
  );

  return (
    <PageScaffold
      title="견적 요청"
      subtitle="운송 정보를 입력해 주세요"
      onPressBack={goBack}
      headerRight={
        <AppButton
          onPress={openProfile}
          variant="secondary"
          size="icon"
          accessibilityLabel="프로필 열기"
        >
          <Ionicons name="person-outline" size={18} color={cTextMain} />
        </AppButton>
      }
      contentStyle={pageContentStyle}
      bottomBar={bottomBar}
      backgroundColor="bgMain"
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" style={styles.sectionTitle} color={cTextMain}>
            경로 정보
          </AppText>
          <View style={styles.requiredBadge}>
            <AppText variant="caption" weight="800" color={cPrimary}>
              필수
            </AppText>
          </View>
        </View>

        <AppCard style={styles.groupedCard} elevated={false} outlined={false}>
          <View style={styles.routeConnector} />

          <View style={styles.routeRow}>
            <View style={[styles.routeDot, styles.routeDotStart]} />
            <View style={styles.routeFields}>
              <AppInput
                value={origin}
                onChangeText={setOrigin}
                placeholder="출발지 (상차지)"
                shellStyle={styles.inputShell}
                inputStyle={{ fontWeight: "600" }}
              />
              <AppInput
                value={originDetail}
                onChangeText={setOriginDetail}
                placeholder="상세 주소 (층/호수/건물명)"
                shellStyle={styles.inputShell}
                inputStyle={{ fontWeight: "600" }}
              />
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={[styles.routeDot, styles.routeDotEnd]} />
            <View style={styles.routeFields}>
              <AppInput
                value={destination}
                onChangeText={setDestination}
                placeholder="도착지 (하차지)"
                shellStyle={styles.inputShell}
                inputStyle={{ fontWeight: "600" }}
              />
              <AppInput
                value={destinationDetail}
                onChangeText={setDestinationDetail}
                placeholder="상세 주소 (층/호수/건물명)"
                shellStyle={styles.inputShell}
                inputStyle={{ fontWeight: "600" }}
              />
            </View>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" style={styles.sectionTitle} color={cTextMain}>
            상차 희망 일시
          </AppText>
        </View>

        <View style={styles.dateTypeRow}>
          <Pressable
            onPress={() => setDateType("즉시")}
            style={({ pressed }) => [
              styles.dateTypeItem,
              dateType === "즉시" ? styles.dateTypeActive : undefined,
              pressed ? PRESS_EFFECT : undefined,
            ]}
          >
            <AppText variant="body" weight="800" color={dateType === "즉시" ? cPrimary : cTextMain}>
              즉시 상차
            </AppText>
            <AppText variant="caption" color={cTextSub}>
              가능한 기사님 우선 배차
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setDateType("예약")}
            style={({ pressed }) => [
              styles.dateTypeItem,
              dateType === "예약" ? styles.dateTypeActive : undefined,
              pressed ? PRESS_EFFECT : undefined,
            ]}
          >
            <AppText variant="body" weight="800" color={dateType === "예약" ? cPrimary : cTextMain}>
              예약 상차
            </AppText>
            <AppText variant="caption" color={cTextSub}>
              원하는 날짜/시간 지정
            </AppText>
          </Pressable>
        </View>

        {dateType === "예약" ? (
          <View style={styles.reserveFieldRow}>
            <Pressable onPress={() => setShowDatePicker(true)} style={({ pressed }) => [styles.reserveField, pressed ? PRESS_EFFECT : undefined]}>
              <AppText variant="caption" style={styles.reserveFieldLabel}>
                날짜
              </AppText>
              <AppText variant="detail" style={styles.reserveFieldValue}>
                {formatDateKorean(reserveDate)}
              </AppText>
            </Pressable>

            <Pressable onPress={() => setShowTimePicker(true)} style={({ pressed }) => [styles.reserveField, pressed ? PRESS_EFFECT : undefined]}>
              <AppText variant="caption" style={styles.reserveFieldLabel}>
                시간
              </AppText>
              <AppText variant="detail" style={styles.reserveFieldValue}>
                {formatTimeKorean(reserveTime)}
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" style={styles.sectionTitle} color={cTextMain}>
            차량 선택
          </AppText>
        </View>

        <View style={styles.vehicleGrid}>
          {VEHICLES.map((vehicle) => {
            const active = selectedVehicle.id === vehicle.id;
            return (
              <Pressable
                key={vehicle.id}
                onPress={() => setSelectedVehicle(vehicle)}
                style={({ pressed }) => [
                  styles.vehicleItem,
                  active ? styles.vehicleItemActive : undefined,
                  pressed ? PRESS_EFFECT : undefined,
                ]}
              >
                <Ionicons name={vehicle.icon} size={22} color={active ? cPrimary : cTextSub} />
                <AppText variant="detail" weight="800" color={cTextMain}>
                  {vehicle.name}
                </AppText>
                <AppText variant="caption" color={cTextHint}>
                  {vehicle.hint}
                </AppText>
                <AppText variant="caption" weight="800" color={active ? cPrimary : cTextSub}>
                  {formatKrw(vehicle.price)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" style={styles.sectionTitle} color={cTextMain}>
            화물 상세 정보
          </AppText>
        </View>

        <AppCard style={styles.groupedCard} elevated={false} outlined={false}>
          <AppInput
            label="화물명"
            value={cargoName}
            onChangeText={setCargoName}
            placeholder="예: 의류 박스, 전자부품, 생활가전"
            helperText="정확한 화물명을 입력하면 매칭 정확도가 높아집니다."
            shellStyle={styles.inputShell}
            inputStyle={{ fontWeight: "600" }}
          />

          <View style={styles.twoCols}>
            <View style={styles.col}>
              <AppInput
                label="총 중량 (kg)"
                value={cargoWeight}
                onChangeText={setCargoWeight}
                placeholder="0"
                keyboardType="numeric"
                shellStyle={styles.inputShell}
                inputStyle={{ fontWeight: "600" }}
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="부피 (CBM)"
                value={cargoVolume}
                onChangeText={setCargoVolume}
                placeholder="0"
                keyboardType="numeric"
                shellStyle={styles.inputShell}
                inputStyle={{ fontWeight: "600" }}
              />
            </View>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" style={styles.sectionTitle} color={cTextMain}>
            추가 옵션
          </AppText>
        </View>

        <View>
          {EXTRA_OPTIONS.map((option) => {
            const checked = selectedOptions.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => toggleOption(option.id)}
                style={({ pressed }) => [
                  styles.optionItem,
                  checked ? styles.optionItemActive : undefined,
                  pressed ? PRESS_EFFECT : undefined,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="detail" weight="800" color={cTextMain}>
                    {option.title}
                  </AppText>
                  <AppText variant="caption" color={cTextHint}>
                    {option.description}
                  </AppText>
                </View>

                <View style={styles.optionRight}>
                  <AppText variant="detail" weight="800" color={checked ? cPrimary : cTextSub}>
                    +{formatKrw(option.price)}
                  </AppText>
                  <View style={[styles.checkbox, checked ? styles.checkboxActive : undefined]}>
                    {checked ? <Ionicons name="checkmark" size={14} color={cOnBrand} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showDatePicker && Platform.OS === "android" ? (
        <DateTimePicker
          value={reserveDate}
          mode="date"
          display="default"
          locale="ko-KR"
          minimumDate={new Date()}
          onChange={onChangeDate}
        />
      ) : null}

      {showTimePicker && Platform.OS === "android" ? (
        <DateTimePicker
          value={reserveTime}
          mode="time"
          display="default"
          locale="ko-KR"
          is24Hour={false}
          onChange={onChangeTime}
        />
      ) : null}

      <Modal visible={showDatePicker && Platform.OS === "ios"} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.iosPickerBackdrop}>
          <View style={styles.iosPickerCard}>
            <View style={styles.iosPickerHeader}>
              <AppText variant="heading" weight="900" color={cTextMain}>
                날짜 선택
              </AppText>
              <AppButton title="완료" size="sm" onPress={() => setShowDatePicker(false)} />
            </View>
            <DateTimePicker
              value={reserveDate}
              mode="date"
              display="spinner"
              locale="ko-KR"
              minimumDate={new Date()}
              onChange={onChangeDate}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showTimePicker && Platform.OS === "ios"} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.iosPickerBackdrop}>
          <View style={styles.iosPickerCard}>
            <View style={styles.iosPickerHeader}>
              <AppText variant="heading" weight="900" color={cTextMain}>
                시간 선택
              </AppText>
              <AppButton title="완료" size="sm" onPress={() => setShowTimePicker(false)} />
            </View>
            <DateTimePicker
              value={reserveTime}
              mode="time"
              display="spinner"
              locale="ko-KR"
              is24Hour={false}
              onChange={onChangeTime}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={42} color={cOnBrand} />
            </View>
            <AppText variant="heading" weight="900" color={cTextMain} align="center">
              견적 요청이 접수되었습니다
            </AppText>
            <AppText variant="detail" color={cTextSub} align="center">
              기사님 매칭이 시작되었습니다. 요청 내역에서 진행 상황을 확인할 수 있습니다.
            </AppText>
            <AppButton title="요청 내역 보기" size="lg" onPress={goToQuoteList} style={{ width: "100%" }} />
          </View>
        </View>
      </Modal>
    </PageScaffold>
  );
}

export default QuoteCreatePage;
