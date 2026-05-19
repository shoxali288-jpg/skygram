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

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', usernameLower)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (user.is_blocked) {
      return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    }

    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id);

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
    console.error('Login error:', err);
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
