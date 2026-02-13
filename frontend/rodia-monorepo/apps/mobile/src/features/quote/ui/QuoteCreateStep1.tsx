import React, { useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import {
  useQuoteCreateDraft,
  WORK_METHODS,
  type Waypoint,
} from "@/features/quote/model/quoteCreateDraft";
import { PostcodeModal } from "@/features/quote/ui/PostcodeModal"; 

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_WAYPOINTS = 3;

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);

  return StyleSheet.create({
    container: { gap: spacing * 3, paddingBottom: spacing * 8 },

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: c.textMain },

    // [카드] 전체 타임라인 컨테이너
    routeCard: {
      backgroundColor: c.bgSurface, borderRadius: radiusCard, padding: spacing * 4,
      borderWidth: 1, borderColor: c.borderDefault,
      shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
    },
    
    // 개별 노드 (출발/경유/도착) Row
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
    nodeTextStart: { fontSize: 10, color: "#fff", fontWeight: "700" },
    nodeTextVia: { fontSize: 10, color: c.textMuted, fontWeight: "700" },
    nodeTextEnd: { fontSize: 10, color: "#fff", fontWeight: "700" },

    lineSolid: { width: 2, flex: 1, backgroundColor: c.borderDefault, marginVertical: 4, borderRadius: 1 },
    
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
    workLabel: { fontSize: 11, fontWeight: "600", color: c.textMuted, marginTop: 4, marginBottom: 4 },
    chipScroll: { flexDirection: 'row', gap: 6 },
    workChip: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface,
    },
    workChipActive: { backgroundColor: tint(c.brandPrimary, 0.1, c.bgSurface), borderColor: c.brandPrimary },
    workChipText: { fontSize: 11, fontWeight: "600", color: c.textSub },
    workChipTextActive: { color: c.brandPrimary },

    // 경유지 추가 버튼
    addViaWrapper: { flexDirection: 'row', alignItems: 'center', marginLeft: 38, marginBottom: 20 },
    addViaBtn: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: c.bgSurfaceAlt, borderRadius: 6, borderWidth: 1, borderColor: c.borderDefault, borderStyle: 'dashed'
    },
    addViaText: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginLeft: 4 },

    // 일정 카드
    scheduleCard: {
      backgroundColor: c.bgSurface, borderRadius: radiusCard, padding: spacing * 4,
      borderWidth: 1, borderColor: c.borderDefault, 
      flexDirection: "row", alignItems: "center", justifyContent: 'space-between'
    },
    scheduleItem: { flex: 1 },
    scheduleLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600', marginBottom: 4 },
    scheduleBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 10, backgroundColor: c.bgSurfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: c.borderDefault
    },
    scheduleValue: { fontSize: 14, fontWeight: "700", color: c.textMain },
    divider: { width: 1, height: 32, backgroundColor: c.borderDefault, marginHorizontal: 12 },

    // 모달
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
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
  const { draft, patchDraft } = useQuoteCreateDraft();

  // 주소 검색 모달 상태 관리
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [targetField, setTargetField] = useState<"start" | "end" | number | null>(null);

  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [iosPickerValue, setIosPickerValue] = useState<Date | null>(null);

  const waypoints = draft?.waypoints ?? [];
  const canAddWaypoint = waypoints.length < MAX_WAYPOINTS;

  type AddressPayload = {
    address?: string;
    roadAddress?: string;
    jibunAddress?: string;
    zonecode?: string;
  };

  const openPostcode = (type: "start" | "end" | number) => {
    setTargetField(type);
    setIsPostcodeOpen(true);
  };

  const closePostcode = () => {
    setIsPostcodeOpen(false);
    setTargetField(null);
  };

  const handleAddressSelected = (data: AddressPayload) => {
    const selectedAddress = String(data?.address ?? data?.roadAddress ?? data?.jibunAddress ?? "").trim();
    if (!selectedAddress) {
      closePostcode();
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (targetField === "start") {
      patchDraft({ startAddr: selectedAddress });
    } else if (targetField === "end") {
      patchDraft({ endAddr: selectedAddress });
    } else if (typeof targetField === "number") {
      const next = (waypoints || []).map((w) => 
        (w.id === targetField ? { ...w, addr: selectedAddress } : w)
      );
      patchDraft({ waypoints: next });
    }
    closePostcode();
  };

  // --- Handlers ---
  const addWaypoint = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const lastId = waypoints.length > 0 ? waypoints[waypoints.length - 1].id : 0;
    // 경유지는 작업방식 생략 (간소화) - 필요한 경우 추가 가능
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
  const WorkMethodSelector = ({ current, onChange }: { current: string, onChange: (v: string) => void }) => (
    <View>
      <AppText style={styles.workLabel}>작업 방식</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {WORK_METHODS.map((method) => {
          const active = current === method;
          return (
            <Pressable
              key={method}
              onPress={() => onChange(method)}
              style={[styles.workChip, active && styles.workChipActive]}
            >
              <AppText style={active ? styles.workChipTextActive : styles.workChipText}>{method}</AppText>
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
      <ScrollView contentContainerStyle={styles.container}>
        {/* 1. 경로 입력 (타임라인) */}
        <View>
          <View style={styles.sectionHeader}>
            <Ionicons name="map-outline" size={18} color={theme.colors.brandPrimary} />
            <AppText style={styles.sectionTitle}>운송 경로</AppText>
          </View>

          <View style={styles.routeCard}>
              
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
                          <AppText style={draft?.startAddr ? styles.addrTextFilled : styles.addrText} numberOfLines={1}>
                              {draft?.startAddr || "주소 검색"}
                          </AppText>
                          <Ionicons name="search" size={16} color={draft?.startAddr ? theme.colors.brandPrimary : theme.colors.textMuted} />
                      </Pressable>

                      {draft?.startAddr && (
                          <View style={styles.formBox}>
                              {/* 상세 주소 한 줄 */}
                              <AppInput placeholder="상세 주소 (예: 101동 지하주차장)" value={draft?.startAddrDetail} onChangeText={v => patchDraft({ startAddrDetail: v })} shellStyle={styles.inputShell} />
                              
                              {/* 담당자 / 연락처 반반 */}
                              <View style={styles.rowHalf}>
                                  <AppInput placeholder="발송인 이름" value={draft?.senderName} onChangeText={v => patchDraft({ senderName: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                  <AppInput placeholder="연락처" keyboardType="phone-pad" value={draft?.senderPhone} onChangeText={v => patchDraft({ senderPhone: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                              </View>
                              
                              {/* 작업 방식 가로 스크롤 */}
                              <WorkMethodSelector current={draft?.loadMethod} onChange={v => patchDraft({ loadMethod: v as any })} />
                          </View>
                      )}
                  </View>
              </View>

              {/* [경유지 리스트] */}
              {waypoints.map((wp, idx) => (
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

                          <Pressable onPress={() => openPostcode(wp.id)} style={[styles.addrBtn, wp.addr ? styles.addrBtnFilled : undefined]}>
                              <AppText style={wp.addr ? styles.addrTextFilled : styles.addrText} numberOfLines={1}>
                                  {wp.addr || "경유지 주소 검색"}
                              </AppText>
                              <Ionicons name="search" size={16} color={wp.addr ? theme.colors.brandPrimary : theme.colors.textMuted} />
                          </Pressable>

                          {wp.addr && (
                              <View style={styles.formBox}>
                                  <AppInput placeholder="상세 주소" value={wp.detail} onChangeText={v => updateWaypoint(wp.id, { detail: v })} shellStyle={styles.inputShell} />
                                  <View style={styles.rowHalf}>
                                      <AppInput placeholder="담당자" value={wp.name} onChangeText={v => updateWaypoint(wp.id, { name: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                      <AppInput placeholder="연락처" keyboardType="phone-pad" value={wp.phone} onChangeText={v => updateWaypoint(wp.id, { phone: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                  </View>
                              </View>
                          )}
                      </View>
                  </View>
              ))}

              {/* [경유지 추가 버튼] - 타임라인 사이에 배치 */}
              {canAddWaypoint && (
                  <Pressable style={styles.addViaWrapper} onPress={addWaypoint}>
                      <View style={styles.addViaBtn}>
                          <Ionicons name="add" size={12} color={theme.colors.textMuted} />
                          <AppText style={styles.addViaText}>경유지 추가</AppText>
                      </View>
                  </Pressable>
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
                          <AppText style={draft?.endAddr ? styles.addrTextFilled : styles.addrText} numberOfLines={1}>
                              {draft?.endAddr || "주소 검색"}
                          </AppText>
                          <Ionicons name="search" size={16} color={draft?.endAddr ? theme.colors.brandPrimary : theme.colors.textMuted} />
                      </Pressable>

                      {draft?.endAddr && (
                          <View style={styles.formBox}>
                              <AppInput placeholder="상세 주소 입력" value={draft?.endAddrDetail} onChangeText={(v) => patchDraft({ endAddrDetail: v })} shellStyle={styles.inputShell} />
                              <View style={styles.rowHalf}>
                                  <AppInput placeholder="수취인 이름" value={draft?.receiverName} onChangeText={(v) => patchDraft({ receiverName: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                                  <AppInput placeholder="연락처" keyboardType="phone-pad" value={draft?.receiverPhone} onChangeText={(v) => patchDraft({ receiverPhone: v })} shellStyle={styles.inputShell} containerStyle={{ flex: 1 }} />
                              </View>
                              <WorkMethodSelector current={draft?.unloadMethod} onChange={v => patchDraft({ unloadMethod: v as any })} />
                          </View>
                      )}
                  </View>
              </View>

          </View>
        </View>

        {/* 2. 일정 입력 */}
        <View>
           <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.brandPrimary} />
              <AppText style={styles.sectionTitle}>운송 일정</AppText>
           </View>
           
           <View style={styles.scheduleCard}>
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
  onClose={() => setIsPostcodeOpen(false)}
  onSelected={handleAddressSelected}
/>
    </>
  );
}

export default QuoteCreateStep1;
