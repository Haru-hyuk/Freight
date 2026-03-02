import { apiClient } from "@/shared/lib/api/apiClient";

type AnyObj = Record<string, any>;

function asObj(v: unknown): AnyObj {
  return v && typeof v === "object" ? (v as AnyObj) : {};
}

function unwrapApiData(res: any): any {
  const root = asObj(res?.data);
  return root?.data ?? root?.result ?? root;
}

function toOptString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export type DriverInquiryItem = {
  title?: string;
  status?: string;
  answer?: string;
  createdAt?: string;
};

export async function listDriverInquiriesMe(): Promise<DriverInquiryItem[]> {
  const res = await apiClient.get("/api/driver/inquiries/me");
  const source = unwrapApiData(res);

  const arr = Array.isArray(source) ? source : Array.isArray(source?.items) ? source.items : [];

  return (arr as any[]).map((it) => ({
    title: toOptString(it?.title),
    status: toOptString(it?.status),
    answer: toOptString(it?.answer),
    createdAt: toOptString(it?.createdAt),
  }));
}
