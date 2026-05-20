'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { clearSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

export default function BlockedPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear the session cookie
    const cookieStore = cookies();
    const { name, value, options } = clearSessionCookie();
    cookieStore.set(name, value, options);

    // Show toast and redirect to login after a short delay
    toast.error('Ваш аккаунт был заблокирован. Обратитесь к администратору.');
    
    const redirectToLogin = () => {
      router.push('/login');
    };

    // Delay redirect to let toast be visible
    const timer = setTimeout(redirectToLogin, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

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
          color: '#ef4444'
        }}>
          🚫
        </div>
        <h1 style={{ 
          marginBottom: '1rem',
          fontSize: '1.8rem',
          color: 'var(--foreground)'
        }}>
          Аккаунт заблокирован
        </h1>
        <p style={{ 
          marginBottom: '2rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6
        }}>
          Ваш аккаунт был заблокирован администратором. Если вы считаете, что это ошибка, пожалуйста, обратитесь в службу поддержки.
        </p>
        <div style={{ 
          display: 'flex',
          gap: '1rem'
        }}>
          <button 
            onClick={() => {
              // Clear cookie and redirect to login immediately
              const cookieStore = cookies();
              const { name, value, options } = clearSessionCookie();
              cookieStore.set(name, value, options);
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
    </div>
  );
}