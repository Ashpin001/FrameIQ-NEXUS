"""
evaluator.py
Ties the pipeline together into one callable, runs the ablation study
(Section 15), and computes the metrics that are actually calculable
without fabricated ground truth (Section 16).

IMPORTANT (Section 36 research rules): this module NEVER fabricates
accuracy/precision/recall numbers. Metrics that require ground truth
(shot-detection P/R/F1, thumbnail-selection accuracy) are only computed
when ground truth is actually supplied; otherwise the corresponding
field is explicitly set to None with a note, rather than invented.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np

from modules.video_processor import get_video_metadata, sample_frames, VideoMetadata
from modules.shot_detector import detect_shot_boundaries, Shot
from modules.keyframe_extractor import extract_all_candidates
from modules.thumbnail_selector import score_candidates, select_best_thumbnail, ScoredCandidate
import config

logger = logging.getLogger(__name__)


@dataclass
class PipelineRunResult:
    metadata: VideoMetadata
    shots: List[Shot]
    num_candidates: int
    scored_candidates: List[ScoredCandidate]
    best_thumbnail: ScoredCandidate
    processing_time_sec: float


def run_full_pipeline(video_path: str, weights: Dict[str, float] = None) -> PipelineRunResult:
    """
    Run the complete CQTR pipeline end-to-end on a video file and return
    every intermediate artifact needed by the dashboard/evaluator.
    """
    weights = weights or config.CQTR_WEIGHTS
    start = time.perf_counter()

    metadata = get_video_metadata(video_path)
    sampled = sample_frames(video_path, metadata)
    shots = detect_shot_boundaries(sampled)
    candidates = extract_all_candidates(shots)
    scored = score_candidates(candidates, shots, weights=weights)
    best = select_best_thumbnail(scored)

    elapsed = time.perf_counter() - start

    logger.info("Full pipeline run complete in %.3fs: %d shots, %d candidates, best cqtr=%.3f",
                elapsed, len(shots), len(candidates), best.cqtr_score)

    return PipelineRunResult(
        metadata=metadata,
        shots=shots,
        num_candidates=len(candidates),
        scored_candidates=scored,
        best_thumbnail=best,
        processing_time_sec=elapsed,
    )


# ---------------------------------------------------------------------------
# Ablation study (Section 15)
# ---------------------------------------------------------------------------

# Each ablation configuration zeroes out weights for the components NOT
# included in that configuration, so the comparison isolates each
# component's marginal contribution to the final ranking/score.
ABLATION_CONFIGS: Dict[str, Dict[str, float]] = {
    "A. Sharpness only": {
        "sharpness": 1.0, "brightness": 0.0, "contrast": 0.0, "color": 0.0,
        "scene_representativeness": 0.0, "content_importance": 0.0, "redundancy_penalty": 0.0,
    },
    "B. Sharpness + Brightness": {
        "sharpness": 0.5, "brightness": 0.5, "contrast": 0.0, "color": 0.0,
        "scene_representativeness": 0.0, "content_importance": 0.0, "redundancy_penalty": 0.0,
    },
    "C. Visual Quality": {
        "sharpness": 0.25, "brightness": 0.25, "contrast": 0.25, "color": 0.25,
        "scene_representativeness": 0.0, "content_importance": 0.0, "redundancy_penalty": 0.0,
    },
    "D. Visual Quality + Scene Representativeness": {
        "sharpness": 0.2, "brightness": 0.2, "contrast": 0.2, "color": 0.2,
        "scene_representativeness": 0.2, "content_importance": 0.0, "redundancy_penalty": 0.0,
    },
    "E. Visual Quality + Content Importance": {
        "sharpness": 0.2, "brightness": 0.2, "contrast": 0.2, "color": 0.2,
        "scene_representativeness": 0.0, "content_importance": 0.2, "redundancy_penalty": 0.0,
    },
    "F. Complete CQTR": dict(config.CQTR_WEIGHTS),
}


@dataclass
class AblationResult:
    config_name: str
    best_frame_index: int
    best_timestamp_sec: float
    best_score: float


def run_ablation_study(video_path: str) -> List[AblationResult]:
    """
    Re-score the SAME candidate set under each ablation weight
    configuration (Section 15) and report which frame each configuration
    would have selected as the thumbnail, and at what score.

    Candidates/shots are only extracted once (expensive step); only the
    scoring/weights change per configuration, which is both correct and
    efficient.
    """
    metadata = get_video_metadata(video_path)
    sampled = sample_frames(video_path, metadata)
    shots = detect_shot_boundaries(sampled)
    candidates = extract_all_candidates(shots)

    results: List[AblationResult] = []
    for config_name, weights in ABLATION_CONFIGS.items():
        scored = score_candidates(candidates, shots, weights=weights)
        best = select_best_thumbnail(scored)
        results.append(AblationResult(
            config_name=config_name,
            best_frame_index=best.frame_index,
            best_timestamp_sec=best.timestamp_sec,
            best_score=best.cqtr_score,
        ))
        logger.info("Ablation '%s': frame=%d score=%.3f", config_name, best.frame_index, best.cqtr_score)

    return results


# ---------------------------------------------------------------------------
# Metrics (Section 16) - only computed when data actually supports them
# ---------------------------------------------------------------------------

@dataclass
class MetricsReport:
    processing_time_sec: float
    total_native_frames: int
    total_candidate_frames: int
    candidate_reduction_ratio: float          # candidates / native frames
    shot_detection_precision: Optional[float] = None
    shot_detection_recall: Optional[float] = None
    shot_detection_f1: Optional[float] = None
    thumbnail_accuracy: Optional[float] = None
    note: str = ""


def compute_metrics(
    run_result: PipelineRunResult,
    ground_truth_shot_boundaries: Optional[List[int]] = None,
    ground_truth_thumbnail_frame: Optional[int] = None,
    tolerance_frames: int = 5,
) -> MetricsReport:
    """
    Compute whichever metrics are actually supported by available data.
    If no ground truth is supplied, the ground-truth-dependent fields are
    left as None with an explicit note -- they are NEVER fabricated.
    """
    total_native = run_result.metadata.frame_count
    total_candidates = run_result.num_candidates
    reduction_ratio = total_candidates / total_native if total_native else 0.0

    report = MetricsReport(
        processing_time_sec=run_result.processing_time_sec,
        total_native_frames=total_native,
        total_candidate_frames=total_candidates,
        candidate_reduction_ratio=reduction_ratio,
        note="Ground-truth-dependent metrics were not computed because no ground truth was supplied.",
    )

    if ground_truth_shot_boundaries is not None:
        detected = sorted(s.start_frame_index for s in run_result.shots[1:])  # exclude the very first "boundary"
        gt = sorted(ground_truth_shot_boundaries)

        matched_gt = set()
        true_positives = 0
        for d in detected:
            for i, g in enumerate(gt):
                if i in matched_gt:
                    continue
                if abs(d - g) <= tolerance_frames:
                    true_positives += 1
                    matched_gt.add(i)
                    break

        precision = true_positives / len(detected) if detected else 0.0
        recall = true_positives / len(gt) if gt else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        report.shot_detection_precision = precision
        report.shot_detection_recall = recall
        report.shot_detection_f1 = f1

    if ground_truth_thumbnail_frame is not None:
        is_correct = abs(run_result.best_thumbnail.frame_index - ground_truth_thumbnail_frame) <= tolerance_frames
        report.thumbnail_accuracy = 1.0 if is_correct else 0.0

    if ground_truth_shot_boundaries is not None or ground_truth_thumbnail_frame is not None:
        report.note = "Metrics computed against supplied ground truth."

    return report
