import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { safeString } from "@/shared/theme/colorUtils";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { listDriverInquiriesMe, type DriverInquiryItem } from "@/features/driver-profile/api/driver-inquiry-api";

function createStyles(theme: AppTheme) {
  const cBg = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, cText);

  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, backgroundColor: cBg, gap: 10 },
    card: { borderWidth: 1, borderColor: cBorder, borderRadius: 14, padding: 14, gap: 6, backgroundColor: cBg },
    title: { color: cText, fontSize: 15, fontWeight: "800" },
    sub: { color: cSub, fontSize: 13 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    badge: { borderWidth: 1, borderColor: cBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: cText, fontSize: 12, fontWeight: "700" },
    btn: { borderWidth: 1, borderColor: cBorder, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
    btnText: { color: cText, fontSize: 14, fontWeight: "800" },
  });
}

function toStatusLabel(item: DriverInquiryItem) {
  if (item.answer) return "답변완료";
  if (item.status) return item.status;
  return "처리중";
}

export default function DriverInquiryListPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<DriverInquiryItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await listDriverInquiriesMe();
      if (mounted) setItems(res);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageScaffold title="문의 내역" backgroundColor={theme.colors.bgMain} contentStyle={styles.content} onPressBack={() => router.back()} backLabel="이전">
      <Pressable style={styles.btn} onPress={() => {}}>
        <Text style={styles.btnText}>문의하기 (준비중)</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ gap: 10 }}>
        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sub}>문의 내역이 없습니다.</Text>
          </View>
        ) : (
          items.map((it, idx) => (
            <View key={`inq-${idx}`} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>{it.title ?? "문의"}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{toStatusLabel(it)}</Text>
                </View>
              </View>
              <Text style={styles.sub}>{it.createdAt ?? "-"}</Text>
              {it.answer ? <Text style={styles.sub} numberOfLines={2}>{it.answer}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </PageScaffold>
  );
}
