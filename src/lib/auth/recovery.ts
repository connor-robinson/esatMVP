import { RESET_PASSWORD_PATH } from "@/lib/auth/urls";

export const PASSWORD_RECOVERY_COOKIE = "nocalc-password-recovery";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 60 * 60;

export function isPasswordRecoveryPath(pathname: string): boolean {
  return pathname === RESET_PASSWORD_PATH;
}

export function isPasswordRecoveryNext(next: string | null | undefined): boolean {
  return next === RESET_PASSWORD_PATH;
}

export function recoveryCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
    secure,
  };
}

export function isRecoveryAllowedPath(pathname: string): boolean {
  return (
    pathname === RESET_PASSWORD_PATH ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/confirm") ||
    pathname === "/login/forgot"
  );
}
