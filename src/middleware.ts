import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient as createServerClientSSR } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { buildOnboardingUrl, sanitizeRedirectTo } from '@/lib/onboarding/redirect';

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname.startsWith('/dev') ||
    request.nextUrl.pathname.startsWith('/static')
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
      const onProfile = path.startsWith('/profile');

      // Username still required; allow onboarding + profile while setting it up.
      if (!profile?.username && !onProfile && !onOnboarding) {
        return NextResponse.redirect(new URL('/profile', request.url));
      }

      // Personalisation questionnaire for new accounts.
      if (
        profile?.username &&
        profile.onboarding_completed === false &&
        !onOnboarding
      ) {
        const intended = sanitizeRedirectTo(
          `${path}${request.nextUrl.search}`,
        );
        return NextResponse.redirect(
          new URL(buildOnboardingUrl(intended), request.url),
        );
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
