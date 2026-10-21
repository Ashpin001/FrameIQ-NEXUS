"""
keyframe_extractor.py
For each detected shot, selects a small set of candidate key frames:
ignores frames right at shot boundaries (likely transition frames),
samples evenly across the stable middle of the shot, removes
near-duplicate frames via histogram correlation, and keeps the
best-preliminary-sharpness candidates.
"""

import logging
from dataclasses import dataclass
from typing import List

import cv2
import numpy as np

import config
from modules.shot_detector import Shot
from modules.video_processor import SampledFrame

logger = logging.getLogger(__name__)


@dataclass
class Candidate:
    shot_id: int
    frame: np.ndarray
    frame_index: int
    timestamp_sec: float
    preliminary_sharpness: float


def _laplacian_variance(frame: np.ndarray) -> float:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _histogram(frame: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
    cv2.normalize(hist, hist)
    return hist


def _is_near_duplicate(hist_a: np.ndarray, hist_b: np.ndarray,
                        threshold: float = config.DUPLICATE_HIST_CORR_THRESHOLD) -> bool:
    corr = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)
    return corr >= threshold


def _select_stable_frames(shot_frames: List[SampledFrame]) -> List[SampledFrame]:
    """
    Trim frames right at the shot's edges (most likely to be transition
    frames) when the shot is long enough to afford it.
    """
    n = len(shot_frames)
    if n <= 2:
        return shot_frames
    # Trim ~15% from each end, but always keep at least 1 frame.
    trim = max(0, int(n * 0.15))
    trimmed = shot_frames[trim: n - trim] if (n - 2 * trim) >= 1 else shot_frames
    return trimmed if trimmed else shot_frames


def extract_candidates_for_shot(
    shot: Shot,
    max_candidates: int = config.MAX_CANDIDATES_PER_SHOT,
    max_kept: int = config.MAX_KEPT_CANDIDATES_PER_SHOT,
) -> List[Candidate]:
    """
    Extract a small, de-duplicated set of candidate key frames for one shot.
    """
    stable_frames = _select_stable_frames(shot.sampled_frames)

    # Evenly sample up to `max_candidates` frames from the stable region.
    if len(stable_frames) > max_candidates:
        idxs = np.linspace(0, len(stable_frames) - 1, max_candidates).astype(int)
        idxs = sorted(set(idxs.tolist()))
        picked = [stable_frames[i] for i in idxs]
    else:
        picked = stable_frames

    # Compute preliminary sharpness + histogram for de-duplication.
    scored: List[Candidate] = []
    hists = []
    for sf in picked:
        sharpness = _laplacian_variance(sf.frame)
        scored.append(Candidate(
            shot_id=shot.shot_id,
            frame=sf.frame,
            frame_index=sf.frame_index,
            timestamp_sec=sf.timestamp_sec,
            preliminary_sharpness=sharpness,
        ))
        hists.append(_histogram(sf.frame))

    # De-duplicate: greedily keep frames that aren't near-duplicates of
    # an already-kept frame, preferring sharper frames first.
    order = sorted(range(len(scored)), key=lambda i: scored[i].preliminary_sharpness, reverse=True)
    kept_indices: List[int] = []
    for i in order:
        is_dup = any(_is_near_duplicate(hists[i], hists[j]) for j in kept_indices)
        if not is_dup:
            kept_indices.append(i)
        if len(kept_indices) >= max_kept:
            break

    # Fallback: if de-duplication was too aggressive and removed everything
    # (shouldn't normally happen), just keep the single sharpest frame.
    if not kept_indices:
        kept_indices = [order[0]]

    kept = [scored[i] for i in kept_indices]
    # Restore chronological order for readability downstream.
    kept.sort(key=lambda c: c.frame_index)

    logger.info("Shot %d: %d stable frames -> %d picked -> %d kept after dedup",
                shot.shot_id, len(stable_frames), len(picked), len(kept))
    return kept


def extract_all_candidates(shots: List[Shot]) -> List[Candidate]:
    """Extract candidates for every shot and return a flat list."""
    all_candidates: List[Candidate] = []
    for shot in shots:
        all_candidates.extend(extract_candidates_for_shot(shot))
    logger.info("Total candidates extracted across %d shots: %d", len(shots), len(all_candidates))
    return all_candidates
