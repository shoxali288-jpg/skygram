'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useApp } from '../ClientLayout';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, loading } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Заполните все поля');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setShowForgot(true);
        }
        toast.error(data.error || 'Ошибка входа');
        return;
      }
      setUser(data.user);
      toast.success('Добро пожаловать!');
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
        <p className="auth-subtitle">Войдите в свой аккаунт</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              className="sky-input"
              type="text"
              placeholder="Ник"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              className="sky-input"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {showForgot && (
            <div style={{
              padding: '0.75rem', background: '#fef3c7', borderRadius: '10px',
              marginBottom: '1rem', fontSize: '0.85rem', color: '#92400e'
            }}>
              Обратитесь к администратору
            </div>
          )}
          <button className="sky-btn" type="submit" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Нет аккаунта?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}
