import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { CounterOfferCreateRequest } from "@/shared/api/generated/schemas";
import {
  applyMockAccept,
  applyMockCancel,
  getLatestMockCounterOffer,
  resolveDriverMatchFromCache,
  setLatestMockCounterOffer,
  type DriverMatchSummary,
} from "@/features/matching/model/driverMatchMockStore";
import { toDriverMatchStatusLabel } from "@/features/matching/model/driverMatchStatus";
import { getDriverMatchMode } from "@/shared/lib/config/env";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DriverMatchDetailRouteSnapshot = Partial<DriverMatchSummary>;

type DriverMatchDetailPageProps = {
  matchId: number;
  routeSnapshot?: DriverMatchDetailRouteSnapshot;
};

function formatDateTime(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "-";

  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) return "-";

  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

function toAcceptedLabel(accepted: boolean | undefined): string {
  if (accepted === true) return "true";
  if (accepted === false) return "false";
  return "-";
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cDanger = safeString(theme?.colors?.semanticDanger, "#EF4444");
  const cInfo = safeString(theme?.colors?.semanticInfo, "#2563EB");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 20,
      gap: spacing * 3,
    },
    card: {
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      padding: spacing * 4,
      gap: spacing * 2,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing,
    },
    statusChip: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.25, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    statusChipText: {
      color: cPrimary,
      fontWeight: "800",
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
    },
    divider: {
      height: 1,
      backgroundColor: tint(cBorder, 0.8, cBorder),
    },
    infoRow: {
      minHeight: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    infoLabel: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    infoValue: {
      flex: 1,
      textAlign: "right",
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      flex: 1,
      minHeight: 38,
    },
    counterForm: {
      gap: spacing,
    },
    helpText: {
      color: cInfo,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    errorText: {
      color: cDanger,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    successText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
  });
});

export function DriverMatchDetailPage({ matchId, routeSnapshot }: DriverMatchDetailPageProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const driverMatchMode = getDriverMatchMode();
  const isMockMode = driverMatchMode === "mock";

  const [match, setMatch] = useState<DriverMatchSummary | null>(null);
  const [latestCounterOffer, setLatestCounterOffer] = useState<CounterOfferCreateRequest | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const backgroundColor = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const textMain = safeString(theme?.colors?.textMain, "#111827");
  const textMuted = safeString(theme?.colors?.textMuted, "#64748B");

  useEffect(() => {
    if (matchId <= 0) {
      setMatch(null);
      return;
    }

    const resolved = resolveDriverMatchFromCache(matchId, routeSnapshot);
    setMatch(resolved ?? { matchId });
    setLatestCounterOffer(getLatestMockCounterOffer(matchId));
  }, [matchId, routeSnapshot]);

  if (matchId <= 0) {
    return (
      <PageScaffold title="오더 상세" backgroundColor={backgroundColor}>
        <AppEmptyState title="유효한 오더 ID가 없습니다." description="목록에서 다시 선택해 주세요." />
      </PageScaffold>
    );
  }

  if (!match) {
    return (
      <PageScaffold title="오더 상세" backgroundColor={backgroundColor}>
        <AppEmptyState title="오더 정보를 찾을 수 없습니다." description="목록에서 다시 선택해 주세요." />
      </PageScaffold>
    );
  }

  const submitAccept = () => {
    if (!isMockMode || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const next = applyMockAccept(match.matchId);
    if (!next) {
      setErrorMessage("오더 상태를 갱신할 수 없습니다.");
      setSubmitting(false);
      return;
    }

    setMatch(next);
    setSuccessMessage("수락이 반영되었습니다.");
    setSubmitting(false);
  };

  const submitCancel = () => {
    if (!isMockMode || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const next = applyMockCancel(match.matchId);
    if (!next) {
      setErrorMessage("오더 상태를 갱신할 수 없습니다.");
      setSubmitting(false);
      return;
    }

    setMatch(next);
    setSuccessMessage("취소가 반영되었습니다.");
    setSubmitting(false);
  };

  const submitCounterOffer = () => {
    if (!isMockMode || submitting) return;

    const proposedPrice = Number(priceInput);
    const safePrice = Number.isFinite(proposedPrice) && Math.trunc(proposedPrice) > 0 ? Math.trunc(proposedPrice) : undefined;
    const message = messageInput.trim() || undefined;

    if (!safePrice && !message) {
      setErrorMessage("금액 또는 사유를 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const nextOffer = setLatestMockCounterOffer(match.matchId, {
      proposedPrice: safePrice,
      message,
    });

    if (!nextOffer) {
      setErrorMessage("역제안을 저장할 수 없습니다.");
      setSubmitting(false);
      return;
    }

    setLatestCounterOffer(nextOffer);
    setPriceInput("");
    setMessageInput("");
    setSuccessMessage("역제안이 제출되었습니다.");
    setSubmitting(false);
  };

  return (
    <PageScaffold title="오더 상세" backgroundColor={backgroundColor} scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard outlined style={styles.card}>
          <View style={styles.headerRow}>
            <AppText variant="heading" weight="800" color={textMain}>
              {`오더 #${match.matchId}`}
            </AppText>
            <View style={styles.statusChip}>
              <AppText style={styles.statusChipText}>{toDriverMatchStatusLabel(match.status)}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>matchId</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {match.matchId}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>quoteId</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {typeof match.quoteId === "number" && match.quoteId > 0 ? match.quoteId : "-"}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>status</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {match.status || "-"}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>accepted</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {toAcceptedLabel(match.accepted)}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>createdAt</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {formatDateTime(match.createdAt)}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>updatedAt</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {formatDateTime(match.updatedAt)}
            </AppText>
          </View>
        </AppCard>

        <AppCard outlined style={styles.card}>
          <AppText variant="heading" weight="800" color={textMain}>
            액션
          </AppText>

          {!isMockMode ? (
            <AppText style={styles.helpText}>서버 권한/연동 준비중</AppText>
          ) : null}

          <View style={styles.actionRow}>
            <AppButton
              title="수락"
              variant="primary"
              style={styles.actionButton}
              loading={submitting && isMockMode}
              disabled={!isMockMode || submitting}
              onPress={submitAccept}
            />
            <AppButton
              title="취소"
              variant="destructive"
              style={styles.actionButton}
              loading={submitting && isMockMode}
              disabled={!isMockMode || submitting}
              onPress={submitCancel}
            />
          </View>

          <View style={styles.counterForm}>
            <AppInput
              label="역제안 금액"
              placeholder="예) 120000"
              value={priceInput}
              keyboardType="number-pad"
              editable={isMockMode && !submitting}
              onChangeText={(text) => {
                setPriceInput(text.replace(/[^0-9]/g, ""));
              }}
            />
            <AppInput
              label="사유"
              placeholder="선택 입력"
              value={messageInput}
              editable={isMockMode && !submitting}
              onChangeText={setMessageInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <AppButton
              title="역제안 제출"
              variant="primary"
              loading={submitting && isMockMode}
              disabled={!isMockMode || submitting}
              onPress={submitCounterOffer}
            />
          </View>

          {latestCounterOffer ? <View style={styles.divider} /> : null}
          {latestCounterOffer ? (
            <>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>최근 금액</AppText>
                <AppText variant="caption" color={textMuted} style={styles.infoValue}>
                  {typeof latestCounterOffer.proposedPrice === "number" ? latestCounterOffer.proposedPrice : "-"}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>최근 사유</AppText>
                <AppText variant="caption" color={textMuted} style={styles.infoValue}>
                  {latestCounterOffer.message || "-"}
                </AppText>
              </View>
            </>
          ) : null}

          {errorMessage ? <AppText style={styles.errorText}>{errorMessage}</AppText> : null}
          {successMessage ? <AppText style={styles.successText}>{successMessage}</AppText> : null}
        </AppCard>
      </ScrollView>
    </PageScaffold>
  );
}

export default DriverMatchDetailPage;
