import React, { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

type LegacyParams = {
  id?: string | string[];
  matchId?: string | string[];
  quoteId?: string | string[];
  status?: string | string[];
  createdAt?: string | string[];
  updatedAt?: string | string[];
  accepted?: string | string[];
};

function readFirst(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

export default function DriverMatchesLegacyDetailRoute() {
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
        },
      }}
    />
  );
}
