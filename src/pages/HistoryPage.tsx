import React, { useState, useEffect } from 'react';
import { VideoRecord, ProcessingResultRecord } from '../types';
import { getStoredVideos, getStoredResults } from '../utils/storage';

interface HistoryPageProps {
  onNavigate: (view: string, param?: number) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<
    Array<{
      video: VideoRecord;
      result: ProcessingResultRecord;
    }>
  >([]);

  useEffect(() => {
    const videos = getStoredVideos();
    const results = getStoredResults();

    const historyItems = results.map((res) => {
      const v = videos.find((item) => item.id === res.video_id) || {
        id: res.video_id,
        filename: 'video.mp4',
        duration_sec: 10,
        fps: 30,
        frame_count: 300,
        width: 1280,
        height: 720,
        upload_date: res.processed_date,
      };
      return { video: v, result: res };
    });

    setRuns(historyItems);
  }, []);

  return (
    <div>
      <div className="hero">
        <h1 style={{ fontSize: '32px', margin: '0 0 8px' }}>Processing History</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          All past thumbnail generation runs, stored locally in persistent storage.
        </p>
      </div>

      <div className="card">
        {runs.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            No runs yet.{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#c1a1ff', textDecoration: 'underline', cursor: 'pointer' }}
              onClick={() => onNavigate('home')}
            >
              Upload a video
            </button>{' '}
            to get started.
          </p>
        ) : (
          <table className="compare-table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Uploaded</th>
                <th>Shots</th>
                <th>Candidates</th>
                <th>CQTR Score</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(({ video, result }) => (
                <tr key={result.id}>
                  <td>
                    <strong>{video.filename}</strong>
                  </td>
                  <td>{result.processed_date}</td>
                  <td>{result.num_shots}</td>
                  <td>{result.num_candidates}</td>
                  <td>
                    <span style={{ color: '#d3a5ff', fontWeight: 600 }}>
                      {result.cqtr_score.toFixed(3)}
                    </span>
                  </td>
                  <td>{result.processing_time_sec.toFixed(2)}s</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => onNavigate('result', result.id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => onNavigate('nexus', result.id)}
                      >
                        3D
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        <button
          type="button"
          className="btn"
          onClick={() => onNavigate('home')}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};
