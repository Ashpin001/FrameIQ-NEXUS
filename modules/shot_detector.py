"""
shot_detector.py
Lightweight shot boundary detection using grayscale frame-difference
statistics with an adaptive threshold (mean + k * std), as described
in Section 7 of the project spec.

This intentionally avoids a single hard-coded difference threshold:
the threshold is derived per-video from the distribution of frame
differences, so it adapts to different lighting/content styles.
"""

import logging
from dataclasses import dataclass
from typing import List

import cv2
import numpy as np

import config
from modules.video_processor import SampledFrame

logger = logging.getLogger(__name__)


@dataclass
class Shot:
    shot_id: int
    start_frame_index: int      # native video frame index
    end_frame_index: int        # native video frame index
    start_timestamp: float
    end_timestamp: float
    sampled_frames: List[SampledFrame]  # sampled frames belonging to this shot


def _frame_difference_score(prev_gray: np.ndarray, curr_gray: np.ndarray) -> float:
    """
    Compute a difference score between two grayscale frames.
    Uses mean absolute pixel difference combined with histogram
    difference for robustness to both structural and illumination changes.
    """
    # Structural difference: mean absolute pixel-wise difference (0-255 scale)
    pixel_diff = float(np.mean(cv2.absdiff(prev_gray, curr_gray)))

    # Histogram difference: correlation-based (1 = identical, 0 = very different)
    hist_prev = cv2.calcHist([prev_gray], [0], None, [64], [0, 256])
    hist_curr = cv2.calcHist([curr_gray], [0], None, [64], [0, 256])
    cv2.normalize(hist_prev, hist_prev)
    cv2.normalize(hist_curr, hist_curr)
    hist_corr = cv2.compareHist(hist_prev, hist_curr, cv2.HISTCMP_CORREL)
    hist_diff = (1.0 - max(min(hist_corr, 1.0), -1.0)) * 100.0  # scale to be comparable to pixel_diff

    # Weighted combination: structural difference is the primary signal,
    # histogram difference helps catch gradual/illumination-driven transitions.
    combined = 0.7 * pixel_diff + 0.3 * hist_diff
    return combined


def compute_difference_scores(sampled_frames: List[SampledFrame]) -> List[float]:
    """Compute frame-to-frame difference scores for consecutive sampled frames."""
    grays = [cv2.cvtColor(sf.frame, cv2.COLOR_BGR2GRAY) for sf in sampled_frames]
    scores = []
    for i in range(1, len(grays)):
        scores.append(_frame_difference_score(grays[i - 1], grays[i]))
    return scores


def detect_shot_boundaries(
    sampled_frames: List[SampledFrame],
    k_sigma: float = config.SHOT_BOUNDARY_K_SIGMA,
    min_shot_length: int = config.MIN_SHOT_LENGTH_FRAMES,
) -> List[Shot]:
    """
    Detect shot boundaries and segment the sampled frames into shots.

    Adaptive threshold: T = mean(diff_scores) + k_sigma * std(diff_scores)
    A boundary is declared between sampled_frames[i-1] and sampled_frames[i]
    whenever the difference score exceeds T, provided the resulting shot
    would be at least `min_shot_length` sampled frames long (to avoid
    over-segmentation from noise/flicker).
    """
    if len(sampled_frames) < 2:
        # Trivial single-shot video
        sf = sampled_frames[0]
        return [Shot(
            shot_id=0,
            start_frame_index=sf.frame_index,
            end_frame_index=sf.frame_index,
            start_timestamp=sf.timestamp_sec,
            end_timestamp=sf.timestamp_sec,
            sampled_frames=sampled_frames,
        )]

    diff_scores = compute_difference_scores(sampled_frames)
    mean_diff = float(np.mean(diff_scores))
    std_diff = float(np.std(diff_scores))
    threshold = mean_diff + k_sigma * std_diff

    logger.info("Shot boundary threshold: mean=%.3f std=%.3f k=%.2f -> T=%.3f",
                mean_diff, std_diff, k_sigma, threshold)

    boundary_indices = []  # index i means boundary BETWEEN frame i-1 and i
    last_boundary = 0
    for i, score in enumerate(diff_scores, start=1):
        if score > threshold and (i - last_boundary) >= min_shot_length:
            boundary_indices.append(i)
            last_boundary = i

    # Build shots from boundaries
    shots: List[Shot] = []
    boundaries = [0] + boundary_indices + [len(sampled_frames)]
    for shot_id, (start, end) in enumerate(zip(boundaries[:-1], boundaries[1:])):
        shot_frames = sampled_frames[start:end]
        if not shot_frames:
            continue
        shots.append(Shot(
            shot_id=shot_id,
            start_frame_index=shot_frames[0].frame_index,
            end_frame_index=shot_frames[-1].frame_index,
            start_timestamp=shot_frames[0].timestamp_sec,
            end_timestamp=shot_frames[-1].timestamp_sec,
            sampled_frames=shot_frames,
        ))

    logger.info("Detected %d shot(s) from %d sampled frames", len(shots), len(sampled_frames))
    return shots
