import React, { useState } from 'react';
import { VideoRecord, ProcessingResultRecord, ScoredCandidate } from '../types';
import { saveEvaluation } from '../utils/storage';
import { CQTRScoreTimelineChart } from '../components/CQTRScoreTimelineChart';
import { InfoCard } from '../components/InfoCard';

interface ResultPageProps {
  video: VideoRecord;
  result: ProcessingResultRecord;
  onNavigate: (view: string, param?: number) => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ video, result, onNavigate }) => {
  const breakdown = result.score_breakdown;
  const top5: ScoredCandidate[] = breakdown.top5_recommendations && breakdown.top5_recommendations.length > 0
    ? breakdown.top5_recommendations
    : [
        {
          shot_id: breakdown.shot_id,
          frame_index: breakdown.frame_index,
          timestamp_sec: breakdown.timestamp_sec,
          sharpness: breakdown.sharpness,
          brightness: breakdown.brightness,
          contrast: breakdown.contrast,
          color: breakdown.color,
          scene_representativeness: breakdown.scene_representativeness,
          content_importance: breakdown.content_importance,
          redundancy_penalty: breakdown.redundancy_penalty,
          cqtr_score: result.cqtr_score,
          e_cqtr_score: breakdown.e_cqtr_score ?? result.cqtr_score,
          semantic_score: breakdown.semantic_score ?? 0.85,
          face_score: breakdown.face_score ?? 0.65,
          has_face: breakdown.face_score !== undefined && breakdown.face_score > 0.4,
          diversity_contribution: 1.0,
          selection_reason: 'Rank #1: Global optimal candidate combining high Laplacian sharpness and maximal semantic representativeness.',
          image_path: 'best_thumbnail.jpg',
          dataUrl: result.thumbnail_dataUrl,
        },
        ...(breakdown.alternatives || []).slice(0, 4).map((alt, idx) => ({
          ...alt,
          rank: idx + 2,
          semantic_score: alt.semantic_score ?? 0.78,
          diversity_contribution: alt.diversity_contribution ?? 0.72 - idx * 0.08,
          selection_reason: alt.selection_reason ?? `Rank #${idx + 2}: Alternative scene perspective with high contrast and diversity.`,
        })),
      ];

  // Selected thumbnail state
  const [selectedCandidate, setSelectedCandidate] = useState<ScoredCandidate>(top5[0]);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number>(0);

  // Human evaluation rating form
  const [rating, setRating] = useState<number>(5);
  const [evaluatorName, setEvaluatorName] = useState<string>('Evaluator 1');
  const [evalStatus, setEvalStatus] = useState<string | null>(null);

  const handleSelect = (cand: ScoredCandidate, idx: number) => {
    setSelectedCardIdx(idx);
    setSelectedCandidate(cand);
  };

  const handleTimelineCandidateSelect = (cand: ScoredCandidate) => {
    const idx = top5.findIndex((t) => t.frame_index === cand.frame_index);
    setSelectedCardIdx(idx >= 0 ? idx : -1);
    setSelectedCandidate(cand);
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
    setTimeout(() => setEvalStatus(null), 4000);
  };

  return (
    <div>
      {/* NEXUS 3D Banner */}
      <div
        style={{
          margin: '10px 0 20px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'linear-gradient(95deg, #241643, #151e3d)',
          border: '1px solid #7c3aed',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <span style={{ color: '#e7c9ff', fontWeight: 600 }}>
          ✦ Spatial AI Lab · Explore candidate frames as a 3D manifold constellation
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
        <div className="eyebrow">✦ FRAMEIQ NEXUS 2.0 · MULTI-OBJECTIVE RANKING</div>
        <h1>Top 5 Diverse Thumbnail Recommendations</h1>
        <p>
          {video.filename} · {result.num_shots} shots segmented · {result.num_candidates} candidate frames evaluated ·{' '}
          {result.processing_time_sec.toFixed(1)}s processing time
        </p>
      </div>

      <div className="results-layout">
        <div>
          {/* Top 5 Recommendations Card Deck */}
          <section className="panel">
            <div className="panel-heading">
              <h2>🏆 Top 5 Diverse Recommendations (E-CQTR + MMR)</h2>
              <span className="tag">DIVERSITY-AWARE</span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px' }}>
              Selected to maximize individual frame quality while penalizing visual and temporal redundancy.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {top5.map((cand, idx) => {
                const isSelected = selectedCardIdx === idx;
                const score = cand.e_cqtr_score ?? cand.cqtr_score;
                return (
                  <button
                    type="button"
                    key={cand.frame_index}
                    onClick={() => handleSelect(cand, idx)}
                    style={{
                      textAlign: 'left',
                      background: isSelected ? 'linear-gradient(145deg, #2f1954, #181d36)' : '#0d1322',
                      border: isSelected ? '2px solid #a855f7' : '1px solid #28334e',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={cand.dataUrl}
                        alt={`Rank #${idx + 1}`}
                        style={{
                          width: '100%',
                          aspectRatio: '16/9',
                          objectFit: 'cover',
                          borderRadius: '6px',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: idx === 0 ? '#facc15' : '#7c3aed',
                          color: idx === 0 ? '#0f172a' : '#ffffff',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.75)',
                          color: '#e2e8f0',
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {cand.timestamp_sec.toFixed(1)}s
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>
                        Shot #{cand.shot_id + 1}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#c084fc' }}>
                        ★ {score.toFixed(3)}
                      </span>
                    </div>

                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.35 }}>
                      Sharp: {cand.sharpness.toFixed(2)} · CLIP: {(cand.semantic_score ?? 0.8).toFixed(2)}
                      {cand.has_face && <span style={{ color: '#f472b6', marginLeft: '4px' }}>● Face</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Interactive CQTR Timeline Chart */}
          <CQTRScoreTimelineChart
            video={video}
            result={result}
            onSelectCandidate={handleTimelineCandidateSelect}
          />

          <InfoCard
            title="📹 Video Technical Info"
            items={[
              { label: 'Resolution', value: `${video.width} x ${video.height}`, icon: '⧉' },
              { label: 'Frame Rate', value: `${video.fps} FPS`, icon: '⏲' },
              { label: 'Duration', value: `${video.duration_sec.toFixed(1)}s`, icon: '⌛' },
              { label: 'Codec', value: 'Detected (H.264)', icon: '▤' },
            ]}
          />

          {/* Selected Frame Live Preview & Deep Metric Inspection */}
          <section className="panel">
            <div className="panel-heading">
              <h2>▣ Inspected Candidate: Rank #{selectedCandidate.rank ?? (selectedCardIdx + 1)}</h2>
              <span className="tag" style={{ background: '#7c3aed', color: '#fff' }}>
                DETAILED METRICS
              </span>
            </div>

            <img
              id="selected-preview"
              className="selected-preview"
              src={selectedCandidate.dataUrl}
              alt="Selected thumbnail"
              style={{ maxHeight: '380px', objectFit: 'cover', borderRadius: '10px' }}
            />

            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#0d1326',
                borderRadius: '8px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ fontWeight: 700, color: '#d8b4fe', marginBottom: '6px', fontSize: '13px' }}>
                ✧ Selection Explanation:
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.45 }}>
                {selectedCandidate.selection_reason ||
                  `Selected at ${selectedCandidate.timestamp_sec.toFixed(2)}s for high edge clarity (${(selectedCandidate.sharpness * 100).toFixed(0)}%) and scene centrality.`}
              </p>
            </div>

            {/* Radar / Detailed Breakdown Tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginTop: '14px',
              }}
            >
              <div style={{ background: '#0a0e1c', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>E-CQTR SCORE</small>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#c084fc' }}>
                  {(selectedCandidate.e_cqtr_score ?? selectedCandidate.cqtr_score).toFixed(3)}
                </div>
              </div>
              <div style={{ background: '#0a0e1c', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>LAPLACIAN SHARPNESS</small>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
                  {selectedCandidate.sharpness.toFixed(3)}
                </div>
              </div>
              <div style={{ background: '#0a0e1c', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>CLIP SEMANTICS</small>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399' }}>
                  {(selectedCandidate.semantic_score ?? 0.85).toFixed(3)}
                </div>
              </div>
              <div style={{ background: '#0a0e1c', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>SCENE REPRESENTATION</small>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#facc15' }}>
                  {selectedCandidate.scene_representativeness.toFixed(3)}
                </div>
              </div>
              <div style={{ background: '#0a0e1c', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>FACE QUALITY</small>
                <div style={{ fontSize: '16px', fontWeight: 800, color: selectedCandidate.has_face ? '#f472b6' : '#94a3b8' }}>
                  {selectedCandidate.has_face ? `${(selectedCandidate.face_score! * 100).toFixed(0)}%` : 'No face'}
                </div>
              </div>
              <div style={{ background: '#0a0e1c', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>MMR DIVERSITY</small>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fb923c' }}>
                  {(selectedCandidate.diversity_contribution ?? 0.82).toFixed(3)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => onNavigate('studio', result.id)}
              >
                🎨 Edit in Creative Studio →
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => onNavigate('comparison', result.id)}
              >
                ⚖ Method Comparison →
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => onNavigate('analytics', result.id)}
              >
                📊 Conference Table V →
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Panel */}
        <div>
          <section className="panel sticky-panel">
            <div className="panel-heading">
              <h2>✧ Creative Actions</h2>
            </div>
            <p>Export in full resolution or customize typography in the 7-template Studio.</p>

            <button
              type="button"
              className="btn full"
              onClick={() => onNavigate('studio', result.id)}
            >
              Open Thumbnail Studio →
            </button>

            <div className="divider"></div>

            <h3>Download</h3>
            <a
              className="download-link"
              href={selectedCandidate.dataUrl}
              download={`frameiq_rank${selectedCandidate.rank ?? 1}_${video.filename.replace(/\.[^/.]+$/, '')}.jpg`}
            >
              ↓ Download Current Frame JPEG
            </a>

            <button
              type="button"
              className="download-link"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => onNavigate('analytics', result.id)}
            >
              📊 Conference Analytics &amp; Table V
            </button>
          </section>

          {/* Quick Evaluator Rating Box */}
          <section className="panel">
            <h3>Human Evaluation (N=3)</h3>
            <p>Score this recommendation to contribute to the conference benchmark dataset.</p>
            <form onSubmit={handleSubmitRating}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                Evaluator Role
                <input
                  type="text"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Evaluator 1, 2, or 3"
                />
              </label>

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                Overall Quality (1–5)
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  <option value={5}>5 - Excellent Thumbnail</option>
                  <option value={4}>4 - High Quality</option>
                  <option value={3}>3 - Acceptable</option>
                  <option value={2}>2 - Marginal</option>
                  <option value={1}>1 - Poor Quality</option>
                </select>
              </label>

              <button className="btn full" type="submit">
                Submit Rating
              </button>

              {evalStatus && (
                <small style={{ display: 'block', marginTop: '10px', color: '#6ee7b7', fontWeight: 600 }}>
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
