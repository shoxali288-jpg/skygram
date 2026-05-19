import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { id } = await params;

    const { data: chat } = await supabase.from('chats').select('*').eq('id', id).single();
    if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });

    if (chat.user1_id !== session.userId && chat.user2_id !== session.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const otherUserId = chat.user1_id === session.userId ? chat.user2_id : chat.user1_id;

    const { data: otherUser } = await supabase
      .from('users')
      .select('id, username, avatar_url, is_verified, last_seen')
      .eq('id', otherUserId)
      .single();

    return NextResponse.json({ chat, otherUser });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { id } = await params;

    const { data: chat } = await supabase.from('chats').select('*').eq('id', id).single();
    if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });

    if (chat.user1_id !== session.userId && chat.user2_id !== session.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    await supabase.from('messages').delete().eq('chat_id', id);
    await supabase.from('chats').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { id } = await params;
    const { action } = await request.json();

    const { data: chat } = await supabase.from('chats').select('*').eq('id', id).single();
    if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });

    if (chat.user1_id !== session.userId && chat.user2_id !== session.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (action === 'pin') {
      const pinned = chat.pinned_by ? chat.pinned_by.split(',').filter(Boolean) : [];
      if (pinned.includes(session.userId)) {
        const updated = pinned.filter((p: string) => p !== session.userId).join(',');
        await supabase.from('chats').update({ pinned_by: updated || null }).eq('id', id);
      } else {
        pinned.push(session.userId);
        await supabase.from('chats').update({ pinned_by: pinned.join(',') }).eq('id', id);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
