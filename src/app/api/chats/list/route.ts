import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${session.userId},user2_id.eq.${session.userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Ошибка загрузки чатов' }, { status: 500 });
    }

    const chatList = await Promise.all(
      (chats || []).map(async (chat) => {
        const otherUserId = chat.user1_id === session.userId ? chat.user2_id : chat.user1_id;

        const { data: otherUser } = await supabase
          .from('users')
          .select('id, username, avatar_url, is_verified, last_seen')
          .eq('id', otherUserId)
          .single();

        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', session.userId);

        const pinned = chat.pinned_by?.includes(session.userId) || false;

        return {
          chat_id: chat.id,
          user: otherUser || { id: '', username: 'unknown', avatar_url: null, is_verified: false, last_seen: '' },
          last_message: lastMessage ? {
            text: lastMessage.is_deleted ? 'Сообщение удалено' : lastMessage.text,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id,
            is_read: lastMessage.is_read,
            is_deleted: lastMessage.is_deleted,
          } : null,
          pinned,
          unread_count: unreadCount || 0,
        };
      })
    );

    chatList.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const aTime = a.last_message?.created_at || '';
      const bTime = b.last_message?.created_at || '';
      return bTime.localeCompare(aTime);
    });

    return NextResponse.json({ chats: chatList });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
