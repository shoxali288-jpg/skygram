'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useApp } from '../ClientLayout';

export default function RegisterPage() {
  const router = useRouter();
  const { user, setUser, loading } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !confirmPassword) {
      toast.error('Заполните все поля');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (username.trim().toLowerCase() === 'shoxa2011') {
      toast.error('Этот ник зарезервирован');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка регистрации');
        return;
      }
      setUser(data.user);
      toast.success('Регистрация успешна!');
      router.push('/app');
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Skygram</h1>
        <p className="auth-subtitle">Создайте аккаунт</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              className="sky-input"
              type="text"
              placeholder="Придумайте ник"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              className="sky-input"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              className="sky-input"
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button className="sky-btn" type="submit" disabled={submitting}>
            {submitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Уже есть аккаунт?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
