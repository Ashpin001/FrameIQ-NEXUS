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
  topic?: string;
}

export interface SampledFrame {
  frame_index: number;
  timestamp_sec: number;
  dataUrl: string;
  grayData: Uint8ClampedArray;
  width: number;
  height: number;
  colorData?: Uint8ClampedArray;
}

export interface Shot {
  shot_id: number;
  start_frame_index: number;
  end_frame_index: number;
  start_timestamp: number;
  end_timestamp: number;
  sampled_frames: SampledFrame[];
  transition_type?: 'hard_cut' | 'gradual_dissolve' | 'stable';
}

export interface FaceAnalysisResult {
  has_face: boolean;
  face_score: number;
  face_area_ratio: number;
  center_offset: number;
  eye_sharpness: number;
  expression_heuristic: number;
  is_blurred: boolean;
  is_cropped: boolean;
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
  // FrameIQ NEXUS 2.0 Enhanced Fields
  semantic_score?: number;
  face_score?: number;
  has_face?: boolean;
  face_details?: FaceAnalysisResult;
  e_cqtr_score?: number;
  diversity_score?: number;
  diversity_contribution?: number;
  selection_reason?: string;
  rank?: number;
  image_path: string;
  dataUrl: string;
  url?: string;
  quality_score?: number;
  novelty_score?: number;
}

export interface BaselineResult {
  method_name: string;
  frame_index: number;
  timestamp_sec: number;
  score: number;
  processing_time_sec: number;
  image_path: string;
  dataUrl: string;
  visual_quality?: number;
  content_relevance?: number;
  semantic_similarity?: number;
  diversity?: number;
  reduction_ratio?: number;
  precision_at_5?: number;
  selection_rule?: string;
}

export interface MethodComparisonMetric {
  method_name: 'Middle Frame' | 'Random Selection' | 'Sharpness Only' | 'Proposed CQTR' | 'Enhanced CQTR + MMR';
  selection_rule: string;
  frame_index: number;
  timestamp_sec: number;
  processing_time_sec: number;
  visual_quality: number; // Normalized [0, 1]
  content_relevance: number; // Normalized [0, 1]
  semantic_similarity: number; // Normalized [0, 1]
  diversity_score: number; // Normalized [0, 1]
  candidate_reduction_ratio: number; // e.g. 94.5%
  precision_at_5: number; // Normalized [0, 1]
  dataUrl: string;
  evaluator_ratings: {
    evaluator_1: number; // 1-5
    evaluator_2: number; // 1-5
    evaluator_3: number; // 1-5
    mean_score: number; // 1-5
  };
}

export interface AblationResult {
  config_name: string;
  best_frame_index: number;
  best_timestamp_sec: number;
  best_score: number;
  removed_component?: string;
  quality_delta?: number;
  diversity_delta?: number;
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
  semantic_score?: number;
  face_score?: number;
  e_cqtr_score?: number;
  image_path: string;
  dataUrl: string;
  alternatives: ScoredCandidate[];
  top5_recommendations?: ScoredCandidate[];
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
  method_comparisons?: MethodComparisonMetric[];
  processing_time_sec: number;
  clip_topic?: string;
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

export interface BatchQueueItem {
  id: string;
  file?: File;
  videoRecord: VideoRecord;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  progressPercent: number;
  currentStageText: string;
  result?: ProcessingResultRecord;
  error?: string;
}
