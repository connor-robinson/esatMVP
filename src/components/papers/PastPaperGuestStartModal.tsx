/**
 * Soft gate before starting a past-paper / ESAT CAMP mock as a guest.
 * Sign in to save progress, or continue without an account (score still shown at the end).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSupabaseClient } from "@/components/auth/SupabaseSessionProvider";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinueWithoutAccount: () => void;
};

export function PastPaperGuestStartModal({
  open,
  onClose,
  onContinueWithoutAccount,
}: Props) {
  const supabase = useSupabaseClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!open) return null;

  const returnPath = (() => {
    const qs = searchParams?.toString();
    const base = pathname || "/past-papers";
    return qs ? `${base}?${qs}` : base;
  })();

  const loginHref = `/login?redirectTo=${encodeURIComponent(returnPath)}`;

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await signInWithGoogle(supabase, returnPath);
      if (error) throw error;
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="past-papers-theme fixed inset-0 z-[110] flex items-center justify-center p-4 font-sans sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-start-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-[111] w-full max-w-md overflow-hidden rounded-sm bg-surface-elevated p-5 shadow-modal-card sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="guest-start-title"
              className="text-lg font-semibold text-text"
            >
              Save your progress?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Sign in or sign up to save this sitting and sync it across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onContinueWithoutAccount}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90"
            >
              Continue without an account
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
            <p className="text-center text-xs leading-relaxed text-text-muted">
              You will still be able to see your score at the end. Sign in later
              if you want to save the sitting.
            </p>
          </div>

          <div className="space-y-3 rounded-sm bg-surface-mid/60 p-3">
            <GoogleAuthButton
              mode="signin"
              label="Sign in or Sign up with Google"
              loading={googleLoading}
              onClick={() => void handleGoogle()}
              className="h-12 w-full"
            />
            <Link
              href={loginHref}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center rounded-sm bg-surface-neutral px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-elevated",
              )}
            >
              Sign in with email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
