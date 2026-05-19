import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { data: reports, error } = await supabase
      .from('reports')
      .select('*, reporter:users!reporter_id(username), reported:users!reported_user_id(username)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
    return NextResponse.json({ reports: reports || [] });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
