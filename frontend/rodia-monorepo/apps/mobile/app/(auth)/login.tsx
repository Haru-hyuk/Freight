// apps/mobile/app/(auth)/login.tsx
import React from "react";
import LoginPage from "@/pages/auth/login/LoginPage";

export default function LoginRoute() {
  return <LoginPage />;
}

/**
 * 1) app 라우트는 “얇게”: src/pages의 화면 구현을 import해서 그대로 렌더합니다.
 * 2) 테스트/리팩토링 시 라우트 파일은 건드릴 일이 거의 없도록 유지합니다.
 * 3) FSD 구조(src)와 Expo Router(app)를 분리해 유지보수성을 높입니다.
 */