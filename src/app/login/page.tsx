/**
 * Login page - Google OAuth authentication
 */

"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
      const redirectTo = searchParams.get("redirectTo") || "/past-papers/library";
      router.push(redirectTo);
    }
  }, [session, searchParams, router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const redirectTo = searchParams.get("redirectTo") || "/past-papers/library";
      // Use absolute URL for redirectTo - Supabase will redirect here after OAuth
      // The redirect URL must be whitelisted in Supabase dashboard
      const redirectUrl = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            redirectTo: redirectTo,
          },
        },
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      }
      // Note: signInWithOAuth redirects the page automatically, so we don't need to handle success here
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  // Show nothing while checking session (prevents flash)
  if (session?.user) {
    return null;
  }

  return (
    <Container size="lg">
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12">
        <div className="w-full max-w-md space-y-8">
          <PageHeader
            title="Sign In"
            description="Sign in with Google to save your paper sessions and track your progress."
          />

          <Card variant="default" className="p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-organic-md bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full uppercase tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in with Google"
                )}
              </Button>

              <p className="text-xs text-white/40 text-center">
                By signing in, you agree to save your progress and session data.
              </p>
            </div>
          </Card>

          <div className="text-center">
            <p className="text-sm text-white/50">
              You can browse papers without signing in, but you&apos;ll need to sign in to save your sessions.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}

