import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { SessionData } from './types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'skygram-default-secret-change-in-production'
);

const COOKIE_NAME = 'skygram_session';

export async function createSession(data: SessionData): Promise<string> {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);
  return token;
}

export async function verifySession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export function getSessionCookieOptions(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    maxAge: number;
    path: string;
  };
} {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    },
  };
}

export function createSessionCookie(token: string) {
  const opts = getSessionCookieOptions();
  return {
    name: opts.name,
    value: token,
    options: opts.options,
  };
}

export function clearSessionCookie() {
  const opts = getSessionCookieOptions();
  return {
    name: opts.name,
    value: '',
    options: { ...opts.options, maxAge: 0 },
  };
}
