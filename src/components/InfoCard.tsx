import React from 'react';

interface InfoItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

interface InfoCardProps {
  title: string;
  items: InfoItem[];
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, items }) => {
  return (
    <section className="panel" style={{ border: '1px solid #4a3875', background: '#0a0d18' }}>
      <div className="panel-heading">
        <h2 style={{ fontSize: '18px', color: '#e7c9ff' }}>{title}</h2>
      </div>
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {item.icon && <span style={{ color: '#c084fc', fontSize: '20px' }}>{item.icon}</span>}
            <div>
              <small style={{ display: 'block', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </small>
              <strong style={{ display: 'block', color: '#f8fafc', fontSize: '14px' }}>
                {item.value}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn ghost full"
        style={{ marginTop: '16px', fontSize: '12px' }}
        onClick={() => {
          const data = items.reduce((acc, item) => ({ ...acc, [item.label]: item.value }), {});
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        ↓ Export JSON
      </button>
    </section>
  );
};
