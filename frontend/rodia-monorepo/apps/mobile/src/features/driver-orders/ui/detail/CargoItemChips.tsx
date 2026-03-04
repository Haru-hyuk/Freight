import React, { useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { Placement } from "@/shared/api/generated/schemas";
import { RECO_CARGO_CHIP } from "@/features/driver-orders/model/recoDetailGrounding";
import { safeNumber } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type Props = {
  /** 그룹 내 모든 적재물(Placement) 배열 */
  items: Placement[];
  /** 그룹 색상(stopColorMap에서 전달) */
  color: string;
};

const useStyles = createThemedStyles((theme) => {
  const sp = safeNumber(theme?.layout?.spacing?.base, 4);
  return StyleSheet.create({
    container: {
      paddingHorizontal: sp * 2,
      paddingVertical: sp * 1.5,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
  });
});

/**
 * CargoItemChips
 *
 * 적재물 배열을 번호 칩(원형 배지)으로 표시.
 * - 칩이 많아도 전부 보이도록:
 *   1) containerWidth 측정 후 필요 폭 계산
 *   2) 초과 시 scale down(SCALE_MIN=0.65 ~ 1.0 clamp)
 *   3) scale 0.65에서도 초과하면 flexWrap으로 2줄 이상 허용
 *
 * 그룹 키 근거: Placement.stopOrder (recoDetailGrounding.ts 참고)
 */
export function CargoItemChips({ items, color }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [containerWidth, setContainerWidth] = useState(0);

  const { chipSize, gap, shouldWrap } = useMemo(() => {
    const count = items.length;
    if (count === 0 || containerWidth <= 0) {
      return { chipSize: RECO_CARGO_CHIP.SIZE_BASE, gap: RECO_CARGO_CHIP.GAP_BASE, shouldWrap: false };
    }
    const needed = count * RECO_CARGO_CHIP.SIZE_BASE + Math.max(0, count - 1) * RECO_CARGO_CHIP.GAP_BASE;
    if (needed <= containerWidth) {
      return { chipSize: RECO_CARGO_CHIP.SIZE_BASE, gap: RECO_CARGO_CHIP.GAP_BASE, shouldWrap: false };
    }
    const rawScale = containerWidth / needed;
    const scale = Math.max(RECO_CARGO_CHIP.SCALE_MIN, rawScale);
    const scaledNeeded = count * (RECO_CARGO_CHIP.SIZE_BASE * scale) + Math.max(0, count - 1) * (RECO_CARGO_CHIP.GAP_BASE * scale);
    return {
      chipSize: Math.round(RECO_CARGO_CHIP.SIZE_BASE * scale),
      gap: Math.round(RECO_CARGO_CHIP.GAP_BASE * scale),
      shouldWrap: scaledNeeded > containerWidth,
    };
  }, [items.length, containerWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) setContainerWidth(w);
  };

  if (items.length === 0) return null;

  const fontSize = Math.max(8, Math.round(chipSize * 0.38));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View
        style={[
          styles.row,
          {
            gap,
            flexWrap: shouldWrap ? "wrap" : "nowrap",
          },
        ]}
      >
        {items.map((item, idx) => (
          <View
            key={item.id ?? `chip-${idx}`}
            style={{
              width: chipSize,
              height: chipSize,
              borderRadius: chipSize / 2,
              backgroundColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText
              size={fontSize}
              weight="900"
              color={theme.colors.textInverse}
            >
              {idx + 1}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
