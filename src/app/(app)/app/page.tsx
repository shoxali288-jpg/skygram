'use client';

import { FiMessageSquare } from 'react-icons/fi';

export default function AppHome() {
  return (
    <div className="empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="empty-state-icon"><FiMessageSquare /></div>
        <h2 className="empty-state-title">Выберите чат</h2>
        <p className="empty-state-desc">
          Выберите чат слева, чтобы начать общение, или найдите нового друга по нику
        </p>
      </div>
    </div>
  );
}
