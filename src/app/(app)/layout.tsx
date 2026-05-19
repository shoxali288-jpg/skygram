'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useApp } from '../ClientLayout';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, loading } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  useEffect(() => {
    if (pathname?.includes('/chat/')) {
      setShowMobileChat(true);
    } else {
      setShowMobileChat(false);
    }
  }, [pathname]);

  const loadChats = async () => {
    try {
      const res = await fetch('/api/chats/list');
      const data = await res.json();
      if (data.chats) setChats(data.chats);
    } catch {
      console.error('Failed to load chats');
    }
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const startChat = async (username: string) => {
    try {
      const res = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка');
        return;
      }
      setSearchQuery('');
      setSearchResults([]);
      if (data.chat_id) {
        router.push(`/app/chat/${data.chat_id}`);
        loadChats();
      }
    } catch {
      toast.error('Ошибка создания чата');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const isActive = (tab: string) => {
    if (tab === 'chats') return !pathname?.includes('/profile/') && !pathname?.includes('/settings') && !pathname?.includes('/admin');
    if (tab === 'profile') return pathname?.startsWith('/app/profile/');
    if (tab === 'settings') return pathname?.startsWith('/app/settings');
    return false;
  };

  if (loading || !user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        ref={sidebarRef}
        user={user}
        chats={chats}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onSearch={handleSearch}
        onStartChat={startChat}
        onLogout={handleLogout}
        activeChatId={pathname?.split('/chat/')[1] || ''}
        hidden={showMobileChat}
        onNavigate={(url) => {
          router.push(url);
          setShowMobileChat(true);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>

      <MobileNav
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={(url) => router.push(url)}
      />
    </div>
  );
}
