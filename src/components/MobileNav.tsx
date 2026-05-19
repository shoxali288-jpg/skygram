'use client';

import { FiMessageSquare, FiSearch, FiSettings } from 'react-icons/fi';

interface MobileNavProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigate: (url: string) => void;
}

export default function MobileNav({ user, activeTab, setActiveTab, onNavigate }: MobileNavProps) {
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-items">
        <button
          className={`bottom-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => { setActiveTab('chats'); onNavigate('/app'); }}
        >
          <FiMessageSquare />
          <span>Чаты</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => { setActiveTab('search'); onNavigate('/app/search'); }}
        >
          <FiSearch />
          <span>Поиск</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); onNavigate('/app/settings'); }}
        >
          <FiSettings />
          <span>Настройки</span>
        </button>
      </div>
    </div>
  );
}
