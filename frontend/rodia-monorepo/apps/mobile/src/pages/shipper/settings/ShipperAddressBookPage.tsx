import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  createShipperAddressBookItem,
  deleteShipperAddressBookItem,
  listShipperAddressBook,
  type ShipperAddressBookItem,
  type UpsertShipperAddressBookItemInput,
  updateShipperAddressBookItem,
} from "@/features/shipper-settings/api/shipper-address-book-api";
import { PostcodeModal } from "@/features/quote/ui/PostcodeModal";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import Divider from "./ui/Divider";
import SettingSection from "./ui/SettingSection";

type AddressBookFormState = {
  label: string;
  isDefault: boolean;
  address: string;
  addressDetail: string;
  memo: string;
};

type AddressSelectionPayload = {
  address?: string;
  roadAddress?: string;
  jibunAddress?: string;
};

const EMPTY_FORM: AddressBookFormState = {
  label: "",
  isDefault: false,
  address: "",
  addressDetail: "",
  memo: "",
};

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
    loadingWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.35)",
      justifyContent: "center",
      padding: 16,
    },
    modalCard: {
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    modalTitle: {
      color: theme.colors.textMain,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      color: theme.colors.textMuted,
    },
    input: {
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      color: theme.colors.textMain,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    addressButton: {
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    addressButtonFilled: {
      borderColor: theme.colors.brandPrimary,
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    addressButtonText: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 14,
    },
    addressButtonTextFilled: {
      color: theme.colors.textMain,
      fontWeight: "600",
    },
    switchRow: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    switchLabelWrap: {
      flex: 1,
      gap: 2,
    },
    switchTitle: {
      color: theme.colors.textMain,
    },
    switchSub: {
      color: theme.colors.textMuted,
    },
    modalActions: {
      flexDirection: "row",
      gap: 8,
    },
    modalAction: {
      flex: 1,
    },
  });
}

function AddressItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ShipperAddressBookItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppCard outlined elevated={false} style={styles.itemCard}>
      <View style={styles.itemTop}>
        <AppText variant="detail" weight="800" style={styles.label}>
          {item.label || "-"}
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addresses, setAddresses] = useState<ShipperAddressBookItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressBookFormState>(EMPTY_FORM);

  const loadAddressBook = useCallback(async () => {
    try {
      const list = await listShipperAddressBook();
      setAddresses(Array.isArray(list) ? list : []);
    } catch (error) {
      Alert.alert("주소록 조회 실패", readApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddressBook();
  }, [loadAddressBook]);

  const openCreate = useCallback(() => {
    setEditingItemId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((item: ShipperAddressBookItem) => {
    setEditingItemId(item.id);
    setForm({
      label: item.label,
      isDefault: item.isDefault,
      address: item.address,
      addressDetail: item.addressDetail,
      memo: item.memo,
    });
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (isSaving) return;
    setIsFormOpen(false);
  }, [isSaving]);

  const openPostcode = useCallback(() => {
    setIsFormOpen(false);
    setIsPostcodeOpen(true);
  }, []);

  const closePostcode = useCallback(() => {
    setIsPostcodeOpen(false);
    setIsFormOpen(true);
  }, []);

  const handleAddressSelected = useCallback(
    (data: AddressSelectionPayload) => {
      const selectedAddress = String(data?.address ?? data?.roadAddress ?? data?.jibunAddress ?? "").trim();
      if (!selectedAddress) {
        closePostcode();
        return;
      }
      setForm((prev) => ({ ...prev, address: selectedAddress }));
      closePostcode();
    },
    [closePostcode]
  );

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    const payload: UpsertShipperAddressBookItemInput = {
      label: form.label.trim(),
      isDefault: form.isDefault,
      address: form.address.trim(),
      addressDetail: form.addressDetail.trim(),
      memo: form.memo.trim(),
    };

    if (!payload.label) {
      Alert.alert("입력 확인", "주소 라벨을 입력해주세요.");
      return;
    }
    if (!payload.address) {
      Alert.alert("입력 확인", "주소를 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItemId) {
        await updateShipperAddressBookItem(editingItemId, payload);
      } else {
        await createShipperAddressBookItem(payload);
      }
      setIsFormOpen(false);
      await loadAddressBook();
      Alert.alert("저장 완료", "주소록이 업데이트되었습니다.");
    } catch (error) {
      Alert.alert("저장 실패", readApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [editingItemId, form, isSaving, loadAddressBook]);

  const handleDelete = useCallback(
    (item: ShipperAddressBookItem) => {
      Alert.alert("주소 삭제", `${item.label || "이 주소"}를 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            if (isSaving) return;
            setIsSaving(true);
            try {
              await deleteShipperAddressBookItem(item.id);
              await loadAddressBook();
              Alert.alert("삭제 완료", "주소가 삭제되었습니다.");
            } catch (error) {
              Alert.alert("삭제 실패", readApiErrorMessage(error));
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]);
    },
    [isSaving, loadAddressBook]
  );

  return (
    <PageScaffold
      title="상/하차지 주소 관리"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <AppText variant="detail" style={styles.helperText}>
        자주 쓰는 주소를 등록하고 견적 생성 시 빠르게 불러올 수 있습니다.
      </AppText>

      <SettingSection
        title="주소 목록"
        description="상차지/하차지/즐겨찾기 주소"
        right={<AppButton title="주소 추가" size="sm" onPress={openCreate} />}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.colors.brandPrimary} />
          </View>
        ) : addresses.length > 0 ? (
          <View style={styles.listWrap}>
            {addresses.map((item) => (
              <AddressItemCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
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

      <Modal visible={isFormOpen} transparent animationType="fade" onRequestClose={closeForm}>
        <View style={styles.modalOverlay}>
          <AppCard outlined elevated style={styles.modalCard}>
            <AppText variant="body" weight="800" style={styles.modalTitle}>
              {editingItemId ? "주소 편집" : "주소 추가"}
            </AppText>

            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                라벨
              </AppText>
              <TextInput
                value={form.label}
                onChangeText={(value) => setForm((prev) => ({ ...prev, label: value ?? "" }))}
                style={styles.input}
                placeholder="예: 상차지, 하차지, 거래처"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                주소
              </AppText>
              <Pressable
                onPress={openPostcode}
                style={[styles.addressButton, form.address.trim() ? styles.addressButtonFilled : undefined]}
              >
                <AppText
                  style={[styles.addressButtonText, form.address.trim() ? styles.addressButtonTextFilled : undefined]}
                  numberOfLines={1}
                >
                  {form.address.trim() || "주소 검색"}
                </AppText>
                <Ionicons
                  name="search"
                  size={16}
                  color={form.address.trim() ? theme.colors.brandPrimary : theme.colors.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                상세주소
              </AppText>
              <TextInput
                value={form.addressDetail}
                onChangeText={(value) => setForm((prev) => ({ ...prev, addressDetail: value ?? "" }))}
                style={styles.input}
                placeholder="층/호/도크 등"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                메모
              </AppText>
              <TextInput
                value={form.memo}
                onChangeText={(value) => setForm((prev) => ({ ...prev, memo: value ?? "" }))}
                style={styles.input}
                placeholder="기사님 전달 메모"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabelWrap}>
                <AppText variant="detail" weight="700" style={styles.switchTitle}>
                  기본 주소로 설정
                </AppText>
                <AppText variant="caption" style={styles.switchSub}>
                  기본 주소는 목록에서 강조 표시됩니다.
                </AppText>
              </View>
              <Switch value={form.isDefault} onValueChange={(value) => setForm((prev) => ({ ...prev, isDefault: value }))} />
            </View>

            <View style={styles.modalActions}>
              <AppButton title="취소" variant="secondary" style={styles.modalAction} onPress={closeForm} />
              <AppButton
                title={isSaving ? "저장 중..." : "저장"}
                style={styles.modalAction}
                onPress={handleSave}
                disabled={isSaving}
              />
            </View>
          </AppCard>
        </View>
      </Modal>

      <PostcodeModal
        visible={isPostcodeOpen}
        onClose={closePostcode}
        onSelected={handleAddressSelected}
      />
    </PageScaffold>
  );
}
