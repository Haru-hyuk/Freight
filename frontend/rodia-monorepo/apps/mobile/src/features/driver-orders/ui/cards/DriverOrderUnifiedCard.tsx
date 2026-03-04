import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { DriverOrderCard } from "@/features/matching/api";
import { formatKrw } from "@/shared/lib/format/display";
import { BADGE_TONE, DRIVER_CTA_ID, DRIVER_UI_STATE, type BadgeTone } from "@/shared/lib/policy";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type DriverOrderUnifiedCardScope = "market" | "my" | "run";

type DriverOrderUnifiedCardProps = {
  item: DriverOrderCard;
  scope: DriverOrderUnifiedCardScope;
  acceptingMatchId?: number | null;
  isSubmittingOffer: boolean;
  onPress: (card: DriverOrderCard) => void;
  onAcceptClick: (card: DriverOrderCard) => void;
  onOfferClick: (card: DriverOrderCard) => void;
  onPrepareClick: (card: DriverOrderCard) => void;
};

function resolveStatusPalette(tone: BadgeTone, colors: Record<string, string>) {
  if (tone === BADGE_TONE.ATTENTION) {
    return {
      bg: tint(colors.brandPrimary, 0.1, colors.bgSurface),
      text: colors.brandPrimary,
    };
  }
  if (tone === BADGE_TONE.PROGRESS) {
    return {
      bg: tint(colors.semanticSuccess, 0.1, colors.bgSurface),
      text: colors.semanticSuccess,
    };
  }
  if (tone === BADGE_TONE.CLOSED) {
    return {
      bg: tint(colors.semanticInfo, 0.1, colors.bgSurface),
      text: colors.semanticInfo,
    };
  }
  return {
    bg: tint(colors.textMuted, 0.1, colors.bgSurface),
    text: colors.textMuted,
  };
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F1F5F9");
  const cLine = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cInfo = safeString(theme?.colors?.semanticInfo, "#3B82F6");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return StyleSheet.create({
    pressable: {},
    pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
    cardWrap: {
      borderRadius: safeNumber(theme?.layout?.radii?.card, spacing * 4),
      padding: spacing * 5,
      borderWidth: 0,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing * 4,
      gap: spacing * 2,
    },
    badge: {
      paddingHorizontal: spacing * 2.5,
      paddingVertical: spacing * 1.5,
      borderRadius: safeNumber(theme?.layout?.radii?.control, spacing * 3),
      flexShrink: 0,
      alignSelf: "flex-start",
    },
    cardTopMeta: {
      flex: 1,
      minWidth: 0,
      alignItems: "flex-end",
      gap: spacing * 0.5,
    },
    timeText: {
      textAlign: "right",
      flexShrink: 1,
    },
    timelineWrap: {
      flexDirection: "row",
      alignItems: "stretch",
      marginBottom: spacing * 5,
    },
    rail: {
      width: spacing * 6,
      alignItems: "center",
      marginRight: spacing * 3,
    },
    dotStart: {
      width: spacing * 3,
      height: spacing * 3,
      borderRadius: spacing * 1.5,
      backgroundColor: cInfo,
      zIndex: 2,
      borderWidth: Math.max(1, Math.round(spacing / 2)),
      borderColor: tint(cInfo, 0.2, cSurface),
    },
    dotEnd: {
      width: spacing * 3,
      height: spacing * 3,
      borderRadius: spacing * 1.5,
      backgroundColor: cPrimary,
      zIndex: 2,
      borderWidth: Math.max(1, Math.round(spacing / 2)),
      borderColor: tint(cPrimary, 0.2, cSurface),
    },
    line: {
      width: Math.max(1, Math.round(spacing / 2)),
      flex: 1,
      backgroundColor: tint(cLine, 0.5, cSurfaceAlt),
      marginVertical: spacing * 0.5,
    },
    addressWrap: { flex: 1, justifyContent: "space-between", gap: spacing * 3 },
    addressBlock: { gap: spacing },
    addressText: { color: theme.colors.textMain },
    distanceChip: {
      alignSelf: "center",
      backgroundColor: tint(cTextMuted, 0.08, cSurface),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
    },
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: spacing * 4,
      borderTopWidth: 1,
      borderTopColor: tint(cLine, 0.5, cSurfaceAlt),
      gap: spacing * 2,
    },
    tagWrap: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 1.5,
      paddingRight: spacing * 2,
    },
    specPill: {
      backgroundColor: tint(cTextMuted, 0.06, cSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: safeNumber(theme?.layout?.radii?.control, spacing * 3),
      minHeight: 30,
      justifyContent: "center",
    },
    priceWrap: { alignItems: "flex-end", gap: spacing * 0.5 },
    dualCtaRow: { marginTop: spacing * 4, flexDirection: "row", gap: spacing * 2 },
    dualCtaButton: { flex: 1, minHeight: 52 },
    prepareWrap: { marginTop: spacing * 4 },
    prepareBtn: { minHeight: 52 },
    negotiatingMetaWrap: {
      marginTop: spacing * 4,
      padding: spacing * 3,
      borderRadius: safeNumber(theme?.layout?.radii?.control, spacing * 3),
      backgroundColor: tint(cTextMuted, 0.06, cSurfaceAlt),
      gap: spacing * 1.5,
    },
    negotiatingMetaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    negotiatingMetaLabel: { flexShrink: 0 },
    negotiatingMetaValue: { flex: 1, textAlign: "right" },
    negotiatingMetaMessage: { flex: 1, textAlign: "right" },
  });
});

function DriverOrderUnifiedCardBase({
  item,
  scope,
  acceptingMatchId,
  isSubmittingOffer,
  onPress,
  onAcceptClick,
  onOfferClick,
  onPrepareClick,
}: DriverOrderUnifiedCardProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const themeColors = theme.colors as Record<string, string>;
  const ctaPolicy = item.cta;
  const ctaVariant =
    ctaPolicy.variant === "primary"
      ? "primary"
      : ctaPolicy.variant === "destructive"
        ? "destructive"
        : "secondary";
  const palette = resolveStatusPalette(item.statusTone, themeColors);

  const counterOfferPriceText =
    Number.isFinite(item.counterOfferProposedPrice) && Number(item.counterOfferProposedPrice) > 0
      ? formatKrw(Number(item.counterOfferProposedPrice))
      : undefined;
  const counterOfferMessage =
    typeof item.counterOfferMessage === "string" && item.counterOfferMessage.trim()
      ? item.counterOfferMessage.trim()
      : undefined;

  const showMarketActions = scope === "market" && item.uiState === DRIVER_UI_STATE.READY_TO_ACCEPT;
  const showPrepareAction =
    scope !== "market" &&
    item.uiState === DRIVER_UI_STATE.ASSIGNED &&
    item.cta?.id !== DRIVER_CTA_ID.START_DRIVE;
  const showNegotiatingMeta = scope !== "market" && item.uiState === DRIVER_UI_STATE.NEGOTIATING;
  const isAcceptingCurrent = acceptingMatchId === item.matchId;
  const isMarketActionBusy = isSubmittingOffer || isAcceptingCurrent;

  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      <AppCard style={styles.cardWrap} outlined={false} elevated>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: palette.bg }]}>
            <AppText variant="caption" weight="800" color={palette.text}>
              {item.statusLabel}
            </AppText>
          </View>

          <View style={styles.cardTopMeta}>
            <AppText variant="caption" weight="700" color="textMuted" numberOfLines={1} style={styles.timeText}>
              {item.requestedAtText || ""}
            </AppText>
          </View>
        </View>

        <View style={styles.timelineWrap}>
          <View style={styles.rail}>
            <View style={styles.dotStart} />
            <View style={styles.line} />
            <View style={styles.dotEnd} />
          </View>

          <View style={styles.addressWrap}>
            <View style={styles.addressBlock}>
              <AppText variant="caption" weight="800" color="textMuted">
                출발
              </AppText>
              <AppText variant="heading" weight="900" color="textMain" style={styles.addressText}>
                {item.originAddress || "-"}
              </AppText>
            </View>

            <View style={styles.addressBlock}>
              <AppText variant="caption" weight="800" color="textMuted">
                도착
              </AppText>
              <AppText variant="heading" weight="900" color="textMain" style={styles.addressText}>
                {item.destinationAddress || "-"}
              </AppText>
            </View>
          </View>
        </View>

        {item.routeDistanceText ? (
          <View style={styles.distanceChip}>
            <AppText variant="caption" weight="800" color="textSub">
              {item.routeDistanceText}
            </AppText>
          </View>
        ) : null}

        <View style={styles.cardBottom}>
          <View style={styles.tagWrap}>
            {item.tags.map((tag, idx) => (
              <View key={`${tag.label}-${idx}`} style={styles.specPill}>
                <AppText variant="caption" weight="700" color="textSub" numberOfLines={1}>
                  {tag.label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.priceWrap}>
            <AppText variant="caption" weight="800" color="textMuted">
              총 운임
            </AppText>
            <AppText variant="title" weight="900" color="brandPrimary">
              {item.priceText || "-"}
            </AppText>
          </View>
        </View>

        {showNegotiatingMeta ? (
          <View style={styles.negotiatingMetaWrap}>
            <View style={styles.negotiatingMetaRow}>
              <AppText variant="caption" weight="800" color="textMuted" numberOfLines={1} style={styles.negotiatingMetaLabel}>
                제안 금액
              </AppText>
              <AppText variant="detail" weight="900" color="brandPrimary" numberOfLines={1} style={styles.negotiatingMetaValue}>
                {counterOfferPriceText ?? "-"}
              </AppText>
            </View>
            <View style={styles.negotiatingMetaRow}>
              <AppText variant="caption" weight="800" color="textMuted" numberOfLines={1} style={styles.negotiatingMetaLabel}>
                제안 사유
              </AppText>
              <AppText variant="caption" weight="700" color="textSub" numberOfLines={2} style={styles.negotiatingMetaMessage}>
                {counterOfferMessage ?? "-"}
              </AppText>
            </View>
          </View>
        ) : null}

        {showPrepareAction ? (
          <View style={styles.prepareWrap}>
            <AppButton
              onPress={ctaPolicy.enabled ? () => onPrepareClick(item) : undefined}
              variant={ctaPolicy.enabled ? ctaVariant : "secondary"}
              disabled={!ctaPolicy.enabled}
              style={styles.prepareBtn}
              title={ctaPolicy.label}
              textStyle={{ fontWeight: "900" }}
            />
          </View>
        ) : null}

        {showMarketActions ? (
          <View style={styles.dualCtaRow}>
            <AppButton
              onPress={() => onOfferClick(item)}
              variant="secondary"
              style={styles.dualCtaButton}
              disabled={isMarketActionBusy}
              title="운임 제안"
              textStyle={{ fontWeight: "900" }}
            />
            <AppButton
              onPress={ctaPolicy.enabled ? () => onAcceptClick(item) : undefined}
              variant={ctaPolicy.enabled ? ctaVariant : "secondary"}
              disabled={!ctaPolicy.enabled || isMarketActionBusy}
              loading={isAcceptingCurrent}
              style={styles.dualCtaButton}
              title={ctaPolicy.label}
              textStyle={{ fontWeight: "900" }}
            />
          </View>
        ) : null}
      </AppCard>
    </Pressable>
  );
}

export const DriverOrderUnifiedCard = memo(DriverOrderUnifiedCardBase);
