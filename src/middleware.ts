import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'skygram-default-secret-change-in-production'
);

const COOKIE_NAME = 'skygram_session';

// Create Supabase admin client for middleware (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oxpmqvxhscvmmwevznhy.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const publicPaths = ['/login', '/register', '/blocked', '/_next/static', '/_next/image', '/favicon.ico', '/icons', '/manifest.json', '/sw.js', '/sounds'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isApiPath = pathname.startsWith('/api/');
  
  // API пути обрабатываются самими endpoint'ами
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
    const session = payload as any;
    const userId = session.userId;

    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check user status in database
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_blocked, is_deleted')
        .eq('id', userId)
        .single();

      if (user?.is_deleted) {
        const response = NextResponse.redirect(new URL('/blocked?reason=deleted', request.url));
        response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
        return response;
      }

      if (user?.is_blocked) {
        const blockedUrl = new URL('/blocked?reason=blocked', request.url);
        return NextResponse.redirect(blockedUrl);
      }
    }
    
    return NextResponse.next();
  } catch (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|sounds).*)'],
};
