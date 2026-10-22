import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="sidebar">
      <a
        className="logo"
        href="#dashboard"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('home');
        }}
      >
        <span className="logo-icon">▶</span>
        Frame<span>IQ AI</span>
      </a>

      <div className="side-label">WORKSPACE</div>
      <button
        type="button"
        className={`side-link ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        ◈ <span>Dashboard</span>
      </button>

      <button
        type="button"
        className="side-link"
        onClick={() => {
          onNavigate('home');
          setTimeout(() => {
            document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      >
        ✦ <span>Generate Thumbnail</span>
      </button>

      <button
        type="button"
        className="side-link"
        onClick={() => {
          onNavigate('home');
          setTimeout(() => {
            document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      >
        ⌘ <span>AI Analysis</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'history' ? 'active' : ''}`}
        onClick={() => onNavigate('history')}
      >
        ◷ <span>History</span>
      </button>

      <div className="side-label">RESEARCH</div>
      <button
        type="button"
        className="side-link"
        onClick={() => {
          onNavigate('home');
          setTimeout(() => {
            document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      >
        ▥ <span>Research Methods</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'nexus' ? 'active' : ''}`}
        style={{
          background: currentView === 'nexus' ? 'linear-gradient(95deg,#692694,#3e1d68)' : 'rgba(126, 68, 224, 0.15)',
          border: '1px solid #7746c8',
          color: '#e4c9ff',
          marginTop: '6px',
        }}
        onClick={() => onNavigate('nexus')}
      >
        ◉ <span>NEXUS 3D Studio</span>
      </button>

      <div className="sidebar-bottom">
        <span className="status-dot"></span> Local AI workspace
        <small>React · Canvas CV · CQTR</small>
      </div>
    </aside>
  );
};
