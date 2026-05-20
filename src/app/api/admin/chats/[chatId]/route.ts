import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { chatId } = await params;

    const { data: chat } = await supabase
      .from('chats')
      .select(`
        *,
        user1:user1_id (id, username, avatar_url, is_verified),
        user2:user2_id (id, username, avatar_url, is_verified)
      `)
      .eq('id', chatId)
      .single();

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '200');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (id, username, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Ошибка загрузки сообщений' }, { status: 500 });
    }

    const chatData = chat as any;

    return NextResponse.json({
      chat: {
        id: chatData.id,
        user1: chatData.user1,
        user2: chatData.user2,
        created_at: chatData.created_at,
      },
      messages: messages || [],
    });
  } catch (error) {
    console.error('Admin chat messages error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
