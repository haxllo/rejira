import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
const DEFAULT_LOCALE = 'en';

const PUBLIC = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/two-factor',
  '/check-email',
  '/api/auth',
  '/api/check',
  '/invite',
  '/',
];

function detectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0].trim().slice(0, 2);
    const match = SUPPORTED_LOCALES.find((l) => l === preferred);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    const locale = detectLocale(request);
    const response = NextResponse.next();
    response.headers.set('x-locale', locale);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    const cookieLocale = request.cookies.get('locale')?.value;
    if (!cookieLocale) {
      response.cookies.set('locale', locale, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
        httpOnly: false,
      });
    }

    return response;
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get('better-auth.session_token')?.value ??
    request.cookies.get('__Secure-better-auth.session_token')?.value;

  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const locale = detectLocale(request);
  const response = NextResponse.next();

  response.headers.set('x-locale', locale);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const cookieLocale = request.cookies.get('locale')?.value;
  if (!cookieLocale) {
    response.cookies.set('locale', locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
