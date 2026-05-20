import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { verifySession } from '@/lib/auth';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'skygram-default-secret-change-in-production'
);

const COOKIE_NAME = 'skygram_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Разрешаем доступ к публичным путям без проверки
  const publicPaths = ['/login', '/register', '/api/', '/_next/static', '/_next/image', '/favicon.ico', '/icons', '/manifest.json', '/sw.js', '/sounds'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  
  // Если нет токена, перенаправляем на login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Проверяем сессию и блокировку пользователя
    const session = await verifySession();
    
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Если пользователь заблокирован, перенаправляем на страницу блокировки
    if (session.is_blocked) {
      const blockedUrl = new URL('/blocked', request.url);
      return NextResponse.redirect(blockedUrl);
    }
    
    return NextResponse.next();
  } catch (error) {
    // При любой ошибке верификации перенаправляем на login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|sounds).*)'],
};
