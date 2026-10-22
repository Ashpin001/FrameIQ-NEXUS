import React from 'react';

interface TopbarProps {
  currentView: string;
  onNavigate: (view: string, param?: number) => void;
  batchQueueCount?: number;
  theme?: string;
  onThemeChange?: (theme: string) => void;
  layout?: string;
  onLayoutChange?: (layout: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentView,
  onNavigate,
  batchQueueCount,
  theme = 'studio',
  onThemeChange,
  layout = 'expanded',
  onLayoutChange,
}) => {
  return (
    <header className="topbar">
      <div
        className="mobile-brand"
        style={{ cursor: 'pointer' }}
        onClick={() => onNavigate('home')}
      >
        ◢ FrameIQ Pro
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
          className={currentView === 'batch' ? 'active' : ''}
          onClick={() => onNavigate('batch')}
          style={{ position: 'relative' }}
        >
          Batch Queue
          {batchQueueCount !== undefined && batchQueueCount > 0 && (
            <span
              style={{
                marginLeft: '6px',
                background: '#a855f7',
                color: 'white',
                fontSize: '10px',
                padding: '1px 6px',
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

      {/* Theme and Layout Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {onThemeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0b0e1a', padding: '4px 8px', borderRadius: '8px', border: '1px solid #252b42' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Theme:</span>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '11px',
                padding: '2px 4px',
                margin: 0,
                width: 'auto',
                cursor: 'pointer',
              }}
            >
              <option value="studio" style={{ background: '#111624' }}>Studio Pro</option>
              <option value="obsidian" style={{ background: '#0d111a' }}>Obsidian</option>
              <option value="cyber" style={{ background: '#140d28' }}>Cyber</option>
              <option value="steel" style={{ background: '#161c26' }}>Steel</option>
            </select>
          </div>
        )}

        {onLayoutChange && (
          <button
            type="button"
            className="btn ghost"
            style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px' }}
            onClick={() => onLayoutChange(layout === 'expanded' ? 'compact' : 'expanded')}
            title="Toggle between spacious studio and compact data density"
          >
            {layout === 'expanded' ? '⊞ Expanded' : '⊟ Compact'}
          </button>
        )}

        <span className="top-badge" style={{ borderColor: '#4338ca', color: '#c7d2fe' }}>
          PRO SUITE
        </span>
      </div>
    </header>
  );
};
