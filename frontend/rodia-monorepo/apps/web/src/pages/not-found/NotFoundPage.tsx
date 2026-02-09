import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/shadcn/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">페이지를 찾을 수 없음</h1>
        <p className="text-sm opacity-70">URL이 잘못됐거나, 이동된 페이지일 수 있음.</p>
        <Button asChild>
          <Link to="/dashboard">대시보드로 가기</Link>
        </Button>
      </div>
    </div>
  );
}
