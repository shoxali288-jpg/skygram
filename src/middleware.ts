import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'skygram-default-secret-change-in-production'
);

const COOKIE_NAME = 'skygram_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const protectedPaths = ['/app', '/chat', '/profile', '/settings', '/admin', '/search'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  let isValid = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      isValid = true;
    } catch {
      isValid = false;
    }
  }

  if (isProtected && !isValid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isValid) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|sounds).*)'],
};
