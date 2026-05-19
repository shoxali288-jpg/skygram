import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('q')?.toLowerCase();

    let query = supabase
      .from('users')
      .select('id, username, avatar_url, role, is_verified, is_blocked, created_at, last_seen')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
    return NextResponse.json({ users: users || [] });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
