import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: number) => void;
  batchQueueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, batchQueueCount }) => {
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
        Frame<span>IQ NEXUS 2.0</span>
      </a>

      <div className="side-label">CORE WORKFLOW</div>
      <button
        type="button"
        className={`side-link ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        ◈ <span>Home Dashboard</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'batch' ? 'active' : ''}`}
        onClick={() => onNavigate('batch')}
      >
        ☷ <span>Video Upload / Batch</span>
        {batchQueueCount !== undefined && batchQueueCount > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              background: '#9c4dff',
              color: 'white',
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {batchQueueCount}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'result' ? 'active' : ''}`}
        onClick={() => onNavigate('result')}
      >
        🏆 <span>Thumbnail Results</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'studio' ? 'active' : ''}`}
        onClick={() => onNavigate('studio')}
      >
        🎨 <span>Thumbnail Editor</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'history' ? 'active' : ''}`}
        onClick={() => onNavigate('history')}
      >
        ◷ <span>Processing History</span>
      </button>

      <div className="side-label">RESEARCH &amp; BENCHMARKS</div>
      <button
        type="button"
        className={`side-link ${currentView === 'comparison' ? 'active' : ''}`}
        onClick={() => onNavigate('comparison')}
      >
        ⚖ <span>Method Comparison</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'ablation' ? 'active' : ''}`}
        onClick={() => onNavigate('ablation')}
      >
        🔬 <span>Ablation Study</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'analytics' ? 'active' : ''}`}
        onClick={() => onNavigate('analytics')}
      >
        📊 <span>Analytics &amp; Table V</span>
      </button>

      <button
        type="button"
        className={`side-link ${currentView === 'nexus' ? 'active' : ''}`}
        style={{
          background:
            currentView === 'nexus'
              ? 'linear-gradient(95deg,#692694,#3e1d68)'
              : 'rgba(126, 68, 224, 0.15)',
          border: '1px solid #7746c8',
          color: '#e4c9ff',
          marginTop: '6px',
        }}
        onClick={() => onNavigate('nexus')}
      >
        ◉ <span>NEXUS 3D Studio</span>
      </button>

      <div className="sidebar-bottom">
        <span className="status-dot"></span> FrameIQ NEXUS 2.0
        <small>CLIP · SSIM · E-CQTR · MMR</small>
      </div>
    </aside>
  );
};
