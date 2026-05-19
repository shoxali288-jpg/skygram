'use client';

import { useRouter } from 'next/navigation';
import { FiMessageSquare, FiSettings } from 'react-icons/fi';

interface MobileNavProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileNav({ user, activeTab, setActiveTab }: MobileNavProps) {
  const router = useRouter();

  const goTo = (tab: string, url: string) => {
    setActiveTab(tab);
    router.push(url);
  };

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-items">
        <button
          className={`bottom-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); goTo('chats', '/app'); }}
        >
          <FiMessageSquare />
          <span>Чаты</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); goTo('settings', '/app/settings'); }}
        >
          <FiSettings />
          <span>Настройки</span>
        </button>
      </div>
    </div>
  );
}
