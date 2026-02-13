// src/shared/lib/auth/session.ts

type Session = {
  accessToken: string;
  refreshToken?: string;
};

const KEY = "rodia.session";

/**
 * 세션 저장
 */
export function setSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

/**
 * 세션 조회
 */
export function getSession(): Session | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/**
 * 세션 삭제 (로그아웃)
 */
export function clearSession() {
  localStorage.removeItem(KEY);
}
