'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiSearch, FiUser } from 'react-icons/fi';
import { BsCheckCircleFill } from 'react-icons/bs';
import { useApp } from '@/app/ClientLayout';

export default function SearchPage() {
  const { user } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.users || []);
    } catch {
      toast.error('Ошибка поиска');
    } finally {
      setSearching(false);
    }
  };

  const getAvatarLetter = (username: string) => username.charAt(0).toUpperCase();

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Поиск пользователей</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          className="sky-input"
          placeholder="Введите ник пользователя..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          autoFocus
        />
        <button className="sky-btn" style={{ width: 'auto', padding: '0.85rem 1.5rem' }} onClick={handleSearch} disabled={searching}>
          <FiSearch />
        </button>
      </div>

      {searching && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          Поиск...
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <div className="empty-state-icon"><FiUser /></div>
          <h2 className="empty-state-title">Пользователь не найден</h2>
          <p className="empty-state-desc">
            Попробуйте изменить поисковый запрос
          </p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div>
          {results.map((u: any) => (
            <div
              key={u.id}
              className="chat-item"
              onClick={() => router.push(`/app/profile/${u.username}`)}
            >
              <div className="chat-avatar">
                {u.avatar_url ? <img src={u.avatar_url} alt="" /> : getAvatarLetter(u.username)}
              </div>
              <div className="chat-info">
                <div className="chat-name">
                  @{u.username}
                  {u.is_verified && <BsCheckCircleFill className="verified-badge" />}
                </div>
                <div className="chat-last-msg">
                  {u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && !searching && (
        <div className="empty-state" style={{ padding: '3rem' }}>
          <div className="empty-state-icon"><FiSearch /></div>
          <h2 className="empty-state-title">Найди друга по нику</h2>
          <p className="empty-state-desc">
            Введите ник пользователя в строку поиска, чтобы найти его и начать общение
          </p>
        </div>
      )}
    </div>
  );
}
