import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient as createServerClientSSR } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { buildOnboardingUrl, sanitizeRedirectTo } from '@/lib/onboarding/redirect';
import {
  PASSWORD_RECOVERY_COOKIE,
  isRecoveryAllowedPath,
} from '@/lib/auth/recovery';
import { RESET_PASSWORD_PATH } from '@/lib/auth/urls';

function applyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const recovering = request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value === '1';
  if (recovering && !isRecoveryAllowedPath(path)) {
    return NextResponse.redirect(new URL(RESET_PASSWORD_PATH, request.url));
  }

  const skipSetupLock =
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/auth') ||
    path.startsWith('/login') ||
    path === '/signup' ||
    path.startsWith('/dev') ||
    path.startsWith('/static');

  let response = NextResponse.next({ request });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    const supabase = createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Always refresh the session so login <-> app navigations keep cookies in sync.
    const { data: { user } } = await supabase.auth.getUser();

    if (skipSetupLock || !user) {
      return response;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle() as {
        data: { username: string | null; onboarding_completed: boolean | null } | null;
      };

    const onOnboarding = path.startsWith('/onboarding');
    const onAccess = path.startsWith('/access');
    const isOnboardingPreview =
      onOnboarding && request.nextUrl.searchParams.get('preview') === '1';

    // Lock the app until username + questionnaire are done (single /onboarding flow).
    // /access landing stays open so Claim access / exhausted UI can show first;
    // redeem runs after onboarding via /access/complete.
    const needsSetup =
      !profile?.username || profile.onboarding_completed !== true;
    if (needsSetup && !onOnboarding && !onAccess) {
      const intended = sanitizeRedirectTo(
        `${path}${request.nextUrl.search}`,
      );
      return applyResponseCookies(
        response,
        NextResponse.redirect(new URL(buildOnboardingUrl(intended), request.url)),
      );
    }

    if (!needsSetup && onOnboarding && !isOnboardingPreview) {
      const nextPath = sanitizeRedirectTo(
        request.nextUrl.searchParams.get('redirectTo'),
      );
      return applyResponseCookies(
        response,
        NextResponse.redirect(new URL(nextPath, request.url)),
      );
    }

    return response;
  } catch (error) {
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
