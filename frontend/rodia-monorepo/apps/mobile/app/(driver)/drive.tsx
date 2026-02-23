import React, { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

type LegacyParams = {
  id?: string | string[];
  runId?: string | string[];
  quoteId?: string | string[];
};

function readFirst(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

export default function DriverDriveLegacyRoute() {
  const params = useLocalSearchParams<LegacyParams>();

  const nextId = useMemo(() => {
    const legacyId = readFirst(params?.id) || readFirst(params?.runId) || readFirst(params?.quoteId);
    return legacyId || "current";
  }, [params?.id, params?.quoteId, params?.runId]);

  return <Redirect href={{ pathname: "/(driver)/run/[id]", params: { id: nextId } }} />;
}

