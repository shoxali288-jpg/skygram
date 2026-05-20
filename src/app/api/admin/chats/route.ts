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
      .from('chats')
      .select(`
        *,
        user1:user1_id (id, username, avatar_url, is_verified),
        user2:user2_id (id, username, avatar_url, is_verified)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: chats, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
    }

    if (!chats) {
      return NextResponse.json({ chats: [] });
    }

    // Get last message for each chat
    const chatsWithLastMessage = await Promise.all(
      (chats as any[]).map(async (chat) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('text, created_at, sender_id, is_deleted, is_read')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const user1 = chat.user1 as any;
        const user2 = chat.user2 as any;

        return {
          ...chat,
          user1: user1 ? { id: user1.id, username: user1.username, avatar_url: user1.avatar_url, is_verified: user1.is_verified } : null,
          user2: user2 ? { id: user2.id, username: user2.username, avatar_url: user2.avatar_url, is_verified: user2.is_verified } : null,
          last_message: lastMsg || null,
        };
      })
    );

    let result = chatsWithLastMessage;

    if (search) {
      result = result.filter((chat: any) => {
        const u1 = chat.user1?.username?.toLowerCase() || '';
        const u2 = chat.user2?.username?.toLowerCase() || '';
        return u1.includes(search) || u2.includes(search);
      });
    }

    return NextResponse.json({ chats: result });
  } catch (error) {
    console.error('Admin chats error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
