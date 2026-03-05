import React from "react";
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import RecoLoadScene3D from "@/features/driver-reco/ui/RecoLoadScene3D";
import type { Placement } from "@/shared/api/generated/schemas";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type SelectedOrderItem = {
  key: string;
  title: string;
  subtitle?: string;
};

export type RecoSelectedOrderDetail = {
  stopOrder: number;
  accentColor: string;
  originAddress: string;
  destinationAddress: string;
  distanceText: string;
  weightText: string;
  cbmText: string;
  items: SelectedOrderItem[];
};

type RecoLoadSimulationCardProps = {
  dims: {
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  };
  isGroupedRecommendation: boolean;
  isXray: boolean;
  onToggleXray: () => void;
  routeLoading?: boolean;
  orderedPlacements: Placement[];
  stopColorMap: Map<number, string>;
  selectedStopOrder: number | null;
  onSelectStopOrder: (nextStopOrder: number | null) => void;
  selectedOrderDetail: RecoSelectedOrderDetail | null;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    loadCard: {
      padding: spacing * 4,
      gap: spacing * 2,
    },
    loadHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    xrayToggle: {
      borderRadius: 999,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: tint(cBorder, 0.24, theme.colors.bgSurfaceAlt),
    },
    xrayToggleText: {
      color: theme.colors.textMain,
    },
    sceneViewport: {
      borderRadius: 12,
      overflow: "hidden",
    },
    scenePlaceholder: {
      flex: 1,
      height: "100%",
      minHeight: 140,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.72, cBorder),
      backgroundColor: tint(cBorder, 0.18, theme.colors.bgSurfaceAlt),
      alignItems: "center",
      justifyContent: "center",
      gap: spacing,
      paddingHorizontal: spacing * 2,
    },
    selectedPanel: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2.5,
      gap: spacing * 1.5,
    },
    selectedPanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 1.5,
    },
    selectedPanelBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing,
    },
    selectedRouteWrap: {
      gap: spacing,
    },
    selectedMetaRow: {
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    selectedMetaCell: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: tint(cBorder, 0.38, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing * 1.2,
      alignItems: "center",
      gap: spacing * 0.5,
    },
    selectedItemsWrap: {
      borderRadius: 10,
      backgroundColor: tint(cBorder, 0.22, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 1.5,
      gap: spacing,
    },
    selectedItemRow: {
      borderRadius: 8,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      gap: spacing * 0.5,
    },
  });
});

export function RecoLoadSimulationCard({
  dims,
  isGroupedRecommendation,
  isXray,
  onToggleXray,
  routeLoading = false,
  orderedPlacements,
  stopColorMap,
  selectedStopOrder,
  onSelectStopOrder,
  selectedOrderDetail,
}: RecoLoadSimulationCardProps) {
  const styles = useStyles();
  const { height: screenHeight } = useWindowDimensions();
  const maxSceneHeight = Math.floor(screenHeight * 0.34);
  const sceneViewportHeight = Math.max(140, Math.min(300, maxSceneHeight));
  const [isSceneReady, setIsSceneReady] = React.useState(false);

  React.useEffect(() => {
    if (routeLoading) {
      setIsSceneReady(false);
      return undefined;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      setIsSceneReady(true);
    });

    return () => task.cancel();
  }, [routeLoading]);

  return (
    <AppCard style={styles.loadCard}>
      <View style={styles.loadHeader}>
        <AppText variant="heading" weight="900" color="textMain">
          3D 적재 시뮬레이션
        </AppText>
        <Pressable style={styles.xrayToggle} onPress={onToggleXray}>
          <AppText variant="caption" weight="800" style={styles.xrayToggleText}>
            {`X-ray ${isXray ? "ON" : "OFF"}`}
          </AppText>
        </Pressable>
      </View>
      <AppText variant="caption" color="textMuted">
        적재함 {dims.widthCm} × {dims.lengthCm} × {dims.heightCm} cm 기준 · {isGroupedRecommendation ? "다건 순서 적재" : "단건 적재"}
      </AppText>

      <View style={[styles.sceneViewport, { maxHeight: sceneViewportHeight, height: sceneViewportHeight }]}>
        {isSceneReady ? (
          <RecoLoadScene3D
            dims={dims}
            orderedPlacements={orderedPlacements}
            stopColorMap={stopColorMap}
            selectedStopOrder={selectedStopOrder}
            isXray={isXray}
            onSelectStopOrder={(stopOrder) => onSelectStopOrder(selectedStopOrder === stopOrder ? null : stopOrder)}
          />
        ) : (
          <View style={styles.scenePlaceholder}>
            <ActivityIndicator />
            <AppText variant="caption" color="textMuted">
              {routeLoading ? "경로를 계산한 뒤 적재 시뮬레이션을 준비합니다." : "적재 시뮬레이션을 불러오는 중입니다."}
            </AppText>
          </View>
        )}
      </View>

      {selectedOrderDetail ? (
        <View style={styles.selectedPanel}>
          <View style={styles.selectedPanelHeader}>
            <View style={[styles.selectedPanelBadge, { backgroundColor: selectedOrderDetail.accentColor }]}>
              <AppText variant="caption" weight="900" color="textOnBrand">
                {selectedOrderDetail.stopOrder}
              </AppText>
            </View>
            <AppText variant="detail" weight="900" color="textMain">
              선택된 추천 오더
            </AppText>
          </View>

          <View style={styles.selectedRouteWrap}>
            <AppText variant="caption" color="textSub">
              출발: {selectedOrderDetail.originAddress}
            </AppText>
            <AppText variant="caption" color="textSub">
              도착: {selectedOrderDetail.destinationAddress}
            </AppText>
          </View>

          <View style={styles.selectedMetaRow}>
            <View style={styles.selectedMetaCell}>
              <AppText variant="caption" color="textMuted">
                거리
              </AppText>
              <AppText variant="detail" weight="900" color="brandPrimary">
                {selectedOrderDetail.distanceText}
              </AppText>
            </View>
            <View style={styles.selectedMetaCell}>
              <AppText variant="caption" color="textMuted">
                중량
              </AppText>
              <AppText variant="detail" weight="900" color="textMain">
                {selectedOrderDetail.weightText}
              </AppText>
            </View>
            <View style={styles.selectedMetaCell}>
              <AppText variant="caption" color="textMuted">
                CBM
              </AppText>
              <AppText variant="detail" weight="900" color="textMain">
                {selectedOrderDetail.cbmText}
              </AppText>
            </View>
          </View>

          <View style={styles.selectedItemsWrap}>
            <AppText variant="caption" weight="800" color="textMuted">
              화물 품목
            </AppText>
            {selectedOrderDetail.items.map((item) => (
              <View key={item.key} style={styles.selectedItemRow}>
                <AppText variant="caption" weight="800" color="textMain">
                  {item.title}
                </AppText>
                {item.subtitle ? (
                  <AppText variant="caption" color="textSub">
                    {item.subtitle}
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </AppCard>
  );
}

export default RecoLoadSimulationCard;
