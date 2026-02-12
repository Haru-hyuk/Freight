// apps/mobile/src/features/quote/ui/QuoteCreateStep1.tsx
import React, { useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import {
  useQuoteCreateDraft,
  WORK_METHODS,
  type QuoteCreateDraft,
  type Waypoint,
} from "@/features/quote/model/quoteCreateDraft";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRESS_EFFECT: ViewStyle = { opacity: 0.92, transform: [{ scale: 0.98 }] };

const LOAD_ROLES: QuoteCreateDraft["loadRole"][] = ["고객상차", "기사상차"];
const UNLOAD_ROLES: QuoteCreateDraft["unloadRole"][] = ["고객하차", "기사하차"];

const useStyles = createThemedStyles((theme: AppTheme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);

  const overlay = tint(theme.colors.textMain, 0.45, "rgba(0,0,0,0.45)");
  const brandBg = tint(theme.colors.brandPrimary, 0.1, theme.colors.bgSurfaceAlt);
  const stopPillBg = tint(theme.colors.textSub, 0.08, theme.colors.bgSurfaceAlt);
  const stopPillBorder = tint(theme.colors.borderDefault, 0.9, theme.colors.borderDefault);

  const segmentBg = theme.colors.bgSurfaceAlt;
  const segmentActiveBg = theme.colors.bgSurface;

  return StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing * 2 + 2,
      paddingHorizontal: spacing,
    },
    subHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing * 2 + 2,
      paddingHorizontal: spacing,
      marginTop: spacing * 4,
    },

    card: { borderRadius: radiusCard, padding: spacing * 5 },

    routePoint: { marginBottom: spacing * 8, position: "relative", paddingLeft: spacing * 8 },
    timelineLine: {
      position: "absolute",
      left: 11,
      top: 24,
      bottom: -20,
      width: 0,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.borderStrong,
      borderStyle: "dashed",
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
    dotStart: { backgroundColor: theme.colors.textMain },
    dotStop: { backgroundColor: theme.colors.textSub },
    dotEnd: { backgroundColor: theme.colors.brandPrimary },
    dotText: { color: theme.colors.textOnBrand, fontSize: 10, fontWeight: "800" },

    rowHalf: {
      flexDirection: "row",
      gap: spacing * 2 + 2,
      marginBottom: spacing * 2 + 2,
      alignItems: "flex-start",
    },
    inputContainer: { flex: 1 },
    inputShell: {
      minHeight: 52,
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderRadius: radiusControl,
      borderColor: theme.colors.borderDefault,
      borderWidth: 1,
      paddingHorizontal: 14,
    },

    addrBtn: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      gap: 8,
    },
    addrBtnFilled: { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.brandPrimary },
    addrText: { fontSize: 15, fontWeight: "500", color: theme.colors.textSub },
    addrTextFilled: { fontWeight: "700", color: theme.colors.textMain },

    addStopBtn: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: theme.colors.brandPrimary,
      borderStyle: "dashed",
      borderRadius: radiusControl,
      backgroundColor: brandBg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
    },

    stopHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    stopTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    stopIndexPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: stopPillBg,
      borderWidth: 1,
      borderColor: stopPillBorder,
    },

    // Work card
    workCardRow: { marginBottom: spacing * 4 },
    workRowTitle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: segmentBg,
      padding: 4,
      borderRadius: radiusControl + 2,
      marginBottom: 12,
    },
    segmentOpt: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing * 2 + 2,
      borderRadius: radiusControl - 2,
    },
    segmentOptActive: {
      backgroundColor: segmentActiveBg,
      shadowColor: theme.colors.textMain,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },

    workMethodGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    workBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
    },
    workBadgeActive: {
      backgroundColor: theme.colors.brandPrimary,
      borderColor: theme.colors.brandPrimary,
      shadowColor: theme.colors.brandPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    workBadgeText: { fontSize: 13, fontWeight: "500", color: theme.colors.textSub },
    workBadgeTextActive: { fontWeight: "700", color: theme.colors.textOnBrand },

    // Date/Time
    dateTimeTrigger: {
      flex: 1,
      minHeight: 52,
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      justifyContent: "space-between",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
    },

    // Picker Modal
    modalOverlay: { flex: 1, backgroundColor: overlay, justifyContent: "flex-end" },
    iosPickerSheet: {
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: radiusCard,
      borderTopRightRadius: radiusCard,
      padding: spacing * 4,
      paddingBottom: spacing * 6,
    },
    iosPickerHeader: { flexDirection: "row", gap: spacing * 2 + 2, marginBottom: spacing * 2 },
  });
});

export function QuoteCreateStep1() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { draft, patchDraft } = useQuoteCreateDraft();

  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [iosPickerValue, setIosPickerValue] = useState<Date | null>(null);

  const waypoints: Waypoint[] = (draft?.waypoints ?? []) as Waypoint[];

  const setWaypoints = (next: Waypoint[]) => {
    patchDraft({ waypoints: next ?? [] });
  };

  const addWaypoint = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const lastId = waypoints?.[waypoints.length - 1]?.id ?? 0;
    const next: Waypoint[] = [
      ...(waypoints ?? []),
      { id: lastId + 1, name: "", phone: "", addr: "", detail: "" },
    ];
    setWaypoints(next);
  };

  const removeWaypoint = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = (waypoints ?? []).filter((w) => (w?.id ?? -1) !== id);
    setWaypoints(next);
  };

  const updateWaypoint = (id: number, patch: Partial<Waypoint>) => {
    const next = (waypoints ?? []).map((w) => ((w?.id ?? -1) === id ? { ...w, ...(patch ?? {}) } : w));
    setWaypoints(next);
  };

  const openPicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    if (Platform.OS === "ios") {
      setIosPickerValue(mode === "date" ? (draft?.date ?? new Date()) : (draft?.time ?? new Date()));
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
      if (pickerMode === "date") patchDraft({ date: selectedDate });
      if (pickerMode === "time") patchDraft({ time: selectedDate });
      closePicker();
      return;
    }
    if (selectedDate) setIosPickerValue(selectedDate);
  };

  const confirmIosPicker = () => {
    if (!pickerMode) return;
    const next = iosPickerValue ?? (pickerMode === "date" ? (draft?.date ?? new Date()) : (draft?.time ?? new Date()));
    if (pickerMode === "date") patchDraft({ date: next });
    if (pickerMode === "time") patchDraft({ time: next });
    closePicker();
  };

  const mockSearch = (type: "start" | "end") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (type === "start") patchDraft({ startAddr: "서울 강남구 테헤란로 427" });
    else patchDraft({ endAddr: "경기 성남시 분당구 판교역로" });
  };

  const mockSearchWaypoint = (id: number, index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const samples = ["서울 중구 세종대로 110", "서울 송파구 올림픽로 300", "인천 연수구 센트럴로 123"];
    const addr = samples?.[index % samples.length] ?? "서울 중구 세종대로 110";
    updateWaypoint(id, { addr });
  };

  const renderMethodBadges = (
    currentMethod: QuoteCreateDraft["loadMethod"] | QuoteCreateDraft["unloadMethod"],
    onChange: (v: (typeof WORK_METHODS)[number]) => void
  ) => (
    <View style={styles.workMethodGroup}>
      {WORK_METHODS.map((m) => {
        const isActive = (currentMethod ?? "수작업") === m;
        return (
          <Pressable
            key={m}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onChange(m);
            }}
            style={({ pressed }) => [
              styles.workBadge,
              isActive ? styles.workBadgeActive : undefined,
              pressed ? PRESS_EFFECT : undefined,
            ]}
          >
            <AppText style={isActive ? styles.workBadgeTextActive : styles.workBadgeText}>{m}</AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const renderRoleSegment = <T extends string>(
    value: T,
    options: readonly T[],
    onChange: (v: T) => void
  ) => (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = (value ?? options[0]) === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onChange(opt);
            }}
            style={({ pressed }) => [
              styles.segmentOpt,
              active ? styles.segmentOptActive : undefined,
              pressed ? PRESS_EFFECT : undefined,
            ]}
          >
            <AppText weight={active ? "800" : "600"} color={active ? "textMain" : "textMuted"}>
              {opt}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const loadRole = (draft?.loadRole ?? "고객상차") as QuoteCreateDraft["loadRole"];
  const unloadRole = (draft?.unloadRole ?? "기사하차") as QuoteCreateDraft["unloadRole"];
  const loadMethod = (draft?.loadMethod ?? "수작업") as QuoteCreateDraft["loadMethod"];
  const unloadMethod = (draft?.unloadMethod ?? "수작업") as QuoteCreateDraft["unloadMethod"];

  return (
    <View>
      <View style={styles.sectionHeader}>
        <AppText variant="heading" weight="700" color="textSub">
          운송 구간
        </AppText>
      </View>

      {/* 1) 주소/경유지 카드 */}
      <AppCard outlined style={styles.card}>
        {/* 출발지 */}
        <View style={styles.routePoint}>
          <View style={styles.timelineLine} />
          <View style={[styles.dot, styles.dotStart]}>
            <AppText style={styles.dotText}>출</AppText>
          </View>

          <View style={styles.rowHalf}>
            <AppInput
              placeholder="발송인 이름"
              value={draft?.senderName ?? ""}
              onChangeText={(v) => patchDraft({ senderName: v ?? "" })}
              containerStyle={styles.inputContainer}
              shellStyle={styles.inputShell}
            />
            <AppInput
              placeholder="발송인 연락처"
              keyboardType="phone-pad"
              value={draft?.senderPhone ?? ""}
              onChangeText={(v) => patchDraft({ senderPhone: v ?? "" })}
              containerStyle={styles.inputContainer}
              shellStyle={styles.inputShell}
            />
          </View>

          <Pressable
            onPress={() => mockSearch("start")}
            style={({ pressed }) => [
              styles.addrBtn,
              (draft?.startAddr ?? "") ? styles.addrBtnFilled : undefined,
              pressed ? PRESS_EFFECT : undefined,
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={(draft?.startAddr ?? "") ? theme.colors.textMain : theme.colors.textMuted}
            />
            <AppText style={(draft?.startAddr ?? "") ? styles.addrTextFilled : styles.addrText}>
              {(draft?.startAddr ?? "") || "출발지 주소 검색"}
            </AppText>
          </Pressable>

          {(draft?.startAddr ?? "") ? (
            <AppInput
              placeholder="상세주소 (예: 101동 302호)"
              value={draft?.startAddrDetail ?? ""}
              onChangeText={(v) => patchDraft({ startAddrDetail: v ?? "" })}
              containerStyle={{ marginTop: 10 }}
              shellStyle={styles.inputShell}
            />
          ) : null}
        </View>

        {/* 경유지들 */}
        {(waypoints ?? []).map((w, idx) => (
          <View key={w?.id ?? idx} style={styles.routePoint}>
            <View style={styles.timelineLine} />
            <View style={[styles.dot, styles.dotStop]}>
              <AppText style={styles.dotText}>경</AppText>
            </View>

            <View style={styles.stopHeadRow}>
              <View style={styles.stopTitleWrap}>
                <View style={styles.stopIndexPill}>
                  <AppText variant="caption" weight="800" color="textSub">
                    경유지 {idx + 1}
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={() => removeWaypoint(w?.id ?? -1)}
                hitSlop={8}
                style={({ pressed }) => [pressed ? PRESS_EFFECT : undefined]}
              >
                <AppText variant="caption" weight="700" color="semanticDanger">
                  삭제
                </AppText>
              </Pressable>
            </View>

            <View style={styles.rowHalf}>
              <AppInput
                placeholder="담당자 이름"
                value={w?.name ?? ""}
                onChangeText={(v) => updateWaypoint(w?.id ?? -1, { name: v ?? "" })}
                containerStyle={styles.inputContainer}
                shellStyle={styles.inputShell}
              />
              <AppInput
                placeholder="담당자 연락처"
                keyboardType="phone-pad"
                value={w?.phone ?? ""}
                onChangeText={(v) => updateWaypoint(w?.id ?? -1, { phone: v ?? "" })}
                containerStyle={styles.inputContainer}
                shellStyle={styles.inputShell}
              />
            </View>

            <Pressable
              onPress={() => mockSearchWaypoint(w?.id ?? -1, idx)}
              style={({ pressed }) => [
                styles.addrBtn,
                (w?.addr ?? "") ? styles.addrBtnFilled : undefined,
                pressed ? PRESS_EFFECT : undefined,
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={(w?.addr ?? "") ? theme.colors.textMain : theme.colors.textMuted}
              />
              <AppText style={(w?.addr ?? "") ? styles.addrTextFilled : styles.addrText}>
                {(w?.addr ?? "") || "경유지 주소 검색"}
              </AppText>
            </Pressable>

            {(w?.addr ?? "") ? (
              <AppInput
                placeholder="상세주소 (선택)"
                value={w?.detail ?? ""}
                onChangeText={(v) => updateWaypoint(w?.id ?? -1, { detail: v ?? "" })}
                containerStyle={{ marginTop: 10 }}
                shellStyle={styles.inputShell}
              />
            ) : null}
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.addStopBtn, pressed ? PRESS_EFFECT : undefined]}
          onPress={addWaypoint}
        >
          <Ionicons name="add" size={18} color={theme.colors.brandPrimary} />
          <AppText color="brandPrimary" weight="800">
            경유지 추가
          </AppText>
        </Pressable>

        {/* 도착지 */}
        <View style={[styles.routePoint, { marginBottom: 0, marginTop: 16 }]}>
          <View style={[styles.dot, styles.dotEnd]}>
            <AppText style={styles.dotText}>도</AppText>
          </View>

          <View style={styles.rowHalf}>
            <AppInput
              placeholder="수취인 이름"
              value={draft?.receiverName ?? ""}
              onChangeText={(v) => patchDraft({ receiverName: v ?? "" })}
              containerStyle={styles.inputContainer}
              shellStyle={styles.inputShell}
            />
            <AppInput
              placeholder="수취인 연락처"
              keyboardType="phone-pad"
              value={draft?.receiverPhone ?? ""}
              onChangeText={(v) => patchDraft({ receiverPhone: v ?? "" })}
              containerStyle={styles.inputContainer}
              shellStyle={styles.inputShell}
            />
          </View>

          <Pressable
            onPress={() => mockSearch("end")}
            style={({ pressed }) => [
              styles.addrBtn,
              (draft?.endAddr ?? "") ? styles.addrBtnFilled : undefined,
              pressed ? PRESS_EFFECT : undefined,
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={(draft?.endAddr ?? "") ? theme.colors.textMain : theme.colors.textMuted}
            />
            <AppText style={(draft?.endAddr ?? "") ? styles.addrTextFilled : styles.addrText}>
              {(draft?.endAddr ?? "") || "도착지 주소 검색"}
            </AppText>
          </Pressable>

          {(draft?.endAddr ?? "") ? (
            <AppInput
              placeholder="상세주소 입력"
              value={draft?.endAddrDetail ?? ""}
              onChangeText={(v) => patchDraft({ endAddrDetail: v ?? "" })}
              containerStyle={{ marginTop: 10 }}
              shellStyle={styles.inputShell}
            />
          ) : null}
        </View>
      </AppCard>

      {/* 2) 작업 방식 카드 */}
      <View style={styles.subHeader}>
        <AppText variant="heading" weight="700" color="textSub">
          작업 방식
        </AppText>
      </View>

      <AppCard outlined style={styles.card}>
        <View style={styles.workCardRow}>
          <View style={styles.workRowTitle}>
            <AppText weight="800" color="textMain">
              상차
            </AppText>
            <AppText variant="caption" color="textMuted">
              {(loadRole ?? "고객상차") + " · " + (loadMethod ?? "수작업")}
            </AppText>
          </View>

          {renderRoleSegment<QuoteCreateDraft["loadRole"]>(
            loadRole,
            LOAD_ROLES,
            (v) => patchDraft({ loadRole: v })
          )}

          {renderMethodBadges(loadMethod, (v) => patchDraft({ loadMethod: v }))}
        </View>

        <View style={[styles.workCardRow, { marginBottom: 0 }]}>
          <View style={styles.workRowTitle}>
            <AppText weight="800" color="textMain">
              하차
            </AppText>
            <AppText variant="caption" color="textMuted">
              {(unloadRole ?? "기사하차") + " · " + (unloadMethod ?? "수작업")}
            </AppText>
          </View>

          {renderRoleSegment<QuoteCreateDraft["unloadRole"]>(
            unloadRole,
            UNLOAD_ROLES,
            (v) => patchDraft({ unloadRole: v })
          )}

          {renderMethodBadges(unloadMethod, (v) => patchDraft({ unloadMethod: v }))}
        </View>
      </AppCard>

      {/* 3) 날짜/시간 카드 */}
      <View style={styles.subHeader}>
        <AppText variant="heading" weight="700" color="textSub">
          운송 일정
        </AppText>
      </View>

      <AppCard outlined style={styles.card}>
        <View style={[styles.rowHalf, { marginBottom: 0 }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="textMuted" style={{ marginBottom: 4 }}>
              날짜
            </AppText>
            <Pressable style={styles.dateTimeTrigger} onPress={() => openPicker("date")}>
              <AppText variant="body" color="textMain">
                {draft?.date?.toLocaleDateString?.("ko-KR") ?? "-"}
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
                {draft?.time?.toLocaleTimeString?.("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? "-"}
              </AppText>
              <Ionicons name="time" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </AppCard>

      {pickerMode && Platform.OS === "android" ? (
        <DateTimePicker
          value={pickerMode === "date" ? (draft?.date ?? new Date()) : (draft?.time ?? new Date())}
          mode={pickerMode}
          display="default"
          onChange={handleDateTimePick}
        />
      ) : null}

      {pickerMode && Platform.OS === "ios" ? (
        <Modal transparent animationType="slide" onRequestClose={closePicker}>
          <Pressable style={styles.modalOverlay} onPress={closePicker}>
            <Pressable style={styles.iosPickerSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.iosPickerHeader}>
                <Pressable
                  onPress={closePicker}
                  style={({ pressed }) => [
                    { flex: 1, paddingVertical: 10, alignItems: "center" },
                    pressed ? PRESS_EFFECT : undefined,
                  ]}
                >
                  <AppText weight="700" color="textSub">
                    취소
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={confirmIosPicker}
                  style={({ pressed }) => [
                    { flex: 1, paddingVertical: 10, alignItems: "center" },
                    pressed ? PRESS_EFFECT : undefined,
                  ]}
                >
                  <AppText weight="800" color="brandPrimary">
                    확인
                  </AppText>
                </Pressable>
              </View>

              <DateTimePicker
                value={
                  iosPickerValue ??
                  (pickerMode === "date" ? (draft?.date ?? new Date()) : (draft?.time ?? new Date()))
                }
                mode={pickerMode}
                display="spinner"
                onChange={handleDateTimePick}
                textColor={theme.colors.textMain}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

export default QuoteCreateStep1;
