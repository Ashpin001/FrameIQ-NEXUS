import React, { useState } from 'react';
import { VideoRecord, ProcessingResultRecord } from '../types';
import { saveEvaluation } from '../utils/storage';

interface ResultPageProps {
  video: VideoRecord;
  result: ProcessingResultRecord;
  onNavigate: (view: string, param?: number) => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ video, result, onNavigate }) => {
  const breakdown = result.score_breakdown;
  const alternatives = breakdown.alternatives || [];

  // Selected thumbnail state (defaults to best overall)
  const [selectedImg, setSelectedImg] = useState<string>(result.thumbnail_dataUrl);
  const [selectedScore, setSelectedScore] = useState<number>(result.cqtr_score);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(result.best_timestamp_sec);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number>(-1); // -1 = Best

  // Human evaluation rating form
  const [rating, setRating] = useState<number>(4);
  const [evaluatorName, setEvaluatorName] = useState<string>('Anonymous');
  const [evalStatus, setEvalStatus] = useState<string | null>(null);

  const handleSelectBest = () => {
    setSelectedCardIdx(-1);
    setSelectedImg(result.thumbnail_dataUrl);
    setSelectedScore(result.cqtr_score);
    setSelectedTimestamp(result.best_timestamp_sec);
  };

  const handleSelectAlternative = (cand: typeof alternatives[0], idx: number) => {
    setSelectedCardIdx(idx);
    setSelectedImg(cand.dataUrl);
    setSelectedScore(cand.cqtr_score);
    setSelectedTimestamp(cand.timestamp_sec);
  };

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    saveEvaluation({
      id: Date.now(),
      result_id: result.id,
      evaluator_name: evaluatorName || 'Anonymous',
      visual_attractiveness: rating,
      representativeness: rating,
      sharpness_rating: rating,
      content_relevance: rating,
      overall_quality: rating,
      submitted_date: new Date().toISOString(),
    });
    setEvalStatus('Rating saved. Thank you for supporting reproducible research!');
  };

  return (
    <div>
      {/* NEXUS 3D Banner */}
      <div
        style={{
          margin: '10px 0 20px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#211b39',
          border: '1px solid #6e4fa0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <span style={{ color: '#e7c9ff', fontWeight: 600 }}>
          ✦ Spatial AI Lab · Explore this video as a 3D frame constellation
        </span>
        <button
          type="button"
          onClick={() => onNavigate('nexus', result.id)}
          className="btn"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Explore in FrameIQ NEXUS 3D →
        </button>
      </div>

      <div className="page-heading">
        <div className="eyebrow">✦ ANALYSIS COMPLETE</div>
        <h1>Your AI thumbnail recommendations</h1>
        <p>
          {video.filename} · {result.num_shots} shots · {result.num_candidates} candidates ·{' '}
          {result.processing_time_sec.toFixed(1)}s processing
        </p>
      </div>

      <div className="results-layout">
        <div>
          {/* Top Recommendations */}
          <section className="panel">
            <div className="panel-heading">
              <h2>🏆 Top Thumbnail Recommendations</h2>
              <span className="tag">CQTR RANKING</span>
            </div>

            <div className="recommend-grid">
              <button
                type="button"
                className={`recommend-card ${selectedCardIdx === -1 ? 'selected' : ''}`}
                onClick={handleSelectBest}
              >
                <img src={result.thumbnail_dataUrl} alt="Best thumbnail" />
                <span>★ Best Overall ({result.cqtr_score.toFixed(3)})</span>
              </button>

              {alternatives.map((alt, idx) => (
                <button
                  type="button"
                  key={alt.frame_index}
                  className={`recommend-card ${selectedCardIdx === idx ? 'selected' : ''}`}
                  onClick={() => handleSelectAlternative(alt, idx)}
                >
                  <img src={alt.dataUrl} alt={`Candidate ${idx + 1}`} />
                  <span>
                    Frame {alt.frame_index} ({alt.cqtr_score.toFixed(3)})
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Selected Frame Live Preview */}
          <section className="panel">
            <div className="panel-heading">
              <h2>▣ Selected Frame</h2>
              <span className="tag">LIVE RESULTS</span>
            </div>
            <img
              id="selected-preview"
              className="selected-preview"
              src={selectedImg}
              alt="Selected thumbnail"
            />
            <div className="preview-meta">
              <span>
                Selected score:{' '}
                <strong id="selected-score" style={{ color: '#c79aff' }}>
                  {selectedScore.toFixed(3)}
                </strong>
              </span>
              <span>Best timestamp: {selectedTimestamp.toFixed(2)}s</span>
            </div>
          </section>

          {/* Why This Thumbnail? */}
          <section className="panel">
            <div className="panel-heading">
              <h2>✧ Why this thumbnail?</h2>
            </div>
            <p>
              The CQTR model ranks candidate frames using image quality (sharpness,
              exposure, contrast, saturation), content centrality, and scene
              representativeness. These are explainable algorithmic scores, not
              speculative predicted click-through rates.
            </p>

            <div className="metric-grid">
              <div>
                <small>CQTR SCORE</small>
                <strong>{result.cqtr_score.toFixed(3)}</strong>
              </div>
              <div>
                <small>CANDIDATES</small>
                <strong>{result.num_candidates}</strong>
              </div>
              <div>
                <small>SHOTS</small>
                <strong>{result.num_shots}</strong>
              </div>
              <div>
                <small>PROCESSING</small>
                <strong>{result.processing_time_sec.toFixed(1)}s</strong>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => onNavigate('comparison', result.id)}
              >
                Compare baseline methods ↗
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Panel */}
        <div>
          <section className="panel sticky-panel">
            <div className="panel-heading">
              <h2>✧ AI Thumbnail Editor</h2>
            </div>
            <p>Make your thumbnail publication-ready in the creative studio.</p>
            <button
              type="button"
              className="btn full"
              onClick={() => onNavigate('studio', result.id)}
            >
              Open Creative Studio →
            </button>

            <div className="divider"></div>

            <h3>Download thumbnail</h3>
            <a
              className="download-link"
              href={selectedImg}
              download={`frameiq_thumbnail_${video.filename.replace(/\.[^/.]+$/, '')}.jpg`}
            >
              ↓ Download Current Frame JPEG
            </a>
            <button
              type="button"
              className="download-link"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => onNavigate('comparison', result.id)}
            >
              ▤ Research comparison
            </button>
          </section>

          <section className="panel">
            <h3>Human evaluation</h3>
            <p>Rate the generated result to support genuine evaluation.</p>
            <form onSubmit={handleSubmitRating}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                Evaluator Name
                <input
                  type="text"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Anonymous or your name"
                />
              </label>

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                Overall quality (1–5)
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  <option value={1}>1 - Poor quality</option>
                  <option value={2}>2 - Below average</option>
                  <option value={3}>3 - Acceptable</option>
                  <option value={4}>4 - High quality</option>
                  <option value={5}>5 - Excellent thumbnail</option>
                </select>
              </label>

              <button className="btn full" type="submit">
                Submit rating
              </button>

              {evalStatus && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    color: '#6ee7b7',
                    fontWeight: 600,
                  }}
                >
                  {evalStatus}
                </small>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
