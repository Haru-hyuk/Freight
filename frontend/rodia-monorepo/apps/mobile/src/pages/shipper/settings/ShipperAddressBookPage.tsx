import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import type { AddressItemMock } from "@/pages/shipper/settings/_mock";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import { shipperSettingsMock } from "./_mock";
import Divider from "./ui/Divider";
import SettingSection from "./ui/SettingSection";

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
    },
    helperText: {
      color: theme.colors.textMuted,
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    toggleWrap: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    toggleButton: {
      flex: 1,
    },
    listWrap: {
      gap: 10,
    },
    itemCard: {
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    itemTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    label: {
      color: theme.colors.textMain,
      flex: 1,
    },
    defaultBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.brandPrimary,
      backgroundColor: "#FFF7ED",
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    defaultBadgeText: {
      color: theme.colors.brandPrimary,
    },
    addressMain: {
      color: theme.colors.textMain,
    },
    addressDetail: {
      color: theme.colors.textSub,
    },
    memo: {
      color: theme.colors.textMuted,
    },
    itemActions: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      flex: 1,
    },
    emptyCard: {
      borderRadius: 14,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    emptyText: {
      color: theme.colors.textMuted,
      flex: 1,
    },
  });
}

function AddressItemCard({ item, onEdit, onDelete }: { item: AddressItemMock; onEdit: () => void; onDelete: () => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppCard outlined elevated={false} style={styles.itemCard}>
      <View style={styles.itemTop}>
        <AppText variant="detail" weight="800" style={styles.label}>
          {item.label}
        </AppText>
        {item.isDefault ? (
          <View style={styles.defaultBadge}>
            <AppText variant="caption" weight="800" style={styles.defaultBadgeText}>
              기본
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="detail" weight="700" style={styles.addressMain}>
        {item.address || "-"}
      </AppText>
      <AppText variant="caption" style={styles.addressDetail}>
        {item.addressDetail || "-"}
      </AppText>
      <Divider />
      <AppText variant="caption" style={styles.memo}>
        메모: {item.memo || "-"}
      </AppText>
      <View style={styles.itemActions}>
        <AppButton title="편집" variant="secondary" size="sm" style={styles.actionButton} onPress={onEdit} />
        <AppButton title="삭제" variant="destructive" size="sm" style={styles.actionButton} onPress={onDelete} />
      </View>
    </AppCard>
  );
}

export default function ShipperAddressBookPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showEmptyCase, setShowEmptyCase] = useState(false);

  const addresses = showEmptyCase ? shipperSettingsMock.addresses.empty : shipperSettingsMock.addresses.primary;

  return (
    <PageScaffold
      title="상/하차지 주소 관리"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <AppText variant="detail" style={styles.helperText}>
        주소 추가/편집/삭제는 데모 동작으로 Alert만 표시됩니다.
      </AppText>

      <View style={styles.toggleWrap}>
        <AppButton
          title="기본 목록"
          variant={showEmptyCase ? "secondary" : "primary"}
          style={styles.toggleButton}
          onPress={() => setShowEmptyCase(false)}
        />
        <AppButton
          title="빈 목록"
          variant={showEmptyCase ? "primary" : "secondary"}
          style={styles.toggleButton}
          onPress={() => setShowEmptyCase(true)}
        />
      </View>

      <SettingSection
        title="주소 목록"
        description="상차지/하차지/즐겨찾기 주소"
        right={<AppButton title="주소 추가" size="sm" onPress={() => Alert.alert("주소 추가", "주소 추가 화면은 목업입니다.")} />}
      >
        {addresses.length > 0 ? (
          <View style={styles.listWrap}>
            {addresses.map((item) => (
              <AddressItemCard
                key={item.id}
                item={item}
                onEdit={() => Alert.alert("주소 편집", `${item.label} 편집은 목업 동작입니다.`)}
                onDelete={() => Alert.alert("주소 삭제", `${item.label} 삭제는 목업 동작입니다.`)}
              />
            ))}
          </View>
        ) : (
          <AppCard outlined elevated={false} style={styles.emptyCard}>
            <Ionicons name="map-outline" size={20} color={theme.colors.textMuted} />
            <AppText variant="detail" style={styles.emptyText}>
              등록된 주소가 없습니다.
            </AppText>
          </AppCard>
        )}
      </SettingSection>
    </PageScaffold>
  );
}

