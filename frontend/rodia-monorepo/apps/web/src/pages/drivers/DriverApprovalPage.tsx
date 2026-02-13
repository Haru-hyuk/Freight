import { DriverApprovalTable } from "@/features/drivers/ui/DriverApprovalTable";

export default function DriverApprovalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">기사 승인 관리</h2>
        <p className="mt-1 text-sm opacity-70">
          가입 요청 서류를 확인하고 승인 또는 보류 처리해.
        </p>
      </div>

      <DriverApprovalTable />
    </div>
  );
}
