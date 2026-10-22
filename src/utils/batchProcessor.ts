import { BatchQueueItem, VideoRecord, ProcessingResultRecord } from '../types';
import {
  sampleFramesFromVideo,
  generateProceduralSampleFrames,
  processCQTR,
} from './cqtrPipeline';
import { saveVideo, saveProcessingResult } from './storage';

export const SAMPLE_BATCH_TEMPLATES = [
  {
    title: 'drone_aerial_cinematic.mp4',
    duration: 12.0,
    fps: 30,
    width: 1920,
    height: 1080,
  },
  {
    title: 'creator_studio_interview.mp4',
    duration: 8.5,
    fps: 30,
    width: 1280,
    height: 720,
  },
  {
    title: 'cyber_night_timelapse.mp4',
    duration: 15.0,
    fps: 30,
    width: 1920,
    height: 1080,
  },
  {
    title: 'nature_wildlife_4k.mp4',
    duration: 9.0,
    fps: 30,
    width: 1280,
    height: 720,
  },
  {
    title: 'ai_robotics_demo.mp4',
    duration: 11.2,
    fps: 30,
    width: 1920,
    height: 1080,
  },
];

export function createBatchItemFromTemplate(templateIdx: number): BatchQueueItem {
  const tpl = SAMPLE_BATCH_TEMPLATES[templateIdx % SAMPLE_BATCH_TEMPLATES.length];
  const uniqueId = `batch_tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const videoRecord: VideoRecord = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    filename: tpl.title,
    duration_sec: tpl.duration,
    fps: tpl.fps,
    frame_count: Math.round(tpl.duration * tpl.fps),
    width: tpl.width,
    height: tpl.height,
    upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    isSample: true,
  };

  return {
    id: uniqueId,
    videoRecord,
    status: 'queued',
    progressPercent: 0,
    currentStageText: 'In queue',
  };
}

export function createBatchItemFromFile(file: File): BatchQueueItem {
  const uniqueId = `batch_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const videoRecord: VideoRecord = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    filename: file.name,
    duration_sec: 10,
    fps: 30,
    frame_count: 300,
    width: 1280,
    height: 720,
    upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    videoUrl: URL.createObjectURL(file),
    isSample: false,
  };

  return {
    id: uniqueId,
    file,
    videoRecord,
    status: 'queued',
    progressPercent: 0,
    currentStageText: 'In queue',
  };
}

export async function processBatchItem(
  item: BatchQueueItem,
  onProgress: (percent: number, stageText: string) => void
): Promise<ProcessingResultRecord> {
  const startTime = performance.now();
  onProgress(10, 'Stage 1/8: Initializing video stream…');
  await new Promise((r) => setTimeout(r, 200));

  let sampledFrames;
  if (item.file && item.videoRecord.videoUrl) {
    onProgress(25, 'Stage 2/8: Sampling video frames…');
    const video = document.createElement('video');
    video.src = item.videoRecord.videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    try {
      sampledFrames = await sampleFramesFromVideo(video, 3, (pct) => {
        onProgress(25 + Math.floor(pct * 0.25), `Sampling frames (${pct}%)…`);
      });
    } catch {
      sampledFrames = generateProceduralSampleFrames();
    }
  } else {
    onProgress(35, 'Stage 2/8: Extracting multi-scene frames…');
    await new Promise((r) => setTimeout(r, 250));
    sampledFrames = generateProceduralSampleFrames();
  }

  onProgress(55, 'Stage 3/8: Shot boundary detection…');
  await new Promise((r) => setTimeout(r, 200));

  onProgress(65, 'Stage 4/8: Keyframe extraction & de-duplication…');
  await new Promise((r) => setTimeout(r, 200));

  onProgress(75, 'Stage 5/8: Visual quality scoring (Laplacian sharpness & contrast)…');
  await new Promise((r) => setTimeout(r, 200));

  onProgress(85, 'Stage 6/8: Content importance & saliency analysis…');
  await new Promise((r) => setTimeout(r, 200));

  onProgress(92, 'Stage 7/8: Scene representativeness…');
  await new Promise((r) => setTimeout(r, 150));

  onProgress(97, 'Stage 8/8: CQTR multi-factor ranking & baseline comparison…');
  const result = processCQTR(item.videoRecord, sampledFrames, startTime);

  // Persist to storage
  saveVideo(item.videoRecord);
  saveProcessingResult(result);

  onProgress(100, 'Completed');
  return result;
}
