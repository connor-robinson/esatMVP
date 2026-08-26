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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const recovering = request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value === '1';
  if (recovering && !isRecoveryAllowedPath(path)) {
    return NextResponse.redirect(new URL(RESET_PASSWORD_PATH, request.url));
  }

  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/auth') ||
    path.startsWith('/login') ||
    path === '/signup' ||
    path.startsWith('/dev') ||
    path.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next();
    }

    const supabase = createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
        },
      },
    });

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle() as {
          data: { username: string | null; onboarding_completed: boolean | null } | null;
        };

      const path = request.nextUrl.pathname;
      const onOnboarding = path.startsWith('/onboarding');
      const onAccess = path.startsWith('/access');
      const isOnboardingPreview =
        onOnboarding && request.nextUrl.searchParams.get('preview') === '1';

      // Lock the app until username + questionnaire are done (single /onboarding flow).
      // Partner redeem must finish before onboarding so claim cookies are not lost.
      const needsSetup =
        !profile?.username || profile.onboarding_completed !== true;
      if (needsSetup && !onOnboarding && !onAccess) {
        const intended = sanitizeRedirectTo(
          `${path}${request.nextUrl.search}`,
        );
        return NextResponse.redirect(
          new URL(buildOnboardingUrl(intended), request.url),
        );
      }

      if (!needsSetup && onOnboarding && !isOnboardingPreview) {
        const nextPath = sanitizeRedirectTo(
          request.nextUrl.searchParams.get('redirectTo'),
        );
        return NextResponse.redirect(new URL(nextPath, request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
