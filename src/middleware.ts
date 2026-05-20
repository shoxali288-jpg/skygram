import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'skygram-default-secret-change-in-production'
);

const COOKIE_NAME = 'skygram_session';

async function checkUserStatus(userId: string): Promise<{ is_blocked: boolean; is_deleted: boolean } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oxpmqvxhscvmmwevznhy.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_pUbRgp79YLYVUAgJe7VPYg_rDsKsAyg';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=is_blocked,is_deleted`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ['/login', '/register', '/blocked', '/_next/static', '/_next/image', '/favicon.ico', '/icons', '/manifest.json', '/sw.js', '/sounds'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isApiPath = pathname.startsWith('/api/');

  if (isPublicPath || isApiPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const userId = (payload as any).userId;

    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userStatus = await checkUserStatus(userId);

    if (userStatus?.is_deleted) {
      const response = NextResponse.redirect(new URL('/blocked?reason=deleted', request.url));
      response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }

    if (userStatus?.is_blocked) {
      return NextResponse.redirect(new URL('/blocked?reason=blocked', request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|sounds).*)'],
};
