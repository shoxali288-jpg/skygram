export interface User {
  id: string;
  username: string;
  password_hash: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_verified: boolean;
  is_blocked: boolean;
  created_at: string;
  last_seen: string;
  phone: string | null;
  bio: string | null;
  birth_date: string | null;
  show_phone: boolean;
  show_bio: boolean;
  show_birth_date: boolean;
}

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  pinned_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  voice_url: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  is_read: boolean;
  reply_to_message_id: string | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  created_at: string;
}

export interface ChatWithUser {
  id: string;
  chat_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    last_seen: string;
  };
  last_message: {
    text: string;
    created_at: string;
    sender_id: string;
    is_read: boolean;
    is_deleted: boolean;
  } | null;
  pinned: boolean;
  unread_count: number;
}

export interface TypingUser {
  chat_id: string;
  username: string;
}

export interface SessionData {
  userId: string;
  username: string;
  role: 'user' | 'admin';
}
