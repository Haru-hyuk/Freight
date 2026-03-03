import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { setSession } from "@/shared/lib/auth/session";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";

type LocationState = {
  from?: string;
};

type AuthTokenResponse = {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [email, setEmail] = React.useState("admin@test.com");
  const [password, setPassword] = React.useState("123456");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (isMockModeEnabled()) {
        const mockToken = "mock-token";
        setSession({ accessToken: mockToken });
        localStorage.setItem("rodia_admin_token", mockToken);
        localStorage.setItem("rodia_admin_role", "super");
        navigate(state.from ?? "/dashboard", { replace: true });
        return;
      }

      const response = await apiClient.post<AuthTokenResponse>(apiPaths.authAdminLogin, {
        email: email.trim(),
        password,
      });
      const accessToken = response.data.accessToken;

      if (!accessToken) {
        throw new Error("ACCESS_TOKEN_MISSING");
      }

      setSession({ accessToken });
      localStorage.setItem("rodia_admin_token", accessToken);
      localStorage.setItem("rodia_admin_role", "admin");

      navigate(state.from ?? "/dashboard", { replace: true });
    } catch {
      setError("Login failed. Check your credentials and API server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-primary text-primary-foreground shadow-sm">
          <span className="text-sm font-semibold">R</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Rodia Admin</h1>
        <p className="text-base text-foreground/70">Sign in to monitor and manage logistics operations.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base">
            Email
          </Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@test.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-base">
            Password
          </Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
        </div>

        {error ? <div className="rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm text-foreground">{error}</div> : null}

        <Button type="submit" className="w-full text-base" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
