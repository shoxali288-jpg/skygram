import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { chatId } = await params;
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search')?.toLowerCase();

    const { data: chat } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });

    if (chat.user1_id !== session.userId && chat.user2_id !== session.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (searchQuery) {
      query = query.ilike('text', `%${searchQuery}%`);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { chatId } = await params;
    const { text, reply_to_message_id, voice_url } = await request.json();

    if (!voice_url) {
      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 });
      }
      if (text.length > 4096) {
        return NextResponse.json({ error: 'Сообщение слишком длинное' }, { status: 400 });
      }
      const trimmed = text.trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 });
      }
    }

    const { data: chat } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });

    const otherUserId = chat.user1_id === session.userId ? chat.user2_id : chat.user1_id;

    const { data: otherUser } = await supabase
      .from('users')
      .select('is_blocked')
      .eq('id', otherUserId)
      .single();

    if (otherUser?.is_blocked) {
      return NextResponse.json({ error: 'Пользователь заблокирован' }, { status: 403 });
    }

    const messageData: Record<string, unknown> = {
      chat_id: chatId,
      sender_id: session.userId,
      text: voice_url ? text : text.trim(),
      is_read: false,
    };
    if (voice_url) {
      messageData.voice_url = voice_url;
    }
    if (reply_to_message_id) {
      messageData.reply_to_message_id = reply_to_message_id;
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      return NextResponse.json({ error: 'Ошибка отправки' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { chatId } = await params;
    const { message_id, text, action } = await request.json();

    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', message_id)
      .eq('chat_id', chatId)
      .single();

    if (!message) return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });

    if (message.sender_id !== session.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (action === 'delete') {
      await supabase.from('messages').update({ is_deleted: true }).eq('id', message_id);
      return NextResponse.json({ success: true });
    }

    if (action === 'edit' && text) {
      if (text.length > 4096) return NextResponse.json({ error: 'Слишком длинное' }, { status: 400 });
      await supabase
        .from('messages')
        .update({ text: text.trim(), edited_at: new Date().toISOString() })
        .eq('id', message_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
