'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  is_blocked: boolean;
  last_seen: string;
  phone: string | null;
  bio: string | null;
  birth_date: string | null;
  show_phone: boolean;
  show_bio: boolean;
  show_birth_date: boolean;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: string;
  setTheme: (theme: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  loading: boolean;
  isOnline: boolean;
}

export const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  theme: 'theme-blue',
  setTheme: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  loading: true,
  isOnline: true,
});

export function useApp() {
  return useContext(AppContext);
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setThemeState] = useState('theme-blue');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  const setTheme = useCallback((t: string) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skygram_theme', t);
      document.documentElement.className = t;
    }
  }, []);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skygram_sound', String(v));
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('skygram_theme') || 'theme-blue';
    const savedSound = localStorage.getItem('skygram_sound') !== 'false';
    setTheme(savedTheme);
    setSoundEnabledState(savedSound);

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const splashTimer = setTimeout(() => setSplashDone(true), 2500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(splashTimer);
    };
  }, [setTheme]);

  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme, soundEnabled, setSoundEnabled, loading, isOnline }}>
      {!splashDone && (
        <div className="splash-screen">
          <div className="splash-logo">Skygram</div>
          <div className="splash-sub">Современный мессенджер</div>
        </div>
      )}
      {!isOnline && (
        <div className="connecting-overlay">
          connecting...
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}
