import React from "react";
import { StyleSheet, View } from "react-native";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type RouteKind = "origin" | "waypoint" | "destination";

type RouteNode = {
  key: string;
  title: string;
  kind: RouteKind;
  address?: string;
  caption?: string;
};

type QuoteRouteInfoProps = {
  title?: string;
  originAddress: string;
  destinationAddress: string;
  waypointAddresses?: string[];
};

function toText(value: string | undefined, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function buildNodes(props: QuoteRouteInfoProps): RouteNode[] {
  const nodes: RouteNode[] = [
    {
      key: "origin",
      title: "출발지",
      kind: "origin",
      address: toText(props.originAddress),
    },
  ];

  const waypointCount = (Array.isArray(props.waypointAddresses) ? props.waypointAddresses : []).filter(
    (address) => String(address ?? "").trim().length > 0
  ).length;
  if (waypointCount > 0) {
    nodes.push({
      key: "waypoint",
      title: `경유지 ${waypointCount}곳`,
      kind: "waypoint",
      caption: "중간 경유지를 포함한 운송입니다.",
    });
  }

  nodes.push({
    key: "destination",
    title: "도착지",
    kind: "destination",
    address: toText(props.destinationAddress),
  });
  return nodes;
}

const useStyles = createThemedStyles((theme) => {
  const s = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    section: { gap: s * 2 },
    title: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
    },
    inner: { padding: s * 4, gap: s },
    row: { flexDirection: "row", alignItems: "stretch", gap: s },
    rail: { width: 20, alignItems: "center" },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: theme.colors.borderStrong },
    dotOrigin: { backgroundColor: theme.colors.textMain },
    dotWaypoint: { backgroundColor: theme.colors.brandPrimary },
    dotDestination: { backgroundColor: theme.colors.semanticSuccess },
    line: { width: 2, flex: 1, marginTop: 4, backgroundColor: tint(theme.colors.textMain, 0.12, theme.colors.borderDefault) },
    body: { flex: 1, paddingBottom: s * 2 },
    nodeTitle: {
      color: theme.colors.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    address: {
      color: theme.colors.textMain,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "900",
      marginTop: 2,
    },
    caption: {
      color: theme.colors.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      marginTop: 2,
    },
  });
});

export function QuoteRouteInfo({ title = "운송 경로", ...props }: QuoteRouteInfoProps) {
  const styles = useStyles();
  const nodes = React.useMemo(() => buildNodes(props), [props.destinationAddress, props.originAddress, props.waypointAddresses]);

  return (
    <View style={styles.section}>
      <AppText style={styles.title}>{title}</AppText>
      <AppCard elevated={false} style={styles.card}>
        <View style={styles.inner}>
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1;
            const isWaypoint = node.kind === "waypoint";
            return (
              <View key={node.key} style={styles.row}>
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.dot,
                      node.kind === "origin" ? styles.dotOrigin : null,
                      node.kind === "waypoint" ? styles.dotWaypoint : null,
                      node.kind === "destination" ? styles.dotDestination : null,
                    ]}
                  />
                  {!isLast ? <View style={styles.line} /> : null}
                </View>
                <View style={styles.body}>
                  <AppText style={styles.nodeTitle}>{node.title}</AppText>
                  {isWaypoint ? <AppText style={styles.caption}>{node.caption}</AppText> : null}
                  {!isWaypoint ? <AppText style={styles.address}>{toText(node.address)}</AppText> : null}
                </View>
              </View>
            );
          })}
        </View>
      </AppCard>
    </View>
  );
}
