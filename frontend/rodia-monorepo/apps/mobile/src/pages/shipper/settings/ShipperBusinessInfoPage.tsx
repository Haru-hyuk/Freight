import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { BusinessInfoMock, VerificationStatus } from "@/features/shipper-settings/api/shipper-settings-mock";
import { shipperSettingsMock } from "@/features/shipper-settings/api/shipper-settings-mock";
import { isMockMode } from "@/shared/lib/config/env";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import Divider from "./ui/Divider";
import KeyValueRow from "./ui/KeyValueRow";
import SettingSection from "./ui/SettingSection";

function toBadgeLabel(status: VerificationStatus): string {
  if (status === "VERIFIED") return "인증완료";
  if (status === "PENDING") return "검토중";
  return "반려";
}

function toDocumentStatusLabel(status: "APPROVED" | "PENDING" | "REJECTED"): string {
  if (status === "APPROVED") return "승인";
  if (status === "PENDING") return "검토중";
  return "반려";
}

function toDisplayDate(input: string): string {
  const ts = Date.parse(input);
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
    },
    badge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 12,
      backgroundColor: theme.colors.bgSurface,
    },
    badgeVerified: {
      borderColor: theme.colors.semanticSuccess,
      backgroundColor: "#ECFDF3",
    },
    badgePending: {
      borderColor: theme.colors.semanticWarning,
      backgroundColor: "#FFFBEB",
    },
    badgeRejected: {
      borderColor: theme.colors.semanticDanger,
      backgroundColor: "#FEF2F2",
    },
    badgeTextVerified: {
      color: theme.colors.semanticSuccess,
    },
    badgeTextPending: {
      color: theme.colors.semanticWarning,
    },
    badgeTextRejected: {
      color: theme.colors.semanticDanger,
    },
    documentRow: {
      gap: 8,
      paddingVertical: 8,
    },
    documentTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    documentName: {
      flex: 1,
      color: theme.colors.textMain,
    },
    documentStatus: {
      minWidth: 62,
      textAlign: "right",
      color: theme.colors.textSub,
    },
  });
}

const EMPTY_BUSINESS_INFO: BusinessInfoMock = {
  companyName: "", representativeName: "", businessNumber: "",
  businessType: "", businessItem: "", officeAddress: "",
  officeAddressDetail: "", managerName: "", managerPhone: "",
  managerEmail: "", verificationStatus: "PENDING" as VerificationStatus,
  documents: [],
};

export default function ShipperBusinessInfoPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const data = isMockMode() ? shipperSettingsMock.businessInfo : EMPTY_BUSINESS_INFO;
  const statusLabel = toBadgeLabel(data.verificationStatus);

  return (
    <PageScaffold
      title="사업자 정보"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <View
        style={[
          styles.badge,
          data.verificationStatus === "VERIFIED"
            ? styles.badgeVerified
            : data.verificationStatus === "PENDING"
            ? styles.badgePending
            : styles.badgeRejected,
        ]}
      >
        <AppText
          variant="caption"
          weight="800"
          style={[
            data.verificationStatus === "VERIFIED"
              ? styles.badgeTextVerified
              : data.verificationStatus === "PENDING"
              ? styles.badgeTextPending
              : styles.badgeTextRejected,
          ]}
        >
          {statusLabel}
        </AppText>
      </View>

      <SettingSection title="기본 정보">
        <KeyValueRow label="상호" value={data.companyName} />
        <KeyValueRow label="대표자" value={data.representativeName} />
        <KeyValueRow label="사업자번호" value={data.businessNumber} />
        <KeyValueRow label="업태" value={data.businessType} />
        <KeyValueRow label="종목" value={data.businessItem} />
      </SettingSection>

      <SettingSection title="사업장 정보">
        <KeyValueRow label="주소" value={data.officeAddress} />
        <KeyValueRow label="상세주소" value={data.officeAddressDetail} />
      </SettingSection>

      <SettingSection title="담당자 정보">
        <KeyValueRow label="담당자" value={data.managerName} />
        <KeyValueRow label="연락처" value={data.managerPhone} />
        <KeyValueRow label="이메일" value={data.managerEmail} />
      </SettingSection>

      <SettingSection title="제출 서류 목록" description="서류 상태는 확인 전용입니다.">
        {data.documents.map((doc, index) => (
          <View key={doc.id}>
            <View style={styles.documentRow}>
              <View style={styles.documentTop}>
                <AppText variant="detail" weight="700" style={styles.documentName}>
                  {doc.fileName}
                </AppText>
                <AppText variant="caption" weight="800" style={styles.documentStatus}>
                  {toDocumentStatusLabel(doc.status)}
                </AppText>
              </View>
              <KeyValueRow label="제출일" value={toDisplayDate(doc.submittedAt)} />
            </View>
            {index !== data.documents.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </SettingSection>
    </PageScaffold>
  );
}
