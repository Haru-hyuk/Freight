import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";

type LocationState = {
  from?: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [email, setEmail] = React.useState("admin@rodia.com");
  const [password, setPassword] = React.useState("password");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // UI-only: 실제 API 연동 전까지 목업 인증 처리
    if (!email.trim() || !password.trim()) {
      setError("이메일/비밀번호를 입력해줘.");
      return;
    }

    localStorage.setItem("rodia_admin_token", "mock-token");
    localStorage.setItem("rodia_admin_role", "super");

    navigate(state.from ?? "/dashboard", { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-sm font-semibold">R</span>
        </div>
        <h1 className="text-xl font-semibold">Rodia Admin</h1>
        <p className="text-sm opacity-70">관리자 계정으로 로그인해줘.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
            placeholder="admin@rodia.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
            placeholder="비밀번호"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">{error}</div>
        ) : null}

        <Button type="submit" className="w-full">
          대시보드 접속
        </Button>
      </form>
    </div>
  );
}
