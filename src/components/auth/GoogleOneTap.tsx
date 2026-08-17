"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import {
  useSupabaseClient,
  useSupabaseSession,
} from "@/components/auth/SupabaseSessionProvider";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type CredentialResponse = {
  credential: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce?: string;
    use_fedcm_for_prompt?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: "signin" | "signup" | "use";
    auto_select?: boolean;
  }) => void;
  prompt: (notification?: (n: {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
    getNotDisplayedReason: () => string;
    getSkippedReason: () => string;
    getDismissedReason: () => string;
  }) => void) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

async function generateNonce(): Promise<[string, string]> {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  );
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(nonce),
  );
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [nonce, hashedNonce];
}

/**
 * Google One Tap ("Sign in as X") for signed-out visitors only.
 * No-ops when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset.
 */
export function GoogleOneTap() {
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();
  const initializingRef = useRef(false);
  const nonceRef = useRef<string | null>(null);

  const handleCredential = useCallback(
    async (response: CredentialResponse) => {
      const nonce = nonceRef.current;
      if (!response.credential || !nonce) return;

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce,
      });

      if (error) {
        console.error("[GoogleOneTap]", error.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        // Do not keep Google name / picture on the app profile
        await supabase
          .from("profiles")
          .update({ full_name: null, avatar_url: null } as never)
          .eq("id", user.id);
      }

      router.refresh();
    },
    [router, supabase.auth],
  );

  const startOneTap = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    if (session?.user || initializingRef.current) return;
    if (
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/auth") ||
      pathname === "/signup"
    ) {
      return;
    }

    initializingRef.current = true;
    try {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (current?.user) return;

      const [nonce, hashedNonce] = await generateNonce();
      nonceRef.current = nonce;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        cancel_on_tap_outside: false,
        context: "signin",
        auto_select: false,
      });

      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("[GoogleOneTap] init failed", err);
    } finally {
      initializingRef.current = false;
    }
  }, [handleCredential, pathname, session?.user, supabase.auth]);

  useEffect(() => {
    if (session?.user) {
      window.google?.accounts?.id?.cancel();
      return;
    }
    if (
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/auth") ||
      pathname === "/signup"
    ) {
      window.google?.accounts?.id?.cancel();
      return;
    }
    if (window.google?.accounts?.id) {
      void startOneTap();
    }
  }, [pathname, session?.user, startOneTap]);

  if (!GOOGLE_CLIENT_ID || session?.user) {
    return null;
  }
  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/auth") ||
    pathname === "/signup"
  ) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onReady={() => {
        void startOneTap();
      }}
    />
  );
}
