import { VideoRecord, ProcessingResultRecord, EvaluationRecord } from '../types';
import { generateProceduralSampleFrames, processCQTR } from './cqtrPipeline';

const VIDEOS_KEY = 'frameiq_videos';
const RESULTS_KEY = 'frameiq_results';
const EVAL_KEY = 'frameiq_evaluations';

export function getStoredVideos(): VideoRecord[] {
  try {
    const raw = localStorage.getItem(VIDEOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVideo(video: VideoRecord): void {
  const list = getStoredVideos();
  list.unshift(video);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(list));
}

export function getVideoById(id: number): VideoRecord | undefined {
  return getStoredVideos().find((v) => v.id === id);
}

export function getStoredResults(): ProcessingResultRecord[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProcessingResult(result: ProcessingResultRecord): void {
  const list = getStoredResults();
  const existingIdx = list.findIndex((r) => r.id === result.id);
  if (existingIdx >= 0) {
    list[existingIdx] = result;
  } else {
    list.unshift(result);
  }
  localStorage.setItem(RESULTS_KEY, JSON.stringify(list));
}

export function getResultById(id: number): ProcessingResultRecord | undefined {
  return getStoredResults().find((r) => r.id === id);
}

export function getResultByVideoId(videoId: number): ProcessingResultRecord | undefined {
  return getStoredResults().find((r) => r.video_id === videoId);
}

export function getStoredEvaluations(): EvaluationRecord[] {
  try {
    const raw = localStorage.getItem(EVAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEvaluation(evalRecord: EvaluationRecord): void {
  const list = getStoredEvaluations();
  list.push(evalRecord);
  localStorage.setItem(EVAL_KEY, JSON.stringify(list));
}

// Initialize seed data if storage is empty
export function initializeSampleDataIfEmpty(): {
  sampleVideo: VideoRecord;
  sampleResult: ProcessingResultRecord;
} {
  const existingVideos = getStoredVideos();
  const existingResults = getStoredResults();

  if (existingVideos.length > 0 && existingResults.length > 0) {
    return {
      sampleVideo: existingVideos[0],
      sampleResult: existingResults[0],
    };
  }

  const sampleVideo: VideoRecord = {
    id: 101,
    filename: 'ai_studio_spatial_demo.mp4',
    duration_sec: 9.5,
    fps: 30,
    frame_count: 285,
    width: 1280,
    height: 720,
    upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    isSample: true,
  };

  const frames = generateProceduralSampleFrames();
  const sampleResult = processCQTR(sampleVideo, frames, performance.now() - 1400);
  sampleResult.id = 201;
  sampleResult.video_id = sampleVideo.id;

  saveVideo(sampleVideo);
  saveProcessingResult(sampleResult);

  return { sampleVideo, sampleResult };
}
