import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createSession, createSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }

    const usernameLower = username.toLowerCase().trim();

    if (usernameLower.length < 3 || usernameLower.length > 30) {
      return NextResponse.json({ error: 'Ник должен быть от 3 до 30 символов' }, { status: 400 });
    }

    if (!/^[a-z0-9_]+$/.test(usernameLower)) {
      return NextResponse.json({ error: 'Ник может содержать только латинские буквы, цифры и _' }, { status: 400 });
    }

    if (usernameLower === 'shoxa2011') {
      return NextResponse.json({ error: 'Этот ник зарезервирован' }, { status: 403 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть минимум 4 символа' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', usernameLower)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Этот ник уже занят' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: usernameLower,
        password_hash,
        role: 'user',
        is_verified: false,
        is_blocked: false,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !user) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 });
    }

    const sessionData = { userId: user.id, username: user.username, role: user.role as 'user' | 'admin' };
    const token = await createSession(sessionData);
    const cookie = createSessionCookie(token);

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        role: user.role,
        is_verified: user.is_verified,
      },
    });

    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
