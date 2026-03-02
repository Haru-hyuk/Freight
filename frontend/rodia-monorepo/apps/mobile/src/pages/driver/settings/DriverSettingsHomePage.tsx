import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { useAuth } from "@/features/auth/model/useAuth";
import { getDriverTruckApproved } from "@/features/driver-profile/api/driver-profile-api";

import SettingRow from "@/pages/shipper/settings/ui/SettingRow";
import SettingSection from "@/pages/shipper/settings/ui/SettingSection";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  path?: string;
  trailingText?: string;
  onPress?: () => void;
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
    },
    menuGroup: {
      gap: 8,
    },
  });
}

export default function DriverSettingsHomePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const auth = useAuth();

  const navLockRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [truckApproved, setTruckApproved] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    let mounted = true;
    (async () => {
      const v = await getDriverTruckApproved();
      if (mounted) setTruckApproved(v);
    })();

    return () => {
      mounted = false;
    };
  }, [auth.status]);

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

  const truckTrailing =
    truckApproved === null ? "-" : truckApproved ? "승인완료" : "심사중";

  const menuGroups = useMemo(
    () =>
      [
        {
          id: "group-account",
          title: "내 정보",
          description: "회원정보 확인 및 수정",
          items: [
            {
              id: "menu-account",
              title: "회원정보 수정",
              subtitle: "이름/연락처/이메일",
              path: "/(driver)/settings/account",
            },
          ] as MenuItem[],
        },
        {
          id: "group-truck",
          title: "차량",
          description: "차량 심사/승인 상태 확인",
          items: [
            {
              id: "menu-trucks",
              title: "차량 승인 상태",
              subtitle: "내 차량 심사/승인 진행상태",
              path: "/(driver)/settings/trucks",
              trailingText: truckTrailing,
            },
          ] as MenuItem[],
        },
        {
          id: "group-support",
          title: "고객 지원",
          description: "문의/정책 안내",
          items: [
            {
              id: "menu-help",
              title: "1:1 문의 / 고객센터",
              subtitle: "문의 접수 및 상담",
              onPress: () => Alert.alert("고객센터", "고객센터 화면을 준비 중입니다."),
            },
            {
              id: "menu-terms",
              title: "이용약관",
              subtitle: "서비스 이용약관 확인",
              onPress: () => Alert.alert("이용약관", "약관 화면을 준비 중입니다."),
            },
          ] as MenuItem[],
        },
        {
          id: "group-auth",
          title: "계정",
          description: "로그아웃",
          items: [
            {
              id: "menu-logout",
              title: auth.isBusy ? "로그아웃 중..." : "로그아웃",
              subtitle: "현재 계정에서 로그아웃",
              onPress: async () => {
                if (auth.isBusy) return;
                try {
                  await auth.logout();
                } catch {
                  Alert.alert("오류", "로그아웃 처리 중 문제가 발생했습니다.");
                }
              },
            },
          ] as MenuItem[],
        },
      ] as Array<{ id: string; title: string; description: string; items: MenuItem[] }>,
    [auth, truckTrailing]
  );

  return (
    <PageScaffold
      title="설정"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="이전"
    >
      {menuGroups.map((group) => (
        <SettingSection key={group.id} title={group.title} description={group.description}>
          <View style={styles.menuGroup}>
            {group.items.map((item) => (
              <SettingRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                trailingText={item.trailingText}
                onPress={() => (item.onPress ? item.onPress() : item.path ? pushOnce(item.path) : undefined)}
              />
            ))}
          </View>
        </SettingSection>
      ))}
    </PageScaffold>
  );
}
