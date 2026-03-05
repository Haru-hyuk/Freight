import type { DriverQuoteSummaryResponse } from "@/shared/api/generated/schemas/driverQuoteSummaryResponse";
import type { MatchResponse } from "@/shared/api/generated/schemas/matchResponse";

export interface ActiveRun {
  match: MatchResponse;
  summary?: DriverQuoteSummaryResponse;
}
