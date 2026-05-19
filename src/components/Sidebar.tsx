'use client';

import { forwardRef } from 'react';
import { FiSearch, FiSettings, FiLogOut, FiShield, FiUser, FiMessageSquare, FiStar } from 'react-icons/fi';
import { FaTelegramPlane } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';

interface SidebarProps {
  user: any;
  chats: any[];
  searchQuery: string;
  searchResults: any[];
  onSearch: (q: string) => void;
  onStartChat: (username: string) => void;
  onLogout: () => void;
  activeChatId: string;
  hidden: boolean;
  onNavigate: (url: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({
  user, chats, searchQuery, searchResults, onSearch, onStartChat,
  onLogout, activeChatId, hidden, onNavigate, activeTab, setActiveTab
}, ref) => {
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'сейчас';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}м`;
    if (diff < 86400000) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getAvatarLetter = (username: string) => username.charAt(0).toUpperCase();

  return (
    <div ref={ref} className={`sidebar ${hidden ? 'hidden' : ''}`}>
      <div className="sidebar-header">
        <h1>
          <FaTelegramPlane style={{ marginRight: '0.35rem', verticalAlign: 'middle', color: 'var(--primary)' }} />
          Skygram
        </h1>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {user.role === 'admin' && (
            <button className="sidebar-nav-btn"
              onClick={() => onNavigate('/app/admin')}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '1.2rem', padding: '0.3rem'
              }}
              title="Админ-панель"
            >
              <FiShield />
            </button>
          )}
          <button className="sidebar-nav-btn mobile-hide-btn"
            onClick={() => onNavigate('/app/settings')}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', padding: '0.3rem'
            }}
            title="Настройки"
          >
            <FiSettings />
          </button>
          <button className="sidebar-nav-btn mobile-hide-btn"
            onClick={onLogout}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', padding: '0.3rem'
            }}
            title="Выйти"
          >
            <FiLogOut />
          </button>
        </div>
      </div>

      <div className="sidebar-search" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--background)', borderRadius: '10px', padding: '0 0.75rem' }}>
          <FiSearch style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Поиск по нику..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', padding: '0.65rem 0', outline: 'none', width: '100%', color: 'var(--foreground)' }}
          />
        </div>
        {searchQuery && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((u: any) => (
              <div key={u.id} className="search-result-item" onClick={() => {
                onNavigate(`/app/profile/${u.username}`);
              }}>
                <div className="chat-avatar" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" /> : getAvatarLetter(u.username)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="chat-name">
                    @{u.username}
                    {u.is_verified && <BsCheckCircleFill className="verified-badge" />}
                  </div>
                </div>
                <button
                  className="sky-btn sky-btn-sm"
                  onClick={(e) => { e.stopPropagation(); onStartChat(u.username); }}
                  style={{ width: 'auto' }}
                >
                  Написать
                </button>
              </div>
            ))}
          </div>
        )}
        {searchQuery && searchResults.length === 0 && (
          <div className="search-results" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Пользователь не найден
          </div>
        )}
      </div>

      <div className="chat-list">
        {chats.length === 0 && !searchQuery && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
            <FiSearch style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
              Найди друга по нику
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Используйте поиск выше, чтобы найти пользователя и начать общение
            </p>
          </div>
        )}
        {chats.map((chat: any) => (
          <div
            key={chat.chat_id}
            className={`chat-item ${chat.chat_id === activeChatId ? 'active' : ''} ${chat.pinned ? 'pinned' : ''}`}
            onClick={() => onNavigate(`/app/chat/${chat.chat_id}`)}
          >
            <div className="chat-avatar">
              {chat.user.avatar_url ? (
                <img src={chat.user.avatar_url} alt="" />
              ) : (
                getAvatarLetter(chat.user.username)
              )}
              <div className="online-dot" style={{
                background: Date.now() - new Date(chat.user.last_seen || 0).getTime() < 120000 ? '#22c55e' : '#9ca3af'
              }} />
            </div>
            <div className="chat-info">
              <div className="chat-name">
                @{chat.user.username}
                {chat.user.is_verified && <BsCheckCircleFill className="verified-badge" />}
              </div>
              <div className="chat-last-msg">
                {chat.last_message
                  ? (chat.last_message.is_deleted
                    ? 'Сообщение удалено'
                    : (chat.last_message.sender_id === user.id ? 'Вы: ' : '') + chat.last_message.text)
                  : 'Нет сообщений'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              {chat.last_message && (
                <span className="chat-time">{formatTime(chat.last_message.created_at)}</span>
              )}
              {chat.pinned && <FiStar style={{ color: 'var(--primary)', fontSize: '0.7rem' }} />}
              {chat.unread_count > 0 && (
                <span className="chat-unread">{chat.unread_count}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
