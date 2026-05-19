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
    if (!userId || !['block', 'unblock', 'kick'].includes(action)) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Нельзя заблокировать администратора' }, { status: 403 });
    }

    if (action === 'kick') {
      await supabase.from('users').delete().eq('id', userId);
      return NextResponse.json({ success: true, message: `Пользователь ${targetUser.username} удален` });
    }

    const isBlocked = action === 'block';
    await supabase.from('users').update({ is_blocked: isBlocked }).eq('id', userId);

    return NextResponse.json({
      success: true,
      message: isBlocked
        ? `Пользователь ${targetUser.username} заблокирован`
        : `Пользователь ${targetUser.username} разблокирован`,
    });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
