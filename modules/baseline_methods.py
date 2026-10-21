"""
baseline_methods.py
Real, working implementations of the five baseline thumbnail-selection
strategies (Section 12), each returned in the same shape so they can be
fairly compared against the proposed CQTR method on score/processing time.
"""

import logging
import random
import time
from dataclasses import dataclass
from typing import List, Callable, Dict

import numpy as np

from modules.video_processor import VideoMetadata, SampledFrame, get_frame_at_index
from modules.frame_quality import compute_sharpness, analyze_frame_quality

logger = logging.getLogger(__name__)


@dataclass
class BaselineResult:
    method_name: str
    frame_index: int
    timestamp_sec: float
    score: float             # method-specific score, NOT comparable across baselines numerically
    processing_time_sec: float
    frame: np.ndarray


def _time_it(fn: Callable, *args, **kwargs):
    start = time.perf_counter()
    result = fn(*args, **kwargs)
    elapsed = time.perf_counter() - start
    return result, elapsed


def random_frame_selection(video_path: str, metadata: VideoMetadata, seed: int = None) -> BaselineResult:
    """Baseline 1: pick a uniformly random frame index."""
    def _run():
        rng = random.Random(seed)
        idx = rng.randint(0, metadata.frame_count - 1)
        frame = get_frame_at_index(video_path, idx)
        return idx, frame

    (idx, frame), elapsed = _time_it(_run)
    timestamp = idx / metadata.fps
    return BaselineResult("Random", idx, timestamp, score=0.0, processing_time_sec=elapsed, frame=frame)


def uniform_frame_sampling(video_path: str, metadata: VideoMetadata, n_samples: int = 10) -> BaselineResult:
    """
    Baseline 2: sample N frames evenly across the video and pick the one
    with the best preliminary sharpness (a common simple heuristic used
    by naive "smart" thumbnail pickers).
    """
    def _run():
        idxs = np.linspace(0, metadata.frame_count - 1, n_samples).astype(int)
        best_idx, best_frame, best_score = None, None, -1
        for idx in idxs:
            frame = get_frame_at_index(video_path, int(idx))
            score = compute_sharpness(frame)
            if score > best_score:
                best_idx, best_frame, best_score = int(idx), frame, score
        return best_idx, best_frame, best_score

    (idx, frame, score), elapsed = _time_it(_run)
    timestamp = idx / metadata.fps
    return BaselineResult("Uniform Sampling", idx, timestamp, score, elapsed, frame)


def middle_frame_selection(video_path: str, metadata: VideoMetadata) -> BaselineResult:
    """Baseline 3: always pick the exact middle frame of the video."""
    def _run():
        idx = metadata.frame_count // 2
        frame = get_frame_at_index(video_path, idx)
        return idx, frame

    (idx, frame), elapsed = _time_it(_run)
    timestamp = idx / metadata.fps
    return BaselineResult("Middle Frame", idx, timestamp, score=0.0, processing_time_sec=elapsed, frame=frame)


def sharpness_based_selection(video_path: str, metadata: VideoMetadata, n_samples: int = 20) -> BaselineResult:
    """Baseline 4: sample N frames, pick the single sharpest one (quality-blind otherwise)."""
    def _run():
        idxs = np.linspace(0, metadata.frame_count - 1, n_samples).astype(int)
        best_idx, best_frame, best_score = None, None, -1
        for idx in idxs:
            frame = get_frame_at_index(video_path, int(idx))
            score = compute_sharpness(frame)
            if score > best_score:
                best_idx, best_frame, best_score = int(idx), frame, score
        return best_idx, best_frame, best_score

    (idx, frame, score), elapsed = _time_it(_run)
    timestamp = idx / metadata.fps
    return BaselineResult("Sharpness-Based", idx, timestamp, score, elapsed, frame)


def visual_quality_based_selection(video_path: str, metadata: VideoMetadata, n_samples: int = 20) -> BaselineResult:
    """
    Baseline 5: sample N frames, pick the one with the best combined
    visual-quality score (sharpness+brightness+contrast+color), but with
    NO shot-awareness, content-importance, or scene-representativeness
    (this isolates the value CQTR adds beyond raw visual quality).
    """
    def _run():
        idxs = np.linspace(0, metadata.frame_count - 1, n_samples).astype(int)
        best_idx, best_frame, best_score = None, None, -1
        for idx in idxs:
            frame = get_frame_at_index(video_path, int(idx))
            q = analyze_frame_quality(frame)
            score = 0.25 * (q.sharpness + q.brightness + q.contrast + q.color)
            if score > best_score:
                best_idx, best_frame, best_score = int(idx), frame, score
        return best_idx, best_frame, best_score

    (idx, frame, score), elapsed = _time_it(_run)
    timestamp = idx / metadata.fps
    return BaselineResult("Visual Quality-Based", idx, timestamp, score, elapsed, frame)


def run_all_baselines(video_path: str, metadata: VideoMetadata) -> Dict[str, BaselineResult]:
    """Run all five baselines and return them keyed by method name."""
    results = {
        "Random": random_frame_selection(video_path, metadata),
        "Uniform Sampling": uniform_frame_sampling(video_path, metadata),
        "Middle Frame": middle_frame_selection(video_path, metadata),
        "Sharpness-Based": sharpness_based_selection(video_path, metadata),
        "Visual Quality-Based": visual_quality_based_selection(video_path, metadata),
    }
    for name, r in results.items():
        logger.info("Baseline '%s': frame=%d t=%.2fs time=%.4fs", name, r.frame_index, r.timestamp_sec, r.processing_time_sec)
    return results
