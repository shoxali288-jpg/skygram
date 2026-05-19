import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { username } = await params;
    const usernameLower = username.toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, role, is_verified, last_seen, phone, bio, birth_date, show_phone, show_bio, show_birth_date')
      .eq('username', usernameLower)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const isOwner = session.userId === user.id;
    const result: Record<string, unknown> = {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      role: user.role,
      is_verified: user.is_verified,
      last_seen: user.last_seen,
    };

    if (isOwner || user.show_phone) result.phone = user.phone;
    if (isOwner || user.show_bio) result.bio = user.bio;
    if (isOwner || user.show_birth_date) result.birth_date = user.birth_date;

    return NextResponse.json({ user: result });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
