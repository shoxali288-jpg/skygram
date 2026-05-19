'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './ClientLayout';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useApp();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/app');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return null;
}
