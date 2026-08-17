export const MIN_PASSWORD_LENGTH = 8;

export type PasswordValidation = {
  ok: boolean;
  error: string | null;
};

export function validatePassword(password: string): PasswordValidation {
  if (!password) {
    return { ok: false, error: "Enter a password." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (/\s/.test(password)) {
    return { ok: false, error: "Password cannot contain spaces." };
  }
  return { ok: true, error: null };
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): PasswordValidation {
  const base = validatePassword(password);
  if (!base.ok) return base;
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }
  return { ok: true, error: null };
}
