import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { shipperSettingsMock } from "@/features/shipper-settings/api/shipper-settings-mock";

import SettingRow from "./ui/SettingRow";
import SettingSection from "./ui/SettingSection";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  trailingText?: string;
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
    menuGroup: {
      gap: 8,
    },
  });
}

export default function ShipperSettingsHomePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navLockRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  const pushOnce = (path: string) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    router.push(path as never);
    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
    }
    unlockTimerRef.current = setTimeout(() => {
      navLockRef.current = false;
      unlockTimerRef.current = null;
    }, 300);
  };

  const verificationSummary = shipperSettingsMock.businessInfo.verificationStatus;
  const menuGroups = useMemo(
    () =>
      [
        {
          id: "group-business",
          title: "사업자 정보 & 인증",
          description: "사업자 정보 확인, 인증상태 관리",
          items: [
            {
              id: "menu-business-info",
              title: "사업자 정보",
              subtitle: "상호/대표자/사업자번호/담당자 정보",
              path: "/(shipper)/settings/business",
              trailingText: verificationSummary,
            },
            {
              id: "menu-verification",
              title: "인증관리",
              subtitle: "휴대폰/사업자/결제수단 인증 상태",
              path: "/(shipper)/settings/verification",
            },
          ] as MenuItem[],
        },
        {
          id: "group-profile",
          title: "회원/주소/결제",
          description: "수정은 Alert 동작으로만 제공",
          items: [
            {
              id: "menu-account",
              title: "회원정보 수정",
              subtitle: "이름/연락처/이메일/수신동의",
              path: "/(shipper)/settings/account",
            },
            {
              id: "menu-addresses",
              title: "상/하차지 주소 관리",
              subtitle: "기본 주소, 메모, 편집/삭제",
              path: "/(shipper)/settings/addresses",
              trailingText: `${shipperSettingsMock.addresses.primary.length}개`,
            },
            {
              id: "menu-payments",
              title: "운임 결제수단 관리",
              subtitle: "카드/계좌/후불 수단",
              path: "/(shipper)/settings/payments",
              trailingText: `${shipperSettingsMock.paymentMethods.length}개`,
            },
            {
              id: "menu-tax",
              title: "세금계산서 발행내역",
              subtitle: "기간 필터 + 발행 히스토리",
              path: "/(shipper)/settings/tax-invoices",
              trailingText: `${shipperSettingsMock.taxInvoices.length}건`,
            },
          ] as MenuItem[],
        },
      ] as Array<{ id: string; title: string; description: string; items: MenuItem[] }>,
    [verificationSummary]
  );

  return (
    <PageScaffold
      title="설정"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="이전"
    >
      <AppText variant="detail" style={styles.helperText}>
        모든 화면은 목업 데이터로만 구성되어 있으며 저장/추가는 안내 메시지만 표시됩니다.
      </AppText>

      {menuGroups.map((group) => (
        <SettingSection key={group.id} title={group.title} description={group.description}>
          <View style={styles.menuGroup}>
            {group.items.map((item) => (
              <SettingRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                trailingText={item.trailingText}
                onPress={() => pushOnce(item.path)}
              />
            ))}
          </View>
        </SettingSection>
      ))}
    </PageScaffold>
  );
}
