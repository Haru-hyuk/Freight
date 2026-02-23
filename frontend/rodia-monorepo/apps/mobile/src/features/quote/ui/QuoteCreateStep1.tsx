import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  resolveAddressCoordinates,
  type ResolveAddressCoordinatesInput,
} from "@/features/quote/api/quote-address-geocode";
import {
  useQuoteCreateDraft,
  WORK_METHODS,
  type Waypoint,
} from "@/features/quote/model/quoteCreateDraft";
import { PostcodeModal } from "@/features/quote/ui/PostcodeModal";
import {
  getQuoteFlatCardStyle,
  QUOTE_PRESS_EFFECT,
  QUOTE_SCROLL_VIEW_PROPS,
} from "@/features/quote/ui/QuoteCreateUiPrimitives";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import type { AppTheme } from "@/shared/theme/types";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";

initLayoutAnimationForAndroid();

const MAX_WAYPOINTS = 3;

function formatPhoneNumber(input: string) {
  const digits = (input ?? "").replace(/[^\d]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

type AddressTarget = "start" | "end" | number;

type AddressSelectionPayload = {
  address?: string;
  roadAddress?: string;
  jibunAddress?: string;
  zonecode?: string;
  placeId?: string;
  place_id?: string;
  details?: unknown;
};

type CoordinateResolveTask = {
  target: AddressTarget;
  addressText: string;
  placeId?: string;
  details?: unknown;
};

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);
  const flatCard = getQuoteFlatCardStyle(theme);

  return StyleSheet.create({
    container: { gap: spacing * 3, paddingBottom: spacing * 8 },

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: c.textMain },
    statusWrap: { marginBottom: spacing * 2 },

    // [카드] 전체 타임라인 컨테이너
    routeCard: {
      ...flatCard,
      padding: spacing * 4,
    },
    
    // 개별 노드 (출발/경유/도착/버튼) Row
    routeRow: { flexDirection: "row", minHeight: 60 },
    
    // 왼쪽 타임라인 비주얼
    timelineCol: { alignItems: "center", width: 28, marginRight: 10 },
    nodeIcon: { 
      width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      zIndex: 2, backgroundColor: c.bgSurface 
    },
    nodeStart: { backgroundColor: c.textMain },
    nodeVia: { backgroundColor: c.bgSurface, borderWidth: 1.5, borderColor: c.textMuted },
    nodeEnd: { backgroundColor: c.brandPrimary },
    nodeTextStart: { fontSize: 10, color: c.textOnBrand, fontWeight: "700" },
    nodeTextVia: { fontSize: 10, color: c.textMuted, fontWeight: "700" },
    nodeTextEnd: { fontSize: 10, color: c.textOnBrand, fontWeight: "700" },

    lineSolid: { width: 2, flex: 1, backgroundColor: c.borderDefault, marginTop: 4, marginBottom: 0, borderRadius: 1 },
    lineSolidContinuous: { width: 2, flex: 1, backgroundColor: c.borderDefault, marginTop: 0, marginBottom: 0, borderRadius: 1 },
    
    // 오른쪽 컨텐츠 영역
    contentCol: { flex: 1, paddingBottom: 24 }, // 하단 여백으로 다음 노드와 간격 확보
    
    // 헤더 (라벨 + 삭제버튼)
    pointHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    pointLabel: { fontSize: 13, fontWeight: "700", color: c.textSub },
    
    // 주소 검색 버튼
    addrBtn: {
      flexDirection: "row", alignItems: "center", height: 44,
      paddingHorizontal: 12, backgroundColor: c.bgSurfaceAlt,
      borderRadius: radiusControl, borderWidth: 1, borderColor: c.borderDefault, gap: 8,
    },
    addrBtnFilled: { backgroundColor: tint(c.brandPrimary, 0.04, c.bgSurface), borderColor: c.brandPrimary },
    addrText: { flex: 1, fontSize: 14, fontWeight: "500", color: c.textSub },
    addrTextFilled: { fontWeight: "600", color: c.textMain },

    // 상세 입력 폼 (주소 선택 후 표시)
    formBox: { marginTop: 8, gap: 8 },
    rowHalf: { flexDirection: 'row', gap: 8 },
    inputShell: {
      height: 40, backgroundColor: c.bgSurface, borderRadius: 8,
      borderColor: c.borderDefault, borderWidth: 1, paddingHorizontal: 10, fontSize: 13
    },

    // 작업 방식 칩
    workLabel: { fontSize: 13, fontWeight: "700", color: c.textSub, marginTop: 4, marginBottom: 8 },
    chipScroll: { flexDirection: 'row', gap: 6 },
    workChip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
      borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface,
    },
    workChipActive: { backgroundColor: tint(c.brandPrimary, 0.1, c.bgSurface), borderColor: c.brandPrimary },
    workChipText: { fontSize: 12, fontWeight: "600", color: c.textSub },
    workChipTextActive: { color: c.brandPrimary },

    // 경유지 추가 버튼 (화물 추가 버튼과 동일한 스타일)
    addBtn: {
      height: 50, borderRadius: 14, borderWidth: 1, borderColor: c.brandPrimary,
      borderStyle: "dashed", backgroundColor: tint(c.brandPrimary, 0.05, c.bgSurface),
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8
    },
    addBtnFull: { width: "100%" },
    addBtnText: { color: c.brandPrimary, fontWeight: "700", fontSize: 15 },

    // 일정 카드
    scheduleCard: {
      ...flatCard,
      padding: spacing * 4,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: c.textMain },
    scheduleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    scheduleItem: { flex: 1 },
    scheduleLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600', marginBottom: 4 },
    scheduleBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 10, backgroundColor: c.bgSurfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: c.borderDefault
    },
    scheduleValue: { fontSize: 14, fontWeight: "700", color: c.textMain },
    divider: { width: 1, height: 32, backgroundColor: c.borderDefault, marginHorizontal: 12 },

    // [추가] 작업 방식 독립 카드
    workMethodCard: {
      ...flatCard,
      padding: spacing * 4,
    },
    workMethodContent: { gap: 16 },
    dividerHorizontal: { height: 1, backgroundColor: c.borderDefault, marginVertical: 4 },

    // 모달
    modalOverlay: { flex: 1, backgroundColor: tint(c.textMain, 0.5, c.textMain), justifyContent: "flex-end" },
    iosPickerSheet: {
      backgroundColor: c.bgSurface, borderTopLeftRadius: radiusCard, borderTopRightRadius: radiusCard,
      padding: spacing * 4, paddingBottom: spacing * 8,
    },
    iosHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing * 2 },
  });
});

export function QuoteCreateStep1() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { draft, patchDraft, setDraft } = useQuoteCreateDraft();

  // 주소 검색 모달 상태 관리
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [targetField, setTargetField] = useState<"start" | "end" | number | null>(null);

  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [iosPickerValue, setIosPickerValue] = useState<Date | null>(null);
  const [isResolvingCoords, setIsResolvingCoords] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [coordTask, setCoordTask] = useState<CoordinateResolveTask | null>(null);
  const coordRequestIdRef = useRef(0);

  const waypoints = draft?.waypoints ?? [];
  const canAddWaypoint = waypoints.length < MAX_WAYPOINTS;
  const hasAnySelectedAddress = useMemo(() => {
    const hasStart = (draft?.startAddr ?? "").trim().length > 0;
    const hasEnd = (draft?.endAddr ?? "").trim().length > 0;
    const hasWaypoint = waypoints.some((waypoint) => (waypoint?.addr ?? "").trim().length > 0);
    return hasStart || hasEnd || hasWaypoint;
  }, [draft?.endAddr, draft?.startAddr, waypoints]);

  const openPostcode = (type: "start" | "end" | number) => {
    setTargetField(type);
    setIsPostcodeOpen(true);
  };

  const closePostcode = useCallback(() => {
    setIsPostcodeOpen(false);
    setTargetField(null);
  }, []);

  const applyAddressToTarget = useCallback(
    (target: AddressTarget, selectedAddress: string) => {
      if (target === "start") {
        patchDraft({
          startAddr: selectedAddress,
          originLat: undefined,
          originLng: undefined,
        });
        return;
      }

      if (target === "end") {
        patchDraft({
          endAddr: selectedAddress,
          destinationLat: undefined,
          destinationLng: undefined,
        });
        return;
      }

      setDraft((prev) => {
        const currentWaypoints = Array.isArray(prev?.waypoints) ? prev.waypoints : [];
        const nextWaypoints = currentWaypoints.map((waypoint) =>
          waypoint?.id === target
            ? {
                ...waypoint,
                addr: selectedAddress,
                lat: undefined,
                lng: undefined,
              }
            : waypoint
        );
        return { ...prev, waypoints: nextWaypoints };
      });
    },
    [patchDraft, setDraft]
  );

  const applyCoordinatesToTarget = useCallback(
    (target: AddressTarget, lat: number, lng: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      if (target === "start") {
        patchDraft({ originLat: lat, originLng: lng });
        return;
      }

      if (target === "end") {
        patchDraft({ destinationLat: lat, destinationLng: lng });
        return;
      }

      setDraft((prev) => {
        const currentWaypoints = Array.isArray(prev?.waypoints) ? prev.waypoints : [];
        const nextWaypoints = currentWaypoints.map((waypoint) =>
          waypoint?.id === target
            ? {
                ...waypoint,
                lat,
                lng,
              }
            : waypoint
        );
        return { ...prev, waypoints: nextWaypoints };
      });
    },
    [patchDraft, setDraft]
  );

  const resolveCoordinatesForTask = useCallback(
    async (task: CoordinateResolveTask) => {
      const requestId = coordRequestIdRef.current + 1;
      coordRequestIdRef.current = requestId;
      setIsResolvingCoords(true);
      setCoordError(null);

      const input: ResolveAddressCoordinatesInput = {
        addressText: task?.addressText,
        placeId: task?.placeId,
        details: task?.details,
      };

      try {
        const result = await resolveAddressCoordinates(input);
        if (coordRequestIdRef.current !== requestId) return;

        const lat = result?.coordinates?.lat;
        const lng = result?.coordinates?.lng;
        const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

        if (hasCoordinates) {
          applyCoordinatesToTarget(task.target, Number(lat), Number(lng));
          setCoordError(null);
          return;
        }

        setCoordError(
          (result?.errorMessage ?? "").trim() || "선택한 주소의 좌표를 찾지 못했습니다. 다시 시도해 주세요."
        );
      } catch {
        if (coordRequestIdRef.current !== requestId) return;
        setCoordError("주소 좌표 조회 중 오류가 발생했습니다. 다시 시도해 주세요.");
      } finally {
        if (coordRequestIdRef.current === requestId) {
          setIsResolvingCoords(false);
        }
      }
    },
    [applyCoordinatesToTarget]
  );

  const retryResolveCoordinates = useCallback(() => {
    if (!coordTask) return;
    void resolveCoordinatesForTask(coordTask);
  }, [coordTask, resolveCoordinatesForTask]);

  const handleAddressSelected = useCallback((data: AddressSelectionPayload) => {
    const selectedAddress = String(data?.address ?? data?.roadAddress ?? data?.jibunAddress ?? "").trim();
    if (!selectedAddress) {
      closePostcode();
      return;
    }

    const selectedTarget = targetField;
    closePostcode();

    if (selectedTarget === null) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    applyAddressToTarget(selectedTarget, selectedAddress);

    const placeId = String(data?.placeId ?? data?.place_id ?? "").trim();
    const task: CoordinateResolveTask = {
      target: selectedTarget,
      addressText: selectedAddress,
      placeId: placeId || undefined,
      details: data?.details,
    };
    setCoordTask(task);
    void resolveCoordinatesForTask(task);
  }, [applyAddressToTarget, closePostcode, resolveCoordinatesForTask, targetField]);

  // --- Handlers ---
  const addWaypoint = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const lastId = waypoints.length > 0 ? waypoints[waypoints.length - 1].id : 0;
    const newWp: Waypoint = { id: lastId + 1, name: "", phone: "", addr: "", detail: "" };
    patchDraft({ waypoints: [...waypoints, newWp] });
  };

  const removeWaypoint = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = waypoints.filter((w) => w.id !== id);
    patchDraft({ waypoints: next });
  };

  const updateWaypoint = (id: number, patch: Partial<Waypoint>) => {
    const next = waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w));
    patchDraft({ waypoints: next });
  };

  // --- Components ---
  // 💡 title 프롭을 받도록 수정된 컴포넌트
  const WorkMethodSelector = ({ title, current, onChange }: { title: string, current: string, onChange: (v: string) => void }) => (
    <View>
      <AppText style={styles.workLabel}>{title}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {WORK_METHODS.map((method) => {
          const active = current === method;
          return (
            <Pressable
              key={method}
              onPress={() => onChange(method)}
              style={[styles.workChip, active && styles.workChipActive]}
            >
              <AppText style={[styles.workChipText, active && styles.workChipTextActive]}>{method}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // 날짜 선택기 관련
  const openPicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    if (Platform.OS === "ios") setIosPickerValue(mode === "date" ? draft?.date : draft?.time);
  };
  const closePicker = () => { setPickerMode(null); setIosPickerValue(null); };
  const handlePickerChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
        if (!date) { closePicker(); return; }
        if (pickerMode === "date") patchDraft({ date });
        if (pickerMode === "time") patchDraft({ time: date });
        closePicker();
    } else if (date) setIosPickerValue(date);
  };
  const confirmIos = () => {
    const next = iosPickerValue ?? new Date();
    if (pickerMode === "date") patchDraft({ date: next });
    if (pickerMode === "time") patchDraft({ time: next });
    closePicker();
  };

  return (
    <>
      <ScrollView {...QUOTE_SCROLL_VIEW_PROPS} contentContainerStyle={styles.container}>
        {/* 1. 경로 입력 (타임라인) */}
        <View>
          <View style={styles.statusWrap}>
            {isResolvingCoords ? (
              <AppSpinner label="주소 좌표를 확인하는 중입니다." />
            ) : coordError ? (
              <AppErrorState
                title="좌표를 확인하지 못했어요"
                description={coordError}
                retryLabel="다시 시도"
                onRetry={retryResolveCoordinates}
              />
            ) : !hasAnySelectedAddress ? (
              <AppErrorState
                title="주소를 검색해 주세요."
                description="출발지, 도착지 또는 경유지를 선택하면 좌표가 자동으로 입력됩니다."
              />
            ) : null}
          </View>
          <View style={styles.routeCard}>
               <View style={styles.sectionHeader}>
            <Ionicons name="map-outline" size={18} color={theme.colors.brandPrimary} />
            <AppText style={styles.sectionTitle}>운송 경로</AppText>
          </View>
              {/* [출발지] */}
              <View style={styles.routeRow}>
                  <View style={styles.timelineCol}>
                      <View style={[styles.nodeIcon, styles.nodeStart]}>
                          <AppText style={styles.nodeTextStart}>출</AppText>
                      </View>
                      <View style={styles.lineSolid} />
                  </View>
                  <View style={styles.contentCol}>
                      <View style={styles.pointHeader}>
                          <AppText style={styles.pointLabel}>출발지</AppText>
                      </View>
                      
                      <Pressable onPress={() => openPostcode("start")} style={[styles.addrBtn, draft?.startAddr ? styles.addrBtnFilled : undefined]}>
                          <AppText style={[styles.addrText, draft?.startAddr && styles.addrTextFilled]} numberOfLines={1}>
                              {draft?.startAddr || "주소 검색"}
                          </AppText>
                          <Ionicons name="search" size={16} color={draft?.startAddr ? theme.colors.brandPrimary : theme.colors.textMuted} />
                      </Pressable>

                      {draft?.startAddr && (
                          <View style={styles.formBox}>
                              <AppInput placeholder="상세 주소 (예: 101동 지하주차장)" value={draft?.startAddrDetail} onChangeText={v => patchDraft({ startAddrDetail: v })} shellStyle={styles.inputShell} />
                              
                              <View style={styles.rowHalf}>
                                  <AppInput placeholder="발송인 이름" value={draft?.senderName} onChangeText={v => patchDraft({ senderName: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                  <AppInput
                                    placeholder="연락처"
                                    keyboardType="phone-pad"
                                    value={draft?.senderPhone}
                                    onChangeText={v => patchDraft({ senderPhone: formatPhoneNumber(v) })}
                                    maxLength={13}
                                    shellStyle={styles.inputShell}
                                    containerStyle={{ flex: 1 }}
                                  />
                              </View>
                              {/* 💡 상차 방식 폼 여기서 제거됨 */}
                          </View>
                      )}
                  </View>
              </View>

              {/* [경유지 리스트] */}
              {waypoints.map((wp, idx) => {
                const waypointAddress = String(wp?.addr ?? "").trim();
                const waypointDetail = String(wp?.detail ?? "");
                const waypointName = String(wp?.name ?? "");
                const waypointPhone = String(wp?.phone ?? "");

                return (
                  <View key={wp.id} style={styles.routeRow}>
                      <View style={styles.timelineCol}>
                          <View style={[styles.nodeIcon, styles.nodeVia]}>
                              <AppText style={styles.nodeTextVia}>{idx + 1}</AppText>
                          </View>
                          <View style={styles.lineSolid} />
                      </View>
                      <View style={styles.contentCol}>
                          <View style={styles.pointHeader}>
                              <AppText style={styles.pointLabel}>경유지 {idx + 1}</AppText>
                              <Pressable onPress={() => removeWaypoint(wp.id)} hitSlop={8}>
                                  <Ionicons name="close" size={16} color={theme.colors.textMuted} />
                              </Pressable>
                          </View>

                          <Pressable onPress={() => openPostcode(wp.id)} style={[styles.addrBtn, waypointAddress ? styles.addrBtnFilled : undefined]}>
                              <AppText style={[styles.addrText, waypointAddress && styles.addrTextFilled]} numberOfLines={1}>
                                  {waypointAddress || "경유지 주소 검색"}
                              </AppText>
                              <Ionicons name="search" size={16} color={waypointAddress ? theme.colors.brandPrimary : theme.colors.textMuted} />
                          </Pressable>

                          <View style={styles.formBox}>
                              <AppInput placeholder="상세 주소" value={waypointDetail} onChangeText={v => updateWaypoint(wp.id, { detail: v })} shellStyle={styles.inputShell} />
                              <View style={styles.rowHalf}>
                                  <AppInput placeholder="담당자" value={waypointName} onChangeText={v => updateWaypoint(wp.id, { name: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                  <AppInput
                                    placeholder="연락처"
                                    keyboardType="phone-pad"
                                    value={waypointPhone}
                                    onChangeText={v => updateWaypoint(wp.id, { phone: formatPhoneNumber(v) })}
                                    maxLength={13}
                                    shellStyle={styles.inputShell}
                                    containerStyle={{ flex: 1 }}
                                  />
                              </View>
                          </View>
                      </View>
                  </View>
                );
              })}

              {/* [경유지 추가 버튼] */}
              {canAddWaypoint && (
                  <View style={[styles.routeRow, { minHeight: 0 }]}>
                      <View style={styles.timelineCol}>
                          <View style={styles.lineSolidContinuous} />
                      </View>
                      
                      <View style={[styles.contentCol, { paddingBottom: 16 }]}>
                          <Pressable style={({pressed}) => [styles.addBtn, styles.addBtnFull, pressed && QUOTE_PRESS_EFFECT]} onPress={addWaypoint}>
                              <Ionicons name="add-circle" size={22} color={theme.colors.brandPrimary} />
                              <AppText style={styles.addBtnText}>경유지 추가</AppText>
                          </Pressable>
                      </View>
                  </View>
              )}

              {/* [도착지] */}
              <View style={[styles.routeRow, { minHeight: 0 }]}>
                  <View style={styles.timelineCol}>
                      <View style={[styles.nodeIcon, styles.nodeEnd]}>
                          <AppText style={styles.nodeTextEnd}>도</AppText>
                      </View>
                  </View>
                  <View style={[styles.contentCol, { paddingBottom: 0 }]}>
                      <View style={styles.pointHeader}>
                          <AppText style={styles.pointLabel}>도착지</AppText>
                      </View>

                      <Pressable onPress={() => openPostcode("end")} style={[styles.addrBtn, draft?.endAddr ? styles.addrBtnFilled : undefined]}>
                          <AppText style={[styles.addrText, draft?.endAddr && styles.addrTextFilled]} numberOfLines={1}>
                              {draft?.endAddr || "주소 검색"}
                          </AppText>
                          <Ionicons name="search" size={16} color={draft?.endAddr ? theme.colors.brandPrimary : theme.colors.textMuted} />
                      </Pressable>

                      {draft?.endAddr && (
                          <View style={styles.formBox}>
                              <AppInput placeholder="상세 주소 입력" value={draft?.endAddrDetail} onChangeText={(v) => patchDraft({ endAddrDetail: v })} shellStyle={styles.inputShell} />
                              <View style={styles.rowHalf}>
                                  <AppInput placeholder="수취인 이름" value={draft?.receiverName} onChangeText={(v) => patchDraft({ receiverName: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                  <AppInput
                                    placeholder="연락처"
                                    keyboardType="phone-pad"
                                    value={draft?.receiverPhone}
                                    onChangeText={(v) => patchDraft({ receiverPhone: formatPhoneNumber(v) })}
                                    maxLength={13}
                                    shellStyle={styles.inputShell}
                                    containerStyle={{ flex: 1 }}
                                  />
                              </View>
                              {/* 💡 하차 방식 폼 여기서 제거됨 */}
                          </View>
                      )}
                  </View>
              </View>

          </View>
        </View>

        {/* 2. 일정 입력 */}
        <View style={styles.scheduleCard}>
           <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.brandPrimary} />
              <AppText style={styles.cardTitle}>운송 일정</AppText>
           </View>

           <View style={styles.scheduleRow}>
              <Pressable style={styles.scheduleItem} onPress={() => openPicker("date")}>
                 <AppText style={styles.scheduleLabel}>날짜</AppText>
                 <View style={styles.scheduleBox}>
                     <Ionicons name="calendar" size={16} color={theme.colors.textMain} />
                     <AppText style={styles.scheduleValue}>{draft?.date?.toLocaleDateString("ko-KR")}</AppText>
                 </View>
              </Pressable>

              <View style={styles.divider} />

              <Pressable style={styles.scheduleItem} onPress={() => openPicker("time")}>
                 <AppText style={styles.scheduleLabel}>상차 시간</AppText>
                 <View style={styles.scheduleBox}>
                     <Ionicons name="time-outline" size={16} color={theme.colors.textMain} />
                     <AppText style={styles.scheduleValue}>{draft?.time?.toLocaleTimeString("ko-KR", {hour:'2-digit', minute:'2-digit'})}</AppText>
                 </View>
              </Pressable>
           </View>
        </View>

        {/* 3. 상·하차 작업 방식 */}
        <View style={styles.workMethodCard}>
           <View style={styles.cardHeader}>
              <Ionicons name="cube-outline" size={18} color={theme.colors.brandPrimary} />
              <AppText style={styles.cardTitle}>상·하차 방식</AppText>
           </View>

           <View style={styles.workMethodContent}>
              <WorkMethodSelector 
                title="출발지 (상차) 작업 방식" 
                current={draft?.loadMethod} 
                onChange={v => patchDraft({ loadMethod: v as any })} 
              />

              <View style={styles.dividerHorizontal} />

              <WorkMethodSelector 
                title="도착지 (하차) 작업 방식" 
                current={draft?.unloadMethod} 
                onChange={v => patchDraft({ unloadMethod: v as any })} 
              />
           </View>
        </View>

        {/* DatePicker Modal */}
        {pickerMode && Platform.OS === "android" && <DateTimePicker value={new Date()} mode={pickerMode} onChange={handlePickerChange} />}
        {pickerMode && Platform.OS === "ios" && (
          <Modal transparent visible animationType="fade">
              <Pressable style={styles.modalOverlay} onPress={closePicker}>
                  <View style={styles.iosPickerSheet}>
                      <View style={styles.iosHeader}>
                          <Pressable onPress={closePicker}><AppText>취소</AppText></Pressable>
                          <Pressable onPress={confirmIos}><AppText color="brandPrimary" weight="700">확인</AppText></Pressable>
                      </View>
                      <DateTimePicker value={iosPickerValue || new Date()} mode={pickerMode} display="spinner" onChange={handlePickerChange} textColor={theme.colors.textMain} />
                  </View>
              </Pressable>
          </Modal>
        )}
      </ScrollView>

      {/* [추가] 주소 검색 모달 */}
      <PostcodeModal
        visible={isPostcodeOpen}
        onClose={closePostcode}
        onSelected={handleAddressSelected}
      />
    </>
  );
}

export default QuoteCreateStep1;
