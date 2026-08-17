"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseClient } from "@/components/auth/SupabaseSessionProvider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { mapAuthError } from "@/lib/auth/errors";
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordConfirmation,
} from "@/lib/auth/password";
import {
  getEmailConfirmCallbackUrl,
} from "@/lib/auth/urls";

type AuthMode = "signin" | "signup";

export function EmailPasswordForm({
  mode,
  redirectTo,
  disabled,
  onError,
  onCheckEmail,
}: {
  mode: AuthMode;
  redirectTo: string;
  disabled?: boolean;
  onError: (message: string | null) => void;
  onCheckEmail: (email: string) => void;
}) {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const busy = disabled || submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    onError(null);

    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      onError("Enter a valid email address.");
      return;
    }

    if (mode === "signup") {
      const confirmation = validatePasswordConfirmation(
        password,
        confirmPassword,
      );
      if (!confirmation.ok) {
        onError(confirmation.error);
        return;
      }
    } else if (!password) {
      onError("Enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        try {
          sessionStorage.setItem("ga_pending_signup", "1");
        } catch {
          /* ignore */
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalized,
          password,
          options: {
            emailRedirectTo: getEmailConfirmCallbackUrl(redirectTo),
          },
        });

        if (error) {
          onError(mapAuthError(error, "Could not create your account."));
          return;
        }

        const identities = data.user?.identities ?? [];
        if (!data.session) {
          onCheckEmail(normalized);
          return;
        }
        if (data.user && identities.length === 0) {
          onCheckEmail(normalized);
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (error) {
        onError(mapAuthError(error, "Could not sign in."));
      }
    } catch (err) {
      onError(mapAuthError(err, "Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="auth-email" className="block text-sm font-medium text-text">
          Email
        </label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={busy}
          required
        />
      </div>

      <PasswordInput
        id="auth-password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder={
          mode === "signup"
            ? `At least ${MIN_PASSWORD_LENGTH} characters`
            : "Your password"
        }
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        disabled={busy}
      />

      {mode === "signup" ? (
        <PasswordInput
          id="auth-confirm-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          disabled={busy}
        />
      ) : (
        <div className="flex justify-end">
          <Link
            href="/login/forgot"
            className="text-sm font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="h-11 w-full"
        disabled={busy}
      >
        {submitting
          ? mode === "signup"
            ? "Creating account…"
            : "Signing in…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>
    </form>
  );
}
