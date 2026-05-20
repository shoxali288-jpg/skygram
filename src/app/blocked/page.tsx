'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function BlockedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'blocked';

  useEffect(() => {
    document.cookie = 'skygram_session=; max-age=0; path=/';
    const message = reason === 'deleted'
      ? 'Ваш аккаунт был удален администратором.'
      : 'Ваш аккаунт был заблокирован. Обратитесь к администратору.';
    toast.error(message);

    const timer = setTimeout(() => router.push('/login'), 4000);
    return () => clearTimeout(timer);
  }, []);

  const isDeleted = reason === 'deleted';

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--background)',
      color: 'var(--foreground)',
      padding: '2rem'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: '2rem',
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1.5rem',
          color: isDeleted ? '#6b7280' : '#ef4444'
        }}>
          {isDeleted ? '👤❌' : '🚫'}
        </div>
        <h1 style={{ 
          marginBottom: '1rem',
          fontSize: '1.8rem',
          color: 'var(--foreground)'
        }}>
          {isDeleted ? 'Аккаунт удален' : 'Аккаунт заблокирован'}
        </h1>
        <p style={{ 
          marginBottom: '2rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6
        }}>
          {isDeleted
            ? 'Ваш аккаунт был удален администратором. Если вы считаете, что это ошибка, обратитесь в поддержку — вас могут восстановить.'
            : 'Ваш аккаунт был заблокирован администратором. Если вы считаете, что это ошибка, обратитесь в службу поддержки.'}
        </p>
        <button 
          onClick={() => {
            document.cookie = 'skygram_session=; max-age=0; path=/';
            router.push('/login');
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Войти в другой аккаунт
        </button>
      </div>
    </div>
  );
}
