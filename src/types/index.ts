export interface VideoRecord {
  id: number;
  filename: string;
  duration_sec: number;
  fps: number;
  frame_count: number;
  width: number;
  height: number;
  upload_date: string;
  videoUrl?: string;
  isSample?: boolean;
}

export interface SampledFrame {
  frame_index: number;
  timestamp_sec: number;
  dataUrl: string;
  grayData: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Shot {
  shot_id: number;
  start_frame_index: number;
  end_frame_index: number;
  start_timestamp: number;
  end_timestamp: number;
  sampled_frames: SampledFrame[];
}

export interface ScoredCandidate {
  shot_id: number;
  frame_index: number;
  timestamp_sec: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  color: number;
  scene_representativeness: number;
  content_importance: number;
  redundancy_penalty: number;
  cqtr_score: number;
  image_path: string;
  dataUrl: string;
  url?: string;
  quality_score?: number;
  novelty_score?: number;
  diversity_score?: number;
  rank?: number;
}

export interface BaselineResult {
  method_name: string;
  frame_index: number;
  timestamp_sec: number;
  score: number;
  processing_time_sec: number;
  image_path: string;
  dataUrl: string;
}

export interface AblationResult {
  config_name: string;
  best_frame_index: number;
  best_timestamp_sec: number;
  best_score: number;
}

export interface ScoreBreakdown {
  shot_id: number;
  frame_index: number;
  timestamp_sec: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  color: number;
  scene_representativeness: number;
  content_importance: number;
  redundancy_penalty: number;
  cqtr_score: number;
  image_path: string;
  dataUrl: string;
  alternatives: ScoredCandidate[];
  metrics: {
    processing_time_sec: number;
    total_native_frames: number;
    total_candidate_frames: number;
    candidate_reduction_ratio: number;
    note: string;
  };
}

export interface ProcessingResultRecord {
  id: number;
  video_id: number;
  processed_date: string;
  num_shots: number;
  num_candidates: number;
  best_frame_index: number;
  best_timestamp_sec: number;
  cqtr_score: number;
  thumbnail_path: string;
  thumbnail_dataUrl: string;
  score_breakdown: ScoreBreakdown;
  baseline_results: Record<string, BaselineResult>;
  ablation_results: AblationResult[];
  processing_time_sec: number;
}

export interface EvaluationRecord {
  id: number;
  result_id: number;
  evaluator_name: string;
  visual_attractiveness: number;
  representativeness: number;
  sharpness_rating: number;
  content_relevance: number;
  overall_quality: number;
  submitted_date: string;
}
