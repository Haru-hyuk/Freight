import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import DriverMatchDetailPage from "@/pages/driver/matches/DriverMatchDetailPage";
import DriverMyMatchesPage from "@/pages/driver/matches/DriverMyMatchesPage";

function readParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function toPositiveInt(text: string): number {
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toOptionalBoolean(text: string): boolean | undefined {
  if (!text) return undefined;
  if (text === "true") return true;
  if (text === "false") return false;
  return undefined;
}

export default function DriverRunRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    matchId?: string | string[];
    quoteId?: string | string[];
    status?: string | string[];
    createdAt?: string | string[];
    updatedAt?: string | string[];
    accepted?: string | string[];
  }>();

  const idText = readParam(params?.id) || readParam(params?.matchId);
  if (!idText || idText === "current") {
    return <DriverMyMatchesPage />;
  }

  const matchId = toPositiveInt(idText);
  if (matchId <= 0) {
    return <Redirect href="/(driver)/run/current" />;
  }

  const quoteIdText = readParam(params?.quoteId);
  const status = readParam(params?.status) || undefined;
  const createdAt = readParam(params?.createdAt) || undefined;
  const updatedAt = readParam(params?.updatedAt) || undefined;
  const accepted = toOptionalBoolean(readParam(params?.accepted));
  const quoteId = toPositiveInt(quoteIdText);

  return (
    <DriverMatchDetailPage
      matchId={matchId}
      routeSnapshot={{
        matchId,
        quoteId: quoteId > 0 ? quoteId : undefined,
        status,
        createdAt,
        updatedAt,
        accepted,
      }}
    />
  );
}
