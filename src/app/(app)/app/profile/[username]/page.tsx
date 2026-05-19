'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import { BsCheckCircleFill } from 'react-icons/bs';
import { useApp } from '@/app/ClientLayout';

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { user: currentUser } = useApp();
  const router = useRouter();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    params.then((p) => {
      loadProfile(p.username);
    });
  }, [params]);

  const loadProfile = async (username: string) => {
    try {
      const res = await fetch(`/api/users/${username}`);
      const data = await res.json();
      if (data.user) {
        setProfileUser(data.user);
      } else {
        toast.error('Пользователь не найден');
        router.push('/app');
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async () => {
    if (!profileUser) return;
    setCreatingChat(true);
    try {
      const res = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profileUser.username }),
      });
      const data = await res.json();
      if (data.chat_id) {
        router.push(`/app/chat/${data.chat_id}`);
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch {
      toast.error('Ошибка');
    } finally {
      setCreatingChat(false);
    }
  };

  const formatLastSeen = (dateStr: string) => {
    if (!dateStr) return 'недавно';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'в сети';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (diff < 86400000) return `сегодня в ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    return d.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="profile-panel" style={{ height: '100%' }}>
        <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%', margin: '2rem auto' }} />
        <div className="skeleton" style={{ width: 150, height: 20, margin: '1rem auto' }} />
        <div className="skeleton" style={{ width: 100, height: 14, margin: '0.5rem auto' }} />
      </div>
    );
  }

  if (!profileUser) return null;

  const isOnline = Date.now() - new Date(profileUser.last_seen || 0).getTime() < 120000;

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          <FiArrowLeft />
        </button>
        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Профиль</span>
      </div>
      <div className="profile-panel">
        <div className="profile-avatar-large">
          {profileUser.avatar_url ? <img src={profileUser.avatar_url} alt="" /> : profileUser.username?.charAt(0).toUpperCase()}
          {isOnline && <div className="online-dot" style={{ width: 18, height: 18, bottom: 5, right: 5, borderWidth: 3 }} />}
        </div>
        <div className="profile-username">
          @{profileUser.username}
          {profileUser.is_verified && <BsCheckCircleFill className="verified-badge" style={{ width: 22, height: 22 }} />}
        </div>
        <div className="profile-status">
          {isOnline ? 'в сети' : `был(а) ${formatLastSeen(profileUser.last_seen)}`}
        </div>
        {profileUser.role === 'admin' && (
          <div style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.2rem 0.75rem', background: 'var(--primary-light)', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
            Администратор
          </div>
        )}
        <div className="profile-actions">
          <button className="sky-btn" onClick={startChat} disabled={creatingChat}>
            <FiMessageSquare style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            {creatingChat ? 'Создание...' : 'Написать'}
          </button>
        </div>
      </div>
    </div>
  );
}
