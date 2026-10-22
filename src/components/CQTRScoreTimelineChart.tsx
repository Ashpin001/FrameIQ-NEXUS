import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import { ProcessingResultRecord, ScoredCandidate, VideoRecord } from '../types';

interface CQTRScoreTimelineChartProps {
  video: VideoRecord;
  result: ProcessingResultRecord;
  onSelectCandidate?: (candidate: ScoredCandidate) => void;
}

interface TimelinePoint {
  time: number;
  timeLabel: string;
  cqtr: number;
  predictedPotential: number;
  sharpness: number;
  saliency: number;
  candidate?: ScoredCandidate;
  isBest?: boolean;
  isNextBest1?: boolean;
  isNextBest2?: boolean;
}

export const CQTRScoreTimelineChart: React.FC<CQTRScoreTimelineChartProps> = ({
  video,
  result,
  onSelectCandidate,
}) => {
  const [showComponents, setShowComponents] = useState<boolean>(false);
  const [predictiveWeight, setPredictiveWeight] = useState<number>(0.35); // lookahead diversity bias

  const breakdown = result.score_breakdown;
  const bestCandidate: ScoredCandidate = {
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
    image_path: 'best_thumbnail.jpg',
    dataUrl: result.thumbnail_dataUrl,
  };

  const candidatePool: ScoredCandidate[] = [
    bestCandidate,
    ...(breakdown.alternatives || []),
  ];

  const duration = Math.max(1, video.duration_sec || 10);

  // Predictive algorithm: Rank 'next best' potential keyframes
  // Rewards high quality while enforcing temporal separation from the current best frame
  const { nextBest1, nextBest2, timelineData } = useMemo(() => {
    // 1. Identify next best candidates using diversity-penalized score
    const otherCandidates = candidatePool.filter(
      (c) => c.frame_index !== result.best_frame_index
    );

    const scoredOthers = otherCandidates.map((c) => {
      const timeDistance = Math.abs(c.timestamp_sec - result.best_timestamp_sec);
      const normalizedDist = Math.min(1.0, timeDistance / (duration * 0.4));
      // Predictive potential blends native CQTR with temporal novelty
      const potential = (1 - predictiveWeight) * c.cqtr_score + predictiveWeight * normalizedDist;
      return { candidate: c, potential };
    });

    scoredOthers.sort((a, b) => b.potential - a.potential);

    const nb1 = scoredOthers[0]?.candidate;
    const nb2 = scoredOthers[1]?.candidate;

    // 2. Generate smooth timeline points (every 0.25 - 0.5s)
    const numSteps = 40;
    const points: TimelinePoint[] = [];

    for (let i = 0; i <= numSteps; i++) {
      const t = (i / numSteps) * duration;
      const tLabel = `${t.toFixed(1)}s`;

      // Find nearest candidates
      let interpolatedCQTR = 0.45;
      let interpolatedSharpness = 0.5;
      let interpolatedSaliency = 0.5;
      let matchedCandidate: ScoredCandidate | undefined;

      // Find if an exact candidate is close to this time step (within threshold)
      for (const cand of candidatePool) {
        const dist = Math.abs(cand.timestamp_sec - t);
        if (dist <= duration / (numSteps * 1.5)) {
          matchedCandidate = cand;
          break;
        }
      }

      // Smooth Gaussian kernel interpolation from candidate nodes
      let weightSum = 0;
      let weightedCQTRSum = 0;
      let weightedSharpSum = 0;
      let weightedSalSum = 0;

      candidatePool.forEach((cand) => {
        const dist = Math.abs(cand.timestamp_sec - t);
        const w = Math.exp(-(dist * dist) / (2 * 1.8 * 1.8));
        weightSum += w;
        weightedCQTRSum += cand.cqtr_score * w;
        weightedSharpSum += cand.sharpness * w;
        weightedSalSum += cand.content_importance * w;
      });

      if (weightSum > 0) {
        interpolatedCQTR = weightedCQTRSum / weightSum;
        interpolatedSharpness = weightedSharpSum / weightSum;
        interpolatedSaliency = weightedSalSum / weightSum;
      }

      // If matched candidate exists, anchor to candidate's exact scores
      if (matchedCandidate) {
        interpolatedCQTR = matchedCandidate.cqtr_score;
        interpolatedSharpness = matchedCandidate.sharpness;
        interpolatedSaliency = matchedCandidate.content_importance;
      }

      // Predictive potential trajectory
      const timeDiffFromBest = Math.abs(t - result.best_timestamp_sec);
      const temporalSeparation = Math.min(1.0, timeDiffFromBest / (duration * 0.35));
      const predictiveEnvelope = Math.min(
        1.0,
        Math.max(0.1, interpolatedCQTR * 0.85 + temporalSeparation * predictiveWeight * 0.4)
      );

      const isBest = matchedCandidate?.frame_index === result.best_frame_index;
      const isNb1 = nb1 && matchedCandidate?.frame_index === nb1.frame_index;
      const isNb2 = nb2 && matchedCandidate?.frame_index === nb2.frame_index;

      points.push({
        time: parseFloat(t.toFixed(2)),
        timeLabel: tLabel,
        cqtr: parseFloat(interpolatedCQTR.toFixed(3)),
        predictedPotential: parseFloat(predictiveEnvelope.toFixed(3)),
        sharpness: parseFloat(interpolatedSharpness.toFixed(3)),
        saliency: parseFloat(interpolatedSaliency.toFixed(3)),
        candidate: matchedCandidate,
        isBest,
        isNextBest1: isNb1,
        isNextBest2: isNb2,
      });
    }

    return { nextBest1: nb1, nextBest2: nb2, timelineData: points };
  }, [candidatePool, result, duration, predictiveWeight]);

  // Custom Interactive Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: TimelinePoint = payload[0].payload;
      return (
        <div
          style={{
            background: '#0a0d1a',
            border: '1px solid #3b4363',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#f8fafc',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            fontSize: '12px',
            maxWidth: '220px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{data.timeLabel}</span>
            {data.isBest && (
              <span className="tag" style={{ background: '#2c1447', borderColor: '#a855f7', color: '#e9d5ff', padding: '2px 6px', fontSize: '9px' }}>
                ★ Best Overall
              </span>
            )}
            {data.isNextBest1 && (
              <span className="tag" style={{ background: '#0a2336', borderColor: '#38bdf8', color: '#7dd3fc', padding: '2px 6px', fontSize: '9px' }}>
                ⚡ Next Best #1
              </span>
            )}
            {data.isNextBest2 && (
              <span className="tag" style={{ background: '#0f291e', borderColor: '#34d399', color: '#6ee7b7', padding: '2px 6px', fontSize: '9px' }}>
                ⚡ Next Best #2
              </span>
            )}
          </div>

          {data.candidate && (
            <div style={{ marginBottom: '8px' }}>
              <img
                src={data.candidate.dataUrl}
                alt="Frame thumbnail"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2b354d' }}
              />
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                Frame #{data.candidate.frame_index}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#c084fc' }}>● CQTR Score:</span>
              <strong style={{ color: '#e9d5ff' }}>{data.cqtr}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#38bdf8' }}>◌ Predicted Potential:</span>
              <strong style={{ color: '#bae6fd' }}>{data.predictedPotential}</strong>
            </div>
            {showComponents && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Sharpness:</span>
                  <span>{data.sharpness}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Saliency:</span>
                  <span>{data.saliency}</span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="panel" style={{ padding: '22px', background: 'linear-gradient(145deg, #121626, #0c101c)' }}>
      {/* Title & Predictive Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
        <div>
          <div className="eyebrow" style={{ color: '#38bdf8' }}>
            PREDICTIVE QUALITY MODEL · RECHARTS VISUALIZATION
          </div>
          <h2 style={{ fontSize: '18px', margin: '4px 0 0', color: '#f8fafc' }}>
            CQTR Score Timeline &amp; Predictive Next Best Keyframes
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn ghost"
            style={{ fontSize: '11px', padding: '6px 12px' }}
            onClick={() => setShowComponents(!showComponents)}
          >
            {showComponents ? 'Hide Components' : 'Show Sharpness & Saliency'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0a0d1a', padding: '4px 10px', borderRadius: '8px', border: '1px solid #232c45' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Predictive Novelty Bias:</span>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={predictiveWeight}
              onChange={(e) => setPredictiveWeight(parseFloat(e.target.value))}
              style={{ width: '80px', accentColor: '#38bdf8', margin: 0 }}
            />
            <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace' }}>
              {predictiveWeight.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Predictive Keyframe Recommendation Callouts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        {/* Current Best Frame */}
        <div
          style={{
            background: '#1a1433',
            border: '1px solid #7c3aed',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
          onClick={() => onSelectCandidate && onSelectCandidate(bestCandidate)}
        >
          <img
            src={result.thumbnail_dataUrl}
            alt="Best Overall"
            style={{ width: '64px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px' }}
          />
          <div>
            <div style={{ fontSize: '10px', color: '#c084fc', fontWeight: 700, letterSpacing: '0.8px' }}>
              ★ CURRENT OPTIMUM
            </div>
            <strong style={{ fontSize: '13px', color: '#ffffff' }}>
              Frame #{result.best_frame_index} ({result.best_timestamp_sec.toFixed(1)}s)
            </strong>
            <div style={{ fontSize: '11px', color: '#c4b5fd' }}>
              CQTR {result.cqtr_score.toFixed(3)} · Rank #1
            </div>
          </div>
        </div>

        {/* Predictive Next Best #1 */}
        {nextBest1 && (
          <div
            style={{
              background: '#091c2c',
              border: '1px solid #0284c7',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
            onClick={() => onSelectCandidate && onSelectCandidate(nextBest1)}
          >
            <img
              src={nextBest1.dataUrl}
              alt="Next Best 1"
              style={{ width: '64px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px' }}
            />
            <div>
              <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.8px' }}>
                ⚡ PREDICTED NEXT BEST #1
              </div>
              <strong style={{ fontSize: '13px', color: '#ffffff' }}>
                Frame #{nextBest1.frame_index} ({nextBest1.timestamp_sec.toFixed(1)}s)
              </strong>
              <div style={{ fontSize: '11px', color: '#7dd3fc' }}>
                CQTR {nextBest1.cqtr_score.toFixed(3)} · Temporal Diversity
              </div>
            </div>
          </div>
        )}

        {/* Predictive Next Best #2 */}
        {nextBest2 && (
          <div
            style={{
              background: '#0b201a',
              border: '1px solid #059669',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
            onClick={() => onSelectCandidate && onSelectCandidate(nextBest2)}
          >
            <img
              src={nextBest2.dataUrl}
              alt="Next Best 2"
              style={{ width: '64px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px' }}
            />
            <div>
              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: 700, letterSpacing: '0.8px' }}>
                ⚡ PREDICTED NEXT BEST #2
              </div>
              <strong style={{ fontSize: '13px', color: '#ffffff' }}>
                Frame #{nextBest2.frame_index} ({nextBest2.timestamp_sec.toFixed(1)}s)
              </strong>
              <div style={{ fontSize: '11px', color: '#a7f3d0' }}>
                CQTR {nextBest2.cqtr_score.toFixed(3)} · Secondary Peak
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recharts Line Chart Container */}
      <div style={{ width: '100%', height: '280px', marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timelineData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const pt: TimelinePoint = e.activePayload[0].payload;
                if (pt.candidate && onSelectCandidate) {
                  onSelectCandidate(pt.candidate);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f273d" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              ticks={[0, 0.25, 0.5, 0.75, 1.0]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />

            {/* Reference Line for Primary Winner */}
            <ReferenceLine
              x={`${result.best_timestamp_sec.toFixed(1)}s`}
              stroke="#a855f7"
              strokeDasharray="3 3"
              opacity={0.7}
            />

            {/* Reference Dot for Best Overall Frame */}
            <ReferenceDot
              x={`${result.best_timestamp_sec.toFixed(1)}s`}
              y={result.cqtr_score}
              r={7}
              fill="#c084fc"
              stroke="#ffffff"
              strokeWidth={2}
            />

            {/* Reference Dots for Next Best 1 & 2 */}
            {nextBest1 && (
              <ReferenceDot
                x={`${nextBest1.timestamp_sec.toFixed(1)}s`}
                y={nextBest1.cqtr_score}
                r={6}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            )}
            {nextBest2 && (
              <ReferenceDot
                x={`${nextBest2.timestamp_sec.toFixed(1)}s`}
                y={nextBest2.cqtr_score}
                r={5}
                fill="#34d399"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            )}

            {/* Main CQTR Score Line */}
            <Line
              type="monotone"
              dataKey="cqtr"
              name="CQTR Score"
              stroke="#a855f7"
              strokeWidth={2.8}
              dot={false}
              activeDot={{ r: 7, fill: '#c084fc', stroke: '#fff' }}
            />

            {/* Predictive Next Best Potential Curve */}
            <Line
              type="monotone"
              dataKey="predictedPotential"
              name="Predictive Potential Envelope"
              stroke="#38bdf8"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 6, fill: '#38bdf8' }}
            />

            {/* Optional Component Lines */}
            {showComponents && (
              <>
                <Line
                  type="monotone"
                  dataKey="sharpness"
                  name="Sharpness (Laplacian)"
                  stroke="#06b6d4"
                  strokeWidth={1.2}
                  dot={false}
                  opacity={0.65}
                />
                <Line
                  type="monotone"
                  dataKey="saliency"
                  name="Saliency (Focus)"
                  stroke="#ec4899"
                  strokeWidth={1.2}
                  dot={false}
                  opacity={0.65}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
        <span>Tip: Click any data point or keyframe card above to inspect that frame in the live preview.</span>
        <span>Algorithm: Temporal MMR + Gaussian kernel interpolation</span>
      </div>
    </section>
  );
};
