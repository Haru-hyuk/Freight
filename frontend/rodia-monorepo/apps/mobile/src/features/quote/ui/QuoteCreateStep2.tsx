// apps/mobile/src/features/quote/ui/QuoteCreateStep2.tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import {
  computeQuotePricing,
  EXTRA_OPTIONS,
  formatKrw,
  useQuoteCreateDraft,
  VEHICLE_DATA,
} from "@/features/quote/model/quoteCreateDraft";

const PRESS_EFFECT: ViewStyle = { opacity: 0.92, transform: [{ scale: 0.98 }] };

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);

  const cBrandBg = tint(c.brandPrimary, 0.1, c.bgSurfaceAlt);
  const cModalOverlay = tint(c.textMain, 0.45, "rgba(0,0,0,0.45)");
  const cWarnBg = tint(c.semanticDanger, 0.08, c.bgSurfaceAlt);
  const cWarnBorder = tint(c.semanticDanger, 0.22, c.borderDefault);

  return StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing * 2 + 2,
      paddingHorizontal: spacing,
    },
    card: { borderRadius: radiusCard, padding: spacing * 5 },

    cargoItem: {
      backgroundColor: c.bgSurfaceAlt,
      borderRadius: radiusControl,
      padding: spacing * 4,
      marginBottom: spacing * 3,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    cargoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing * 2 + 2 },

    rowHalf: { flexDirection: "row", gap: spacing * 2 + 2, alignItems: "flex-start" },
    inputContainer: { flex: 1 },
    inputShell: {
      minHeight: 52,
      backgroundColor: c.bgSurfaceAlt,
      borderRadius: radiusControl,
      borderColor: c.borderDefault,
      borderWidth: 1,
      paddingHorizontal: 14,
    },
    inputShellSurface: { backgroundColor: c.bgSurface },

    btnAddCargo: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.brandPrimary,
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
      backgroundColor: tint(c.brandSecondary, 0.94, c.brandSecondary),
      borderRadius: radiusControl,
      paddingVertical: spacing * 3,
      paddingHorizontal: spacing * 4,
      marginBottom: spacing * 4,
      borderWidth: 1,
      borderColor: tint(c.bgSurface, 0.88, "rgba(255,255,255,0.12)"),
    },
    aiIconCircle: {
      width: 32,
      height: 32,
      backgroundColor: tint(c.bgSurface, 0.14, "rgba(255,255,255,0.14)"),
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },

    ddTrigger: {
      flex: 1,
      minHeight: 50,
      backgroundColor: c.bgSurface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: radiusControl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
    },

    cpContainer: {
      flexDirection: "row",
      backgroundColor: c.bgSurfaceAlt,
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
      backgroundColor: c.bgSurface,
      shadowColor: c.textMain,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    badgeInfo: {
      fontSize: 10,
      color: c.semanticInfo,
      backgroundColor: tint(c.semanticInfo, 0.16, c.bgSurfaceAlt),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      overflow: "hidden",
    },
    badgeSale: {
      fontSize: 10,
      color: c.semanticDanger,
      backgroundColor: tint(c.semanticDanger, 0.16, c.bgSurfaceAlt),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      overflow: "hidden",
    },

    priceInputSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: tint(c.borderDefault, 0.7, c.borderDefault),
      borderStyle: "dashed",
    },
    budgetWrap: { position: "relative" },
    budgetSuffix: { position: "absolute", right: 14, top: 16 },

    analysisBox: {
      backgroundColor: cWarnBg,
      borderWidth: 1,
      borderColor: cWarnBorder,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginTop: 12,
    },
    analysisItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
    analysisText: { flex: 1, fontSize: 13, lineHeight: 18, color: c.semanticDanger },

    priceRangeInfo: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 4 },

    accordionCard: { borderRadius: radiusCard, padding: 0, overflow: "hidden" },
    accHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing * 5,
      backgroundColor: c.bgSurface,
    },
    selectedBadge: { backgroundColor: cBrandBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    checkListWrap: {
      paddingHorizontal: spacing * 5,
      paddingBottom: spacing * 5,
      borderTopWidth: 1,
      borderTopColor: tint(c.borderDefault, 0.7, c.borderDefault),
      borderStyle: "dashed",
    },
    checkRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing * 3 + 2,
      borderBottomWidth: 1,
      borderBottomColor: c.bgSurfaceAlt,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleActive: { borderColor: c.brandPrimary, backgroundColor: c.brandPrimary },

    modalOverlay: { flex: 1, backgroundColor: cModalOverlay, justifyContent: "flex-end" },
    modalContent: {
      backgroundColor: c.bgSurface,
      borderTopLeftRadius: radiusCard,
      borderTopRightRadius: radiusCard,
      paddingHorizontal: spacing * 5,
      paddingVertical: spacing * 2,
    },
    modalItem: { paddingVertical: spacing * 4, borderBottomWidth: 1, borderBottomColor: c.bgSurfaceAlt },
  });
});

export function QuoteCreateStep2() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { draft, patchDraft, addCargo, removeCargo, updateCargo, toggleOption } = useQuoteCreateDraft();

  const [modalMode, setModalMode] = useState<"TON" | "TYPE" | null>(null);
  const [isAccOpen, setIsAccOpen] = useState(false);

  const pricing = useMemo(() => computeQuotePricing(draft), [draft]);
  const desiredBudget = useMemo(() => {
    const v = (draft?.budget ?? "").replace(/[^\d]/g, "");
    return v;
  }, [draft?.budget]);

  const estimate = useMemo(() => {
    const current = pricing?.finalPrice ?? 0;
    const estimatedMaxPrice = Math.floor(current * 1.15);
    const estimatedMinPrice = Math.floor(current * 0.9);
    const hardLimit = Math.floor(estimatedMinPrice * 0.85);

    const desired = parseInt(desiredBudget || "0", 10) || 0;
    const comments: string[] = [];

    if (desired > 0 && desired < hardLimit) {
      comments.push(`희망금액이 예상 최저가의 85%(${hardLimit.toLocaleString()}원) 미만입니다. 매칭이 어려울 수 있어요.`);
    }
    if ((pricing?.limit ?? 0) > 0 && (pricing?.totalWeight ?? 0) > (pricing?.limit ?? 0)) {
      comments.push(
        `화물 중량(${pricing.totalWeight}kg)이 선택 차량 적재한도(${pricing.limit}kg)를 초과합니다. 더 큰 차량을 선택해 주세요.`
      );
    }

    return { estimatedMinPrice, estimatedMaxPrice, comments };
  }, [pricing, desiredBudget]);

  const showAIHelp = () => {
    Alert.alert(
      "AI 추천",
      "화물 종류(박스), 무게(200kg)를 분석했습니다.\n\n[추천] 1톤 카고 차량이 적합합니다.\n[팁] 비 예보가 있으니 '방수/습기주의' 옵션을 추천드려요."
    );
  };

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAccOpen((prev) => !prev);
  };

  return (
    <View>
      <View style={{ marginBottom: 24 }}>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" weight="700" color="textSub">
            화물 정보
          </AppText>
        </View>

        <AppCard outlined style={styles.card}>
          {(draft?.cargoList ?? []).map((cargo, index) => (
            <View key={cargo?.id ?? index} style={styles.cargoItem}>
              <View style={styles.cargoHeader}>
                <AppText variant="caption" weight="700" color="textSub">
                  화물 #{index + 1}
                </AppText>
                {index > 0 ? (
                  <TouchableOpacity onPress={() => removeCargo(cargo?.id ?? -1)}>
                    <AppText variant="caption" color="semanticDanger" weight="600">
                      삭제
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
              </View>

              <AppInput
                placeholder="화물 종류 (예: 박스)"
                value={cargo?.type ?? ""}
                onChangeText={(v) => updateCargo(cargo?.id ?? -1, "type", v ?? "")}
                containerStyle={{ marginBottom: 10 }}
                shellStyle={[styles.inputShell, styles.inputShellSurface]}
              />

              <View style={styles.rowHalf}>
                <AppInput
                  placeholder="무게 (kg)"
                  keyboardType="numeric"
                  value={cargo?.weight ?? ""}
                  onChangeText={(v) => updateCargo(cargo?.id ?? -1, "weight", v ?? "")}
                  containerStyle={styles.inputContainer}
                  shellStyle={[styles.inputShell, styles.inputShellSurface]}
                />
                <AppInput
                  placeholder="부피 (CBM)"
                  keyboardType="numeric"
                  value={cargo?.volume ?? ""}
                  onChangeText={(v) => updateCargo(cargo?.id ?? -1, "volume", v ?? "")}
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
            value={draft?.noteToDriver ?? ""}
            onChangeText={(v) => patchDraft({ noteToDriver: v ?? "" })}
            containerStyle={{ marginTop: 12 }}
            shellStyle={[styles.inputShell, { minHeight: 88, alignItems: "flex-start", paddingTop: 8, paddingBottom: 8 }]}
          />
        </AppCard>
      </View>

      <View style={{ marginBottom: 24 }}>
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
              <AppText weight="600">{VEHICLE_DATA?.[draft?.tonIdx ?? 0]?.name ?? "-"}</AppText>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
            </Pressable>

            <Pressable style={styles.ddTrigger} onPress={() => setModalMode("TYPE")}>
              <AppText weight="600">{VEHICLE_DATA?.[draft?.tonIdx ?? 0]?.types?.[draft?.typeIdx ?? 0]?.n ?? "-"}</AppText>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.cpContainer, { marginTop: 12, marginBottom: 4 }]}>
            <Pressable
              onPress={() => patchDraft({ isFrozen: false })}
              style={[styles.cpOpt, !(draft?.isFrozen ?? false) ? styles.cpOptActive : undefined]}
            >
              <AppText weight="600" color={!(draft?.isFrozen ?? false) ? "textMain" : "textMuted"}>
                일반 (상온)
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => patchDraft({ isFrozen: true })}
              style={[styles.cpOpt, (draft?.isFrozen ?? false) ? styles.cpOptActive : undefined]}
            >
              <AppText weight="600" color={(draft?.isFrozen ?? false) ? "textMain" : "textMuted"}>
                냉장 / 냉동
              </AppText>
              <AppText style={styles.badgeInfo}>+30,000원</AppText>
            </Pressable>
          </View>

          <View style={styles.cpContainer}>
            <Pressable
              onPress={() => patchDraft({ isPool: false })}
              style={[styles.cpOpt, !(draft?.isPool ?? false) ? styles.cpOptActive : undefined]}
            >
              <AppText weight="600" color={!(draft?.isPool ?? false) ? "textMain" : "textMuted"}>
                독차 배송
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => patchDraft({ isPool: true })}
              style={[styles.cpOpt, (draft?.isPool ?? false) ? styles.cpOptActive : undefined]}
            >
              <AppText weight="600" color={(draft?.isPool ?? false) ? "textMain" : "textMuted"}>
                합짐 (혼적)
              </AppText>
              <AppText style={styles.badgeSale}>-20% 할인</AppText>
            </Pressable>
          </View>

          <View style={styles.priceInputSection}>
            <AppText variant="caption" weight="700" color="textSub" style={{ marginBottom: 6 }}>
              희망 운임 (선택)
            </AppText>

            <View style={styles.budgetWrap}>
              <AppInput
                placeholder="금액을 입력해주세요"
                value={draft?.budget ?? ""}
                onChangeText={(v) => patchDraft({ budget: v ?? "" })}
                keyboardType="numeric"
                shellStyle={[styles.inputShell, { paddingRight: 44 }]}
              />
              <View pointerEvents="none" style={styles.budgetSuffix}>
                <AppText variant="body" color="textMuted">
                  원
                </AppText>
              </View>
            </View>

            {(estimate?.comments?.length ?? 0) > 0 ? (
              <View style={styles.analysisBox}>
                {(estimate?.comments ?? []).map((c, idx) => (
                  <View key={`${idx}-${c}`} style={styles.analysisItem}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.semanticDanger} />
                    <AppText style={styles.analysisText}>{c}</AppText>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.priceRangeInfo}>
              <AppText variant="caption" color="textMuted">
                예상 시세 범위
              </AppText>
              <AppText variant="caption" weight="700" color="textSub">
                {`${formatKrw(estimate?.estimatedMinPrice ?? 0)} ~ ${formatKrw(estimate?.estimatedMaxPrice ?? 0)}`}
              </AppText>
            </View>
          </View>
        </AppCard>
      </View>

      <View style={{ marginBottom: 24 }}>
        <AppCard outlined style={styles.accordionCard}>
          <Pressable style={styles.accHead} onPress={toggleAccordion}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText weight="700">화물 취급 주의 (선택)</AppText>
              {(draft?.selectedOpts?.length ?? 0) > 0 ? (
                <View style={styles.selectedBadge}>
                  <AppText variant="caption" color="brandPrimary">
                    {draft.selectedOpts.length}개 선택
                  </AppText>
                </View>
              ) : null}
            </View>
            <Ionicons name={isAccOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
          </Pressable>

          {isAccOpen ? (
            <View style={styles.checkListWrap}>
              {EXTRA_OPTIONS.map((opt) => {
                const active = (draft?.selectedOpts ?? []).includes(opt.id);
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
                      {active ? <Ionicons name="checkmark" size={14} color={theme.colors.textOnBrand} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </AppCard>
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalMode(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {modalMode === "TON"
              ? VEHICLE_DATA.map((v, i) => {
                  const isActive = (draft?.tonIdx ?? 0) === i;
                  return (
                    <Pressable
                      key={v.name}
                      style={styles.modalItem}
                      onPress={() => {
                        patchDraft({ tonIdx: i, typeIdx: 0 });
                        setModalMode(null);
                      }}
                    >
                      <AppText weight={isActive ? "700" : "400"} color={isActive ? "brandPrimary" : "textMain"}>
                        {v.name}
                      </AppText>
                    </Pressable>
                  );
                })
              : null}

            {modalMode === "TYPE"
              ? (VEHICLE_DATA?.[draft?.tonIdx ?? 0]?.types ?? []).map((t, i) => {
                  const isActive = (draft?.typeIdx ?? 0) === i;
                  return (
                    <Pressable
                      key={t.n}
                      style={styles.modalItem}
                      onPress={() => {
                        patchDraft({ typeIdx: i });
                        setModalMode(null);
                      }}
                    >
                      <AppText weight={isActive ? "500" : "400"} color={isActive ? "brandPrimary" : "textMain"}>
                        {t.n}
                      </AppText>
                    </Pressable>
                  );
                })
              : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default QuoteCreateStep2;
