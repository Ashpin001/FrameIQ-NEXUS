import React from 'react';
import { VideoRecord, ProcessingResultRecord } from '../types';

interface ComparisonPageProps {
  video: VideoRecord;
  result: ProcessingResultRecord;
  onNavigate: (view: string, param?: number) => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  video,
  result,
  onNavigate,
}) => {
  const baselines = result.baseline_results || {};
  const ablation = result.ablation_results || [];

  return (
    <div>
      <div className="hero">
        <h1 style={{ fontSize: '32px', margin: '0 0 8px' }}>
          Baseline Comparison &amp; Ablation Study
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>{video.filename}</p>
      </div>

      {/* Baseline Method Comparison */}
      <div className="card">
        <div className="section-title">Method Comparison</div>
        <div className="section-subtitle">
          Note: each baseline&apos;s &quot;Score&quot; column uses that method&apos;s own
          internal scale (e.g. raw sharpness vs. combined quality) and is not
          directly numerically comparable across rows &mdash; only the frame each
          method selects and its relative processing time are directly
          comparable.
        </div>

        <table className="compare-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Frame #</th>
              <th>Timestamp</th>
              <th>Score (own scale)</th>
              <th>Processing Time</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(baselines).map(([name, b]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{b.frame_index}</td>
                <td>{b.timestamp_sec.toFixed(2)}s</td>
                <td>{b.score.toFixed(3)}</td>
                <td>{b.processing_time_sec.toFixed(4)}s</td>
              </tr>
            ))}
            <tr className="highlight">
              <td>
                <strong>Proposed CQTR</strong>
              </td>
              <td>{result.best_frame_index}</td>
              <td>{result.best_timestamp_sec.toFixed(2)}s</td>
              <td>{result.cqtr_score.toFixed(3)}</td>
              <td>{result.processing_time_sec.toFixed(4)}s</td>
            </tr>
          </tbody>
        </table>

        {/* Visual Chart for Baseline Comparison */}
        <div className="chart-box">
          <h4 style={{ margin: '0 0 16px', color: '#c7b3ff' }}>
            Processing Time Comparison (seconds)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(baselines).map(([name, b]) => {
              const maxTime = Math.max(
                result.processing_time_sec,
                ...Object.values(baselines).map((x) => x.processing_time_sec)
              );
              const widthPct = Math.max(6, (b.processing_time_sec / maxTime) * 100);
              return (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#d2d8ec' }}>{name}</span>
                  <div style={{ background: '#1c2237', height: '18px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: '#6253ff', borderRadius: '4px' }}></div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#9ba5c0', textAlign: 'right' }}>
                    {b.processing_time_sec.toFixed(4)}s
                  </span>
                </div>
              );
            })}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8c4ff' }}>Proposed CQTR</span>
              <div style={{ background: '#1c2237', height: '18px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg,#ba45f4,#38c6ff)', borderRadius: '4px' }}></div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e8c4ff', textAlign: 'right' }}>
                {result.processing_time_sec.toFixed(4)}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ablation Study */}
      <div className="card">
        <div className="section-title">Ablation Study</div>
        <div className="section-subtitle">
          Shows how the selected frame&apos;s score changes as CQTR components are progressively added.
        </div>

        <table className="compare-table">
          <thead>
            <tr>
              <th>Configuration</th>
              <th>Selected Frame #</th>
              <th>Timestamp</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {ablation.map((a) => {
              const isHighlight = a.config_name.includes('Complete');
              return (
                <tr key={a.config_name} className={isHighlight ? 'highlight' : ''}>
                  <td>{a.config_name}</td>
                  <td>{a.best_frame_index}</td>
                  <td>{a.best_timestamp_sec.toFixed(2)}s</td>
                  <td>{a.best_score.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Visual Chart for Ablation Study */}
        <div className="chart-box">
          <h4 style={{ margin: '0 0 16px', color: '#c7b3ff' }}>
            Score Progression Across Configurations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ablation.map((a) => {
              const pct = Math.min(100, Math.max(10, Math.round(a.best_score * 100)));
              const isComplete = a.config_name.includes('Complete');
              return (
                <div key={a.config_name} style={{ display: 'grid', gridTemplateColumns: '280px 1fr 60px', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: isComplete ? '#f2d4ff' : '#aeb7d0', fontWeight: isComplete ? 700 : 400 }}>
                    {a.config_name}
                  </span>
                  <div style={{ background: '#1c2237', height: '18px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: isComplete ? 'linear-gradient(90deg, #9c4dff, #39c5ff)' : '#494480',
                        borderRadius: '4px',
                        transition: 'width 0.4s',
                      }}
                    ></div>
                  </div>
                  <span style={{ fontSize: '12px', color: isComplete ? '#f2d4ff' : '#9ba5c0', textAlign: 'right', fontWeight: isComplete ? 700 : 400 }}>
                    {a.best_score.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onNavigate('result', result.id)}
        >
          &larr; Back to Results
        </button>
      </div>
    </div>
  );
};
