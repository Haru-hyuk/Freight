import React, { useMemo, useState, useEffect } from "react";
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import { QUOTE_PRESS_EFFECT } from "@/features/quote/ui/QuoteCreateUiPrimitives";
import {
  CARGO_ITEM_CATEGORIES,
  getDropOffTargets,
  useQuoteCreateDraft,
  type CargoItemCategory,
  DROP_OFF_END,
} from "@/features/quote/model/quoteCreateDraft";

// --- 프리셋 데이터 ---
const PRESETS = {
  BOX: { l: "48", w: "38", h: "34", label: "우체국 5호 박스", desc: "48x38x34cm" },
  PALLET: { l: "110", w: "110", h: "120", label: "표준 팔레트", desc: "110x110x120cm" },
  FURNITURE: {
    items: [
      { id: "desk", label: "책상", l: "120", w: "60", h: "75" },
      { id: "chair", label: "의자", l: "50", w: "50", h: "90" },
      { id: "bed_s", label: "침대(S)", l: "200", w: "100", h: "50" },
      { id: "sofa_3", label: "3인소파", l: "200", w: "90", h: "90" },
      { id: "cabinet", label: "수납장", l: "80", w: "40", h: "120" },
    ]
  }
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  BOX: "cube",
  PALLET: "layers",
  FURNITURE: "bed",
};

// CBM 계산
function calculateCBM(l: string, w: string, h: string, qty: string) {
  const ln = parseFloat(l || "0");
  const wn = parseFloat(w || "0");
  const hn = parseFloat(h || "0");
  const qn = Math.max(parseFloat(qty || "1"), 1);
  if (ln <= 0 || wn <= 0 || hn <= 0) return "0.0";
  return ((ln / 100) * (wn / 100) * (hn / 100) * qn).toFixed(2);
}

function digitsOnly(input: string) {
  return (input ?? "").replace(/[^\d]/g, "");
}

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);

  return StyleSheet.create({
    container: { gap: spacing * 2, paddingBottom: spacing * 6 },
    
    // Cargo Card
    cargoCard: {
      backgroundColor: c.bgSurface, borderRadius: 16,
      borderWidth: 1, borderColor: c.borderDefault, overflow: "hidden", marginBottom: 4,
      shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    },
    cargoHeader: {
      flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: c.bgSurface,
    },
    deleteBtn: {
      marginLeft: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tint(c.semanticDanger, 0.25, c.borderDefault),
      backgroundColor: tint(c.semanticDanger, 0.1, c.bgSurface),
    },
    cargoHeaderContent: { flex: 1, marginLeft: 12 },
    cargoTitle: { fontSize: 15, fontWeight: "700", color: c.textMain },
    cargoSummary: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    
    cargoBody: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: c.bgSurfaceAlt },
    
    // Section Divider
    divider: { height: 1, backgroundColor: c.bgSurfaceAlt, marginVertical: 12 },

    // 1. Tabs (Type)
    tabContainer: {
      flexDirection: 'row', backgroundColor: c.bgSurfaceAlt, 
      borderRadius: 10, padding: 3, marginTop: 16
    },
    tabItem: {
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8,
    },
    tabItemActive: { backgroundColor: c.bgSurface, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    tabTextActive: { color: c.brandPrimary, fontWeight: '700' },

    // 2. Input Group Label
    groupLabel: { fontSize: 12, fontWeight: '700', color: c.textSub, marginBottom: 8, marginTop: 16 },

    // 3. Furniture Chips
    chipScroll: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface,
    },
    chipActive: { backgroundColor: tint(c.brandPrimary, 0.08, c.bgSurface), borderColor: c.brandPrimary },
    chipText: { fontSize: 12, fontWeight: "600", color: c.textSub },
    chipTextActive: { color: c.brandPrimary },

    // 4. Name Input
    nameInput: {
      height: 44, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 10,
      paddingHorizontal: 12, fontSize: 14, backgroundColor: c.bgSurfaceAlt, color: c.textMain, fontWeight: '600'
    },

    // 5. Qty & Weight Row
    qwRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    qwItem: { flex: 1 },
    
    // Stepper
    stepper: {
      flexDirection: 'row', alignItems: 'center', height: 44,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 10, backgroundColor: c.bgSurface
    },
    stepBtn: { width: 36, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgSurfaceAlt },
    stepVal: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: c.textMain },

    // Weight Input
    weightInput: {
      height: 44, 
      borderWidth: 1, 
      borderColor: c.borderDefault, 
      borderRadius: 10,
      paddingLeft: 12,      
      paddingRight: 40,      
      fontSize: 14, 
      backgroundColor: c.bgSurface, 
      textAlign: 'right', 
      fontWeight: '600'
    },
    unitText: { position: 'absolute', right: 12, top: 12, fontSize: 12, color: c.textMuted, fontWeight: '600' },

    // 6. Dimensions
    dimBox: {
      backgroundColor: tint(c.brandPrimary, 0.04, c.bgSurface),
      borderWidth: 1, borderColor: tint(c.brandPrimary, 0.15, c.borderDefault),
      borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    },
    dimPresetText: { fontSize: 13, fontWeight: '700', color: c.textMain },
    dimPresetSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    editBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    editText: { fontSize: 12, fontWeight: '600', color: c.brandPrimary },

    manualDimRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dimInput: {
      flex: 1, height: 40, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 8,
      textAlign: 'center', fontSize: 13, backgroundColor: c.bgSurface, fontWeight: '600'
    },
    dimX: { color: c.textMuted, fontSize: 12 },

    // 7. Dropoff
    dropoffScroll: { flexDirection: 'row', gap: 8, marginTop: 4 },
    dropoffChip: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 38,
      borderRadius: 10, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface, gap: 6
    },
    dropoffChipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
    dropoffText: { fontSize: 12, fontWeight: '600', color: c.textSub },
    dropoffTextActive: { color: '#fff' },

    // Add Button
    addBtn: {
      height: 50, borderRadius: 14, borderWidth: 1, borderColor: c.brandPrimary,
      borderStyle: "dashed", backgroundColor: tint(c.brandPrimary, 0.05, c.bgSurface),
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8
    },
    addBtnText: { color: c.brandPrimary, fontWeight: "700", fontSize: 15 },
  });
});

export function QuoteCreateStep2() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { draft, addCargo, removeCargo, updateCargo } = useQuoteCreateDraft();
  
  const [expandedId, setExpandedId] = useState<number | null>(draft?.cargoList?.[0]?.id ?? 1);
  const [manualModeIds, setManualModeIds] = useState<Set<number>>(new Set());

  const dropOffTargets = useMemo(() => getDropOffTargets(draft), [draft?.waypoints, draft?.endAddr]);

  useEffect(() => {
    const lastId = draft?.cargoList?.[draft.cargoList.length - 1]?.id;
    if (lastId) setExpandedId(lastId);
  }, [draft?.cargoList?.length]);

  const toggleManualMode = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = new Set(manualModeIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setManualModeIds(next);
  };

  const handleTypeSelect = (id: number, category: CargoItemCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateCargo(id, "itemCategory", category);
    
    const next = new Set(manualModeIds);
    if (category === "BOX") {
        updateCargo(id, "type", "박스");
        updateCargo(id, "lengthCm", PRESETS.BOX.l);
        updateCargo(id, "widthCm", PRESETS.BOX.w);
        updateCargo(id, "heightCm", PRESETS.BOX.h);
        next.delete(id);
    } else if (category === "PALLET") {
        updateCargo(id, "type", "팔레트");
        updateCargo(id, "lengthCm", PRESETS.PALLET.l);
        updateCargo(id, "widthCm", PRESETS.PALLET.w);
        updateCargo(id, "heightCm", PRESETS.PALLET.h);
        next.delete(id);
    } else {
        // 가구: 초기화 후 수동 모드 진입 (칩 선택 유도)
        updateCargo(id, "type", "");
        updateCargo(id, "lengthCm", ""); updateCargo(id, "widthCm", ""); updateCargo(id, "heightCm", "");
        next.add(id);
    }
    setManualModeIds(next);
  };

  const handleFurniturePreset = (id: number, item: typeof PRESETS.FURNITURE.items[0]) => {
      updateCargo(id, "type", item.label);
      updateCargo(id, "lengthCm", item.l);
      updateCargo(id, "widthCm", item.w);
      updateCargo(id, "heightCm", item.h);
  };

  const updateQty = (id: number, current: string, delta: number) => {
      const next = Math.max(1, (parseInt(current || "0", 10) || 0) + delta);
      updateCargo(id, "quantity", String(next));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {(draft?.cargoList ?? []).map((cargo, index) => {
        const isOpen = expandedId === cargo.id;
        const category = cargo.itemCategory as CargoItemCategory;
        // 가구는 항상 수동 편집 가능 모드
        const isManual = manualModeIds.has(cargo.id) || category === "FURNITURE";
        
        const cbmValue = calculateCBM(cargo.lengthCm, cargo.widthCm, cargo.heightCm, cargo.quantity);
        const currentTarget = dropOffTargets.find(t => t.key === cargo.dropOffKey);
        const dropOffLabel = currentTarget ? currentTarget.label : "도착지";

        return (
          <View key={cargo.id} style={styles.cargoCard}>
            {/* Header (Summary) */}
            <Pressable 
              style={styles.cargoHeader}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedId(isOpen ? null : cargo.id);
              }}
            >
              <Ionicons name={CATEGORY_ICONS[category]} size={22} color={theme.colors.brandPrimary} />
              <View style={styles.cargoHeaderContent}>
                <AppText style={styles.cargoTitle}>
                    {cargo.type || "품목 선택"} <AppText color="textMuted" size={14}>x {cargo.quantity || 1}개</AppText>
                </AppText>
                <AppText style={styles.cargoSummary}>{dropOffLabel} · {cbmValue} CBM</AppText>
              </View>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textMuted} />
              {index > 0 && (
                <Pressable
                  onPress={() => removeCargo(cargo.id)}
                  style={({ pressed }) => [styles.deleteBtn, pressed && QUOTE_PRESS_EFFECT]}
                >
                  <Ionicons name="close" size={16} color={theme.colors.semanticDanger} />
                </Pressable>
              )}
            </Pressable>

            {/* Body */}
            {isOpen && (
              <View style={styles.cargoBody}>
                
                {/* 1. Category Tabs */}
                <View style={styles.tabContainer}>
                    {CARGO_ITEM_CATEGORIES.map(cat => {
                        const active = category === cat.id;
                        return (
                            <Pressable key={cat.id} style={[styles.tabItem, active && styles.tabItemActive]} onPress={() => handleTypeSelect(cargo.id, cat.id)}>
                                <AppText style={active ? styles.tabTextActive : styles.tabText}>{cat.label}</AppText>
                            </Pressable>
                        )
                    })}
                </View>

                {/* 2. Detail (Chips & Name) */}
                <AppText style={styles.groupLabel}>품목 상세</AppText>
                {category === "FURNITURE" && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                        {PRESETS.FURNITURE.items.map(fItem => {
                            const active = cargo.type === fItem.label;
                            return (
                                <Pressable key={fItem.id} style={[styles.chip, active && styles.chipActive]} onPress={() => handleFurniturePreset(cargo.id, fItem)}>
                                    <AppText style={active ? styles.chipTextActive : styles.chipText}>{fItem.label}</AppText>
                                </Pressable>
                            )
                        })}
                    </ScrollView>
                )}
                <TextInput 
                    style={styles.nameInput}
                    placeholder={category === "FURNITURE" ? "품목명 직접 입력 (예: 3단 서랍장)" : "품목명"}
                    value={cargo.type}
                    onChangeText={v => updateCargo(cargo.id, "type", v)}
                />

                {/* 3. Qty & Weight (Row) */}
                <View style={styles.qwRow}>
                    <View style={styles.qwItem}>
                        <AppText style={[styles.groupLabel, {marginTop:0}]}>수량</AppText>
                        <View style={styles.stepper}>
                            <Pressable style={styles.stepBtn} onPress={() => updateQty(cargo.id, cargo.quantity, -1)}>
                                <Ionicons name="remove" size={18} color={theme.colors.textMain}/>
                            </Pressable>
                            <AppText style={styles.stepVal}>{cargo.quantity || 1}</AppText>
                            <Pressable style={styles.stepBtn} onPress={() => updateQty(cargo.id, cargo.quantity, 1)}>
                                <Ionicons name="add" size={18} color={theme.colors.textMain}/>
                            </Pressable>
                        </View>
                    </View>
                    <View style={styles.qwItem}>
                        <AppText style={[styles.groupLabel, {marginTop:0}]}>총 무게</AppText>
                        <View>
                            <TextInput 
                                style={styles.weightInput}
                                placeholder="0"
                                keyboardType="numeric"
                                value={digitsOnly(cargo.weight)}
                                onChangeText={v => updateCargo(cargo.id, "weight", digitsOnly(v))}
                            />
                            <AppText style={styles.unitText}>kg</AppText>
                        </View>
                    </View>
                </View>

                {/* 4. Dimensions */}
                <AppText style={styles.groupLabel}>규격 (가로 x 세로 x 높이 cm)</AppText>
                {!isManual ? (
                    // Preset Mode (Box/Pallet default)
                    <View style={styles.dimBox}>
                        <View>
                            <AppText style={styles.dimPresetText}>{PRESETS[category]?.label}</AppText>
                            <AppText style={styles.dimPresetSub}>{PRESETS[category]?.desc}</AppText>
                        </View>
                        <TouchableOpacity style={styles.editBtn} onPress={() => toggleManualMode(cargo.id)}>
                            <AppText style={styles.editText}>수정</AppText>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Manual Mode
                    <View>
                        {category !== "FURNITURE" && (
                            <TouchableOpacity style={{alignSelf:'flex-end', marginBottom: 6}} onPress={() => toggleManualMode(cargo.id)}>
                                <AppText style={{fontSize:11, color:theme.colors.brandPrimary}}>기본값으로 복귀</AppText>
                            </TouchableOpacity>
                        )}
                        <View style={styles.manualDimRow}>
                            <TextInput style={styles.dimInput} placeholder="가로" keyboardType="numeric" value={cargo.lengthCm} onChangeText={v => updateCargo(cargo.id, "lengthCm", v)} />
                            <AppText style={styles.dimX}>x</AppText>
                            <TextInput style={styles.dimInput} placeholder="세로" keyboardType="numeric" value={cargo.widthCm} onChangeText={v => updateCargo(cargo.id, "widthCm", v)} />
                            <AppText style={styles.dimX}>x</AppText>
                            <TextInput style={styles.dimInput} placeholder="높이" keyboardType="numeric" value={cargo.heightCm} onChangeText={v => updateCargo(cargo.id, "heightCm", v)} />
                        </View>
                    </View>
                )}

                {/* 5. Drop-off */}
                <AppText style={styles.groupLabel}>하차 위치</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropoffScroll}>
                    {dropOffTargets.map((target) => {
                        const isActive = (cargo.dropOffKey || DROP_OFF_END) === target.key;
                        const iconName = target.key === DROP_OFF_END ? "flag" : "location";
                        return (
                            <Pressable
                                key={target.key}
                                onPress={() => updateCargo(cargo.id, "dropOffKey", target.key as string)}
                                style={[styles.dropoffChip, isActive && styles.dropoffChipActive]}
                            >
                                <Ionicons name={iconName} size={14} color={isActive ? "white" : theme.colors.textMuted} />
                                <AppText style={isActive ? styles.dropoffTextActive : styles.dropoffText}>{target.label}</AppText>
                            </Pressable>
                        );
                    })}
                </ScrollView>

              </View>
            )}
          </View>
        );
      })}

      <Pressable style={({pressed}) => [styles.addBtn, pressed && QUOTE_PRESS_EFFECT]} onPress={addCargo}>
        <Ionicons name="add-circle" size={22} color={theme.colors.brandPrimary} />
        <AppText style={styles.addBtnText}>화물 추가하기</AppText>
      </Pressable>
    </ScrollView>
  );
}

export default QuoteCreateStep2;
