import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { userId, action } = await request.json();
    if (!userId || !['verify', 'unverify'].includes(action)) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const isVerified = action === 'verify';

    await supabase.from('users').update({ is_verified: isVerified }).eq('id', userId);

    return NextResponse.json({
      success: true,
      message: isVerified
        ? `Галочка выдана пользователю ${targetUser.username}`
        : `Галочка убрана у пользователя ${targetUser.username}`,
    });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
