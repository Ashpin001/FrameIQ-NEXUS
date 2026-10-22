import React from 'react';

interface TopbarProps {
  currentView: string;
  onNavigate: (view: string, param?: number) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="topbar">
      <div
        className="mobile-brand"
        style={{ cursor: 'pointer' }}
        onClick={() => onNavigate('home')}
      >
        ◢ FrameIQ AI
      </div>
      <nav>
        <button
          type="button"
          className={currentView === 'home' ? 'active' : ''}
          onClick={() => onNavigate('home')}
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate('home');
            setTimeout(() => {
              document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        >
          Generate
        </button>
        <button
          type="button"
          className={currentView === 'history' ? 'active' : ''}
          onClick={() => onNavigate('history')}
        >
          History
        </button>
        <button
          type="button"
          className={currentView === 'nexus' ? 'active' : ''}
          style={{ color: '#d8b7ff' }}
          onClick={() => onNavigate('nexus')}
        >
          NEXUS 3D
        </button>
      </nav>
      <span className="top-badge">✧ AI-POWERED STUDIO</span>
    </header>
  );
};
