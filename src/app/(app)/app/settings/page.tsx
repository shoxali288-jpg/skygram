'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiLogOut, FiImage, FiBell, FiMoon, FiSun, FiDroplet, FiLock } from 'react-icons/fi';
import { BsCheckCircleFill } from 'react-icons/bs';
import { useApp } from '@/app/ClientLayout';

const themes = [
  { id: 'theme-blue', name: 'Голубая', icon: FiDroplet, color: '#0088cc' },
  { id: 'theme-white', name: 'Белая', icon: FiSun, color: '#f5f5f5' },
  { id: 'theme-dark', name: 'Чёрная', icon: FiMoon, color: '#161b22' },
  { id: 'theme-premium', name: 'Premium Dark', icon: FiMoon, color: '#0a0a0f' },
];

export default function SettingsPage() {
  const { user, setUser, theme, setTheme, soundEnabled, setSoundEnabled } = useApp();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? '');
  const [showPhone, setShowPhone] = useState(user?.show_phone ?? true);
  const [showBio, setShowBio] = useState(user?.show_bio ?? true);
  const [showBirthDate, setShowBirthDate] = useState(user?.show_birth_date ?? true);
  const [dirty, setDirty] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 5MB)');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ ...user!, avatar_url: data.avatar_url });
        toast.success('Аватарка обновлена');
      } else {
        toast.error(data.error || 'Ошибка загрузки');
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, bio, birth_date: birthDate, show_phone: showPhone, show_bio: showBio, show_birth_date: showBirthDate }),
      });
      if (res.ok) {
        setUser({ ...user!, phone, bio, birth_date: birthDate, show_phone: showPhone, show_bio: showBio, show_birth_date: showBirthDate });
        setDirty(false);
        toast.success('Настройки сохранены');
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const getAvatarLetter = (username: string) => username?.charAt(0).toUpperCase() || '?';

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>
          <FiArrowLeft />
        </button>
        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Настройки</span>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {/* Profile Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div className="chat-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem', cursor: 'pointer' }}
            onClick={() => router.push(`/app/profile/${user?.username}`)}>
            {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : getAvatarLetter(user?.username || '')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              @{user?.username}
              {user?.is_verified && <BsCheckCircleFill className="verified-badge" />}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
          </div>
          <button className="sky-btn sky-btn-sm" style={{ width: 'auto' }}
            onClick={() => router.push(`/app/profile/${user?.username}`)}>
            <FiUser style={{ marginRight: '0.35rem' }} /> Профиль
          </button>
        </div>

        {/* Avatar */}
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiImage /> Аватарка
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
          <button className="sky-btn sky-btn-secondary sky-btn-sm" style={{ width: 'auto' }}
            onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Загрузка...' : 'Загрузить аватарку'}
          </button>
          {user?.avatar_url && (
            <button className="sky-btn sky-btn-sm sky-btn-danger" style={{ width: 'auto', marginLeft: '0.5rem' }}
              onClick={async () => {
                await fetch('/api/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ avatar_url: null }),
                });
                setUser({ ...user!, avatar_url: null });
                toast.success('Аватарка удалена');
              }}>
              Удалить
            </button>
          )}
        </div>

        {/* Privacy */}
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiLock /> Конфиденциальность
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Телефон</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text" placeholder="+998 XX XXX XX XX"
                  value={phone ?? ''}
                  onChange={(e) => { setPhone(e.target.value); setDirty(true); }}
                  className="search-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => { setShowPhone(!showPhone); setDirty(true); }}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: showPhone ? 'var(--primary)' : 'var(--surface)',
                    color: showPhone ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap',
                  }}
                >
                  {showPhone ? 'Показан' : 'Скрыт'}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>О себе</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <textarea
                  placeholder="Расскажите о себе..."
                  value={bio ?? ''}
                  onChange={(e) => { setBio(e.target.value); setDirty(true); }}
                  className="search-input"
                  style={{ flex: 1, resize: 'vertical', minHeight: 60, fontFamily: 'inherit', fontSize: '0.9rem' }}
                  maxLength={500}
                />
                <button
                  onClick={() => { setShowBio(!showBio); setDirty(true); }}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: showBio ? 'var(--primary)' : 'var(--surface)',
                    color: showBio ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', marginTop: '0.25rem',
                  }}
                >
                  {showBio ? 'Показан' : 'Скрыт'}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Дата рождения</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={birthDate ?? ''}
                  onChange={(e) => { setBirthDate(e.target.value); setDirty(true); }}
                  className="search-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => { setShowBirthDate(!showBirthDate); setDirty(true); }}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: showBirthDate ? 'var(--primary)' : 'var(--surface)',
                    color: showBirthDate ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap',
                  }}
                >
                  {showBirthDate ? 'Показан' : 'Скрыт'}
                </button>
              </div>
            </div>
            <button
              className="sky-btn sky-btn-sm"
              style={{ width: 'auto', alignSelf: 'flex-start', opacity: dirty ? 1 : 0.5 }}
              disabled={!dirty}
              onClick={handleSavePrivacy}
            >
              Сохранить
            </button>
          </div>
        </div>

        {/* Sound */}
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiBell /> Звук сообщений
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{
              width: 48, height: 26, borderRadius: 13, padding: 2,
              background: soundEnabled ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.2s', cursor: 'pointer', position: 'relative',
            }}
              onClick={() => setSoundEnabled(!soundEnabled)}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2,
                left: soundEnabled ? 24 : 2,
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <span style={{ fontSize: '0.9rem' }}>{soundEnabled ? 'Включен' : 'Выключен'}</span>
          </label>
        </div>

        {/* Theme */}
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiMoon /> Тема оформления
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: theme === t.id ? `2px solid ${t.color}` : '2px solid var(--border)',
                  background: 'var(--background)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '1.5rem', color: t.color, marginBottom: '0.35rem' }}>
                  <t.icon />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="admin-card">
          <button className="sky-btn sky-btn-danger" onClick={handleLogout}>
            <FiLogOut style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
