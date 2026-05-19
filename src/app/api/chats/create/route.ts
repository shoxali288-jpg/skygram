import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Укажите пользователя' }, { status: 400 });
    }

    const usernameLower = username.toLowerCase().trim();

    if (usernameLower === session.username) {
      return NextResponse.json({ error: 'Нельзя создать чат с собой' }, { status: 400 });
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, is_blocked')
      .eq('username', usernameLower)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (targetUser.is_blocked) {
      return NextResponse.json({ error: 'Пользователь заблокирован' }, { status: 403 });
    }

    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${session.userId},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${session.userId})`)
      .maybeSingle();

    if (existingChat) {
      return NextResponse.json({ chat_id: existingChat.id, exists: true });
    }

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        user1_id: session.userId,
        user2_id: targetUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Create chat error:', error);
      return NextResponse.json({ error: 'Ошибка создания чата' }, { status: 500 });
    }

    return NextResponse.json({ chat_id: newChat.id, exists: false });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
