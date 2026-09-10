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
import {
  HOMEPAGE_HERO_AB_COOKIE,
  HOMEPAGE_HERO_AB_HEADER,
  homepageHeroAbCookieOptions,
  parseHomepageHeroVariant,
  resolveHomepageHeroVariant,
} from '@/lib/homepage/heroAbTest';

function applyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function resolveHomepageHeroForRequest(request: NextRequest) {
  return resolveHomepageHeroVariant({
    cookieValue: request.cookies.get(HOMEPAGE_HERO_AB_COOKIE)?.value,
    queryValue: request.nextUrl.searchParams.get('hero'),
  });
}

function withHomepageHeroAb(
  request: NextRequest,
  response: NextResponse,
  resolution: ReturnType<typeof resolveHomepageHeroVariant>,
) {
  if (request.nextUrl.pathname !== '/') return response;

  const queryVariant = parseHomepageHeroVariant(
    request.nextUrl.searchParams.get('hero'),
  );
  if (queryVariant || resolution.assigned) {
    response.cookies.set(
      HOMEPAGE_HERO_AB_COOKIE,
      resolution.variant,
      homepageHeroAbCookieOptions(),
    );
  }

  return response;
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

  const heroResolution =
    path === '/'
      ? resolveHomepageHeroForRequest(request)
      : null;

  const requestHeaders = new Headers(request.headers);
  if (heroResolution) {
    requestHeaders.set(HOMEPAGE_HERO_AB_HEADER, heroResolution.variant);
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return heroResolution
        ? withHomepageHeroAb(request, response, heroResolution)
        : response;
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
          const previous = response;
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          applyResponseCookies(previous, response);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Always refresh the session so login <-> app navigations keep cookies in sync.
    const { data: { user } } = await supabase.auth.getUser();

    if (skipSetupLock || !user) {
      return heroResolution
        ? withHomepageHeroAb(request, response, heroResolution)
        : response;
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
      const redirected = applyResponseCookies(
        response,
        NextResponse.redirect(new URL(buildOnboardingUrl(intended), request.url)),
      );
      return heroResolution
        ? withHomepageHeroAb(request, redirected, heroResolution)
        : redirected;
    }

    if (!needsSetup && onOnboarding && !isOnboardingPreview) {
      const nextPath = sanitizeRedirectTo(
        request.nextUrl.searchParams.get('redirectTo'),
      );
      const redirected = applyResponseCookies(
        response,
        NextResponse.redirect(new URL(nextPath, request.url)),
      );
      return heroResolution
        ? withHomepageHeroAb(request, redirected, heroResolution)
        : redirected;
    }

    return heroResolution
      ? withHomepageHeroAb(request, response, heroResolution)
      : response;
  } catch (error) {
    return heroResolution
      ? withHomepageHeroAb(request, response, heroResolution)
      : response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
