import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, chats!inner(user1_id, user2_id), sender:users!sender_id(username)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
    return NextResponse.json({ messages: messages || [] });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { messageId } = await request.json();
    if (!messageId) return NextResponse.json({ error: 'Не указано сообщение' }, { status: 400 });

    await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
