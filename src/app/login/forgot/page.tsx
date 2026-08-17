"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@/components/auth/SupabaseSessionProvider";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { mapAuthError } from "@/lib/auth/errors";
import { getPasswordResetCallbackUrl } from "@/lib/auth/urls";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalized,
        { redirectTo: getPasswordResetCallbackUrl() },
      );

      if (resetError) {
        setError(mapAuthError(resetError, "Could not send a reset email."));
        return;
      }

      setSent(true);
    } catch (err) {
      setError(mapAuthError(err, "Could not send a reset email."));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthPageShell
        title="Check your email"
        subtitle="If an account exists for that address, we sent a link to reset your password. It expires in about an hour."
        footer="Didn't get it? Check spam, then try again from this page."
      >
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-text underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Reset your password"
      subtitle="Enter the email on your account and we’ll send a reset link. For Google-only accounts, this also lets you add a password."
    >
      {error ? (
        <div
          role="alert"
          className="rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reset-email" className="block text-sm font-medium text-text">
            Email
          </label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
            required
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          className="h-11 w-full"
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        <Link
          href="/login"
          className="font-medium text-text underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
