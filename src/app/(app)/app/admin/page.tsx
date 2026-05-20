'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSearch, FiUsers, FiMessageSquare, FiActivity, FiShield, FiCheck, FiX, FiTrash2, FiMessageCircle, FiExternalLink } from 'react-icons/fi';
import { BsCheckCircleFill } from 'react-icons/bs';
import { useApp } from '@/app/ClientLayout';

interface AdminUser {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  is_blocked: boolean;
  created_at: string;
  last_seen: string;
}

interface AdminMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  is_deleted: boolean;
  sender: { username: string } | null;
  chats: { user1_id: string; user2_id: string } | null;
}

interface Stats {
  totalUsers: number;
  totalMessages: number;
  activeUsers: number;
  totalChats: number;
  blockedUsers: number;
}

export default function AdminPage() {
  const { user } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'messages' | 'reports' | 'verify'>('stats');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allChats, setAllChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatsSearchQuery, setChatsSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Доступ запрещен');
      router.push('/app');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'admin') loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        setStats(data);
      } else if (activeTab === 'users') {
        const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
        const res = await fetch(`/api/admin/users${q}`);
        const data = await res.json();
        setUsers(data.users || []);
      } else if (activeTab === 'messages') {
        const res = await fetch('/api/admin/messages');
        const data = await res.json();
        setMessages(data.messages || []);
      } else if (activeTab === 'chats') {
        const q = chatsSearchQuery ? `?q=${encodeURIComponent(chatsSearchQuery)}` : '';
        const res = await fetch(`/api/admin/chats${q}`);
        const data = await res.json();
        setAllChats(data.chats || []);
      } else if (activeTab === 'reports') {
        const res = await fetch('/api/admin/reports');
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId: string, action: 'verify' | 'unverify') => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Ошибка');
    }
  };

  const handleBlock = async (userId: string, action: 'block' | 'unblock' | 'kick') => {
    try {
      const res = await fetch('/api/admin/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Ошибка');
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/admin/chats/${chatId}`);
      const data = await res.json();
      if (data.messages) {
        const sorted = [...data.messages].sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setChatMessages(sorted);
        setSelectedChat(data.chat);
      }
    } catch {
      toast.error('Ошибка загрузки чата');
    }
  };

  const deleteChatMessage = async (messageId: string) => {
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        toast.success('Сообщение удалено');
        setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true } : m));
      }
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        toast.success('Сообщение удалено');
        loadData();
      }
    } catch {
      toast.error('Ошибка');
    }
  };

  const tabs = [
    { key: 'stats', label: 'Статистика', icon: FiActivity },
    { key: 'users', label: 'Пользователи', icon: FiUsers },
    { key: 'verify', label: 'Верификация', icon: BsCheckCircleFill },
    { key: 'messages', label: 'Сообщения', icon: FiMessageSquare },
    { key: 'chats', label: 'Все чаты', icon: FiMessageCircle },
    { key: 'reports', label: 'Жалобы', icon: FiShield },
  ] as const;

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-container" style={{ overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingTop: '1rem' }}>
        <button onClick={() => router.push('/app')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>
          <FiArrowLeft />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Админ-панель</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="sky-btn sky-btn-sm"
            style={{
              width: 'auto',
              background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === tab.key ? 'white' : 'var(--foreground)',
              border: activeTab === tab.key ? 'none' : '1px solid var(--border)',
            }}
          >
            <tab.icon style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Загрузка...
        </div>
      )}

      {!loading && activeTab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Всего пользователей', value: stats.totalUsers, icon: FiUsers, color: '#3b82f6' },
            { label: 'Всего сообщений', value: stats.totalMessages, icon: FiMessageSquare, color: '#22c55e' },
            { label: 'Активных за 24ч', value: stats.activeUsers, icon: FiActivity, color: '#f59e0b' },
            { label: 'Всего чатов', value: stats.totalChats, icon: FiMessageSquare, color: '#8b5cf6' },
            { label: 'Заблокировано', value: stats.blockedUsers, icon: FiShield, color: '#ef4444' },
          ].map((item) => (
            <div key={item.label} className="admin-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: '1.3rem' }}>
                  <item.icon />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === 'users' && (
        <div className="admin-card">
          <div style={{ marginBottom: '1rem' }}>
            <input
              className="sky-input"
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                          {u.avatar_url ? <img src={u.avatar_url} alt="" /> : u.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          @{u.username}
                          {u.is_verified && <BsCheckCircleFill className="verified-badge" style={{ marginLeft: '0.25rem' }} />}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem',
                        background: u.role === 'admin' ? 'var(--primary-light)' : 'var(--background)',
                        color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
                      }}>
                        {u.role === 'admin' ? 'Админ' : 'Пользователь'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: u.is_blocked ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
                        {u.is_blocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(u.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {u.role !== 'admin' && (
                          <>
                            <button className="sky-btn sky-btn-sm" style={{ width: 'auto' }}
                              onClick={() => handleVerify(u.id, u.is_verified ? 'unverify' : 'verify')}>
                              {u.is_verified ? <FiX /> : <FiCheck />} галочка
                            </button>
                            <button className="sky-btn sky-btn-sm sky-btn-danger" style={{ width: 'auto' }}
                              onClick={() => handleBlock(u.id, u.is_blocked ? 'unblock' : 'block')}>
                              {u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                            </button>
                            <button className="sky-btn sky-btn-sm" style={{ width: 'auto', background: '#dc2626', color: 'white' }}
                              onClick={() => {
                                if (confirm(`Удалить пользователя ${u.username}?`)) handleBlock(u.id, 'kick');
                              }}>
                              <FiTrash2 /> Удалить
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'verify' && (
        <div className="admin-card">
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Здесь вы можете выдавать и убирать синие галочки верификации.
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <input
              className="sky-input"
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('users');
                  setTimeout(() => setActiveTab('verify'), 100);
                }
              }}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Галочка</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.filter((u) => !searchQuery || u.username.includes(searchQuery)).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>@{u.username}</span>
                      {u.is_verified && <BsCheckCircleFill className="verified-badge" style={{ marginLeft: '0.35rem' }} />}
                    </td>
                    <td>
                      {u.is_verified
                        ? <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ Выдана</span>
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          className="sky-btn sky-btn-sm"
                          style={{ width: 'auto', background: u.is_verified ? '#ef4444' : 'var(--primary)' }}
                          onClick={() => handleVerify(u.id, u.is_verified ? 'unverify' : 'verify')}
                        >
                          {u.is_verified ? 'Убрать галочку' : 'Выдать галочку'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'messages' && (
        <div className="admin-card">
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Последние сообщения (только для модерации).
          </p>
          <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Нет сообщений</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{
                padding: '0.75rem', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    <strong>{msg.sender?.username || 'Unknown'}</strong>
                    {' · '}
                    {new Date(msg.created_at).toLocaleString('ru-RU')}
                    {msg.is_deleted && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>[Удалено]</span>}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontStyle: msg.is_deleted ? 'italic' : 'normal',
                    opacity: msg.is_deleted ? 0.5 : 1,
                  }}>
                    {msg.is_deleted ? 'Сообщение удалено' : msg.text}
                  </div>
                </div>
                {!msg.is_deleted && (
                  <button
                    className="sky-btn sky-btn-sm sky-btn-danger"
                    style={{ width: 'auto', flexShrink: 0 }}
                    onClick={() => deleteMessage(msg.id)}
                  >
                    <FiTrash2 /> Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === 'chats' && !selectedChat && (
        <div className="admin-card">
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input
              className="sky-input"
              placeholder="Поиск чата по нику пользователя..."
              value={chatsSearchQuery}
              onChange={(e) => setChatsSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              style={{ flex: 1 }}
            />
            <button className="sky-btn sky-btn-sm" style={{ width: 'auto' }} onClick={loadData}>Найти</button>
          </div>
          {allChats.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Чаты не найдены</p>
          )}
          <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
            {allChats.map((chat: any) => {
              const u1 = chat.user1 || {};
              const u2 = chat.user2 || {};
              return (
                <div key={chat.id}
                  onClick={() => loadChatMessages(chat.id)}
                  style={{
                    padding: '0.75rem', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', gap: '0.25rem', fontSize: '0.9rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>@{u1.username}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>↔</span>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>@{u2.username}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {chat.last_message && (
                      <span style={{
                        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontStyle: chat.last_message.is_deleted ? 'italic' : 'normal',
                        opacity: chat.last_message.is_deleted ? 0.5 : 0.8,
                      }}>
                        {chat.last_message.is_deleted ? 'Сообщение удалено' : chat.last_message.text}
                      </span>
                    )}
                    <FiExternalLink style={{ fontSize: '0.8rem', color: 'var(--primary)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && activeTab === 'chats' && selectedChat && (
        <div className="admin-card">
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="sky-btn sky-btn-sm" style={{ width: 'auto' }} onClick={() => { setSelectedChat(null); setChatMessages([]); }}>
              ← Назад
            </button>
            <span style={{ fontWeight: 600 }}>
              Чат: @{selectedChat.user1?.username} ↔ @{selectedChat.user2?.username}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              ({new Date(selectedChat.created_at).toLocaleDateString('ru-RU')})
            </span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: '0.5rem' }}>
            {chatMessages.length === 0 && (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Нет сообщений в чате</p>
            )}
            {chatMessages.map((msg: any) => (
              <div key={msg.id} style={{
                padding: '0.6rem 0.75rem', marginBottom: '0.25rem',
                borderBottom: '1px solid var(--border)',
                borderRadius: 8,
                background: msg.is_deleted ? 'var(--background)' : 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, color: msg.sender_id === selectedChat.user1?.id ? '#3b82f6' : '#22c55e' }}>
                        @{msg.sender?.username || 'Unknown'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        {new Date(msg.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      fontStyle: msg.is_deleted ? 'italic' : 'normal',
                      opacity: msg.is_deleted ? 0.5 : 0.9,
                    }}>
                      {msg.voice_url ? '🎤 Голосовое сообщение' : (msg.media_url ? '📎 Медиафайл' : (msg.is_deleted ? '⚠ Сообщение удалено' : msg.text))}
                    </div>
                  </div>
                  {!msg.is_deleted && (
                    <button
                      className="sky-btn sky-btn-sm sky-btn-danger"
                      style={{ width: 'auto', flexShrink: 0, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      onClick={() => deleteChatMessage(msg.id)}
                    >
                      <FiTrash2 /> Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === 'reports' && (
        <div className="admin-card">
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Жалобы пользователей.
          </p>
          {reports.length === 0 && (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Нет жалоб</p>
          )}
          {reports.map((report: any) => (
            <div key={report.id} style={{
              padding: '0.75rem', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>От:</strong> @{report.reporter?.username} <strong>на:</strong> @{report.reported?.username}
                {' · '}{new Date(report.created_at).toLocaleString('ru-RU')}
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{report.reason}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Вы вошли как @{user.username}
      </div>
    </div>
  );
}
