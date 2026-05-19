import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase().trim();

    if (!query || query.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, role, is_verified, is_blocked, last_seen')
      .ilike('username', `%${query}%`)
      .neq('id', session.userId)
      .limit(10);

    if (error) {
      return NextResponse.json({ error: 'Ошибка поиска' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
