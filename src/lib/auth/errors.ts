function messageOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string") return value;
  }
  if (error instanceof Error) return error.message;
  return "";
}

export function mapAuthError(error: unknown, fallback: string): string {
  const raw = messageOf(error).toLowerCase();
  if (!raw) return fallback;

  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (raw.includes("email not confirmed")) {
    return "Confirm your email first. Check your inbox for a link from us.";
  }
  if (raw.includes("user already registered") || raw.includes("already registered")) {
    return "An account with this email already exists. Sign in, or reset your password.";
  }
  if (
    raw.includes("rate limit") ||
    raw.includes("over_email_send_rate_limit") ||
    raw.includes("too many requests")
  ) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (raw.includes("weak password") || raw.includes("pwned") || raw.includes("leaked")) {
    return "Choose a stronger password. Avoid common or leaked passwords.";
  }
  if (raw.includes("same password") || raw.includes("should be different")) {
    return "New password must be different from your current password.";
  }
  if (raw.includes("expired") || raw.includes("otp_expired")) {
    return "This link has expired. Request a new one.";
  }
  if (raw.includes("access denied") || raw.includes("invalid token")) {
    return "This link is invalid or has already been used. Request a new one.";
  }

  return messageOf(error) || fallback;
}
