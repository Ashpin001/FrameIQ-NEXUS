import React, { useEffect, useState } from 'react';
import { VideoRecord, ProcessingResultRecord } from '../types';
import {
  sampleFramesFromVideo,
  generateProceduralSampleFrames,
  processCQTR,
} from '../utils/cqtrPipeline';
import { saveProcessingResult } from '../utils/storage';

interface ProcessingPageProps {
  video: VideoRecord;
  videoElement?: HTMLVideoElement;
  onComplete: (result: ProcessingResultRecord) => void;
  onError: (err: string) => void;
}

const STAGES = [
  'Video preprocessing',
  'Frame sampling',
  'Shot boundary detection',
  'Keyframe extraction',
  'Visual quality analysis',
  'Content analysis',
  'Scene representativeness',
  'Multi-factor ranking',
];

export const ProcessingPage: React.FC<ProcessingPageProps> = ({
  video,
  videoElement,
  onComplete,
  onError,
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(10);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function runPipeline() {
      const startTime = performance.now();

      try {
        // Stage 0: Video preprocessing
        setCurrentStage(0);
        setProgressPercent(15);
        await new Promise((r) => setTimeout(r, 400));
        if (isCancelled) return;

        // Stage 1: Frame sampling
        setCurrentStage(1);
        setProgressPercent(30);

        let sampledFrames;
        if (video.isSample || !videoElement) {
          sampledFrames = generateProceduralSampleFrames();
        } else {
          sampledFrames = await sampleFramesFromVideo(videoElement, 3, (pct) => {
            if (!isCancelled) {
              setProgressPercent(30 + Math.floor(pct * 0.2));
            }
          });
        }
        if (isCancelled) return;

        // Stage 2: Shot boundary detection
        setCurrentStage(2);
        setProgressPercent(55);
        await new Promise((r) => setTimeout(r, 350));
        if (isCancelled) return;

        // Stage 3: Keyframe extraction
        setCurrentStage(3);
        setProgressPercent(65);
        await new Promise((r) => setTimeout(r, 350));
        if (isCancelled) return;

        // Stage 4: Visual quality analysis
        setCurrentStage(4);
        setProgressPercent(75);
        await new Promise((r) => setTimeout(r, 350));
        if (isCancelled) return;

        // Stage 5: Content analysis
        setCurrentStage(5);
        setProgressPercent(85);
        await new Promise((r) => setTimeout(r, 350));
        if (isCancelled) return;

        // Stage 6: Scene representativeness
        setCurrentStage(6);
        setProgressPercent(92);
        await new Promise((r) => setTimeout(r, 300));
        if (isCancelled) return;

        // Stage 7: Multi-factor ranking
        setCurrentStage(7);
        setProgressPercent(98);

        const resultRecord = processCQTR(video, sampledFrames, startTime);
        saveProcessingResult(resultRecord);

        setProgressPercent(100);
        await new Promise((r) => setTimeout(r, 450));
        if (!isCancelled) {
          onComplete(resultRecord);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const msg = err?.message || 'Processing failed';
          setErrorText(msg);
          onError(msg);
        }
      }
    }

    runPipeline();

    return () => {
      isCancelled = true;
    };
  }, [video, videoElement, onComplete, onError]);

  return (
    <div>
      <div className="page-heading">
        <div className="eyebrow">AI ANALYSIS IN PROGRESS</div>
        <h1>
          Finding your best frame<span className="purple">.</span>
        </h1>
        <p>{video.filename}</p>
      </div>

      <section className="panel processing-panel">
        <div className="loader-ring">✧</div>
        <h2>Analyzing your video</h2>
        <p>
          Shot detection, candidate extraction, quality ranking, and research
          comparisons are running.
        </p>

        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <ul className="stage-list" id="stage-list">
          {STAGES.map((stage, idx) => {
            const isDone = idx < currentStage;
            const isActive = idx === currentStage;
            return (
              <li
                key={stage}
                className={isDone ? 'done' : isActive ? 'active' : ''}
              >
                <span className="dot"></span>
                {stage}
              </li>
            );
          })}
        </ul>

        {errorText && (
          <div className="error-msg" style={{ display: 'block' }}>
            Processing failed: {errorText}
          </div>
        )}
      </section>
    </div>
  );
};
