import React, { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import DriverMatchDetailPage from "@/pages/driver/matches/DriverMatchDetailPage";

type LegacyParams = {
  id?: string | string[];
  matchId?: string | string[];
  quoteId?: string | string[];
  status?: string | string[];
  createdAt?: string | string[];
  updatedAt?: string | string[];
  accepted?: string | string[];
  acceptedAt?: string | string[];
};

function readFirst(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

export default function DriverMatchesDetailRoute() {
  const params = useLocalSearchParams<LegacyParams>();

  const nextId = useMemo(() => {
    const legacyId = readFirst(params?.id) || readFirst(params?.matchId);
    return legacyId || "current";
  }, [params?.id, params?.matchId]);

  const quoteId = readFirst(params?.quoteId);
  const status = readFirst(params?.status);
  const createdAt = readFirst(params?.createdAt);
  const updatedAt = readFirst(params?.updatedAt);
  const accepted = readFirst(params?.accepted);
  const acceptedAt = readFirst(params?.acceptedAt);

  const isLegacyRunAlias = Boolean(quoteId || status || createdAt || updatedAt || accepted || acceptedAt);

  // Legacy alias: keep backward compatibility for deep-links that used to land on run detail.
  if (nextId === "current" || isLegacyRunAlias) {
    return (
      <Redirect
        href={{
          pathname: "/(driver)/run/[id]",
          params: {
            id: nextId,
            ...(quoteId ? { quoteId } : {}),
            ...(status ? { status } : {}),
            ...(createdAt ? { createdAt } : {}),
            ...(updatedAt ? { updatedAt } : {}),
            ...(accepted ? { accepted } : {}),
            ...(acceptedAt ? { acceptedAt } : {}),
          },
        }}
      />
    );
  }

  const matchId = Number(nextId);
  return <DriverMatchDetailPage matchId={matchId} />;
}