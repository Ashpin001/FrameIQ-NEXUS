"""
scene_representativeness.py
Measures how representative a candidate frame is of its parent shot
(Section 11 of the spec). A candidate that looks similar to the "average"
visual character of its shot scores highly; an outlier (motion blur,
odd lighting flicker, near-transition frame) scores lower.

Technique: color-histogram similarity between the candidate and every
other sampled frame in the same shot, averaged. This is simple,
explainable, and requires no additional model.
"""

import logging
from typing import List

import cv2
import numpy as np

from modules.shot_detector import Shot

logger = logging.getLogger(__name__)


def _color_histogram(frame: np.ndarray) -> np.ndarray:
    """3D color histogram in HSV space (robust to minor lighting shifts)."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return hist


def compute_scene_representativeness(candidate_frame: np.ndarray, shot: Shot) -> float:
    """
    Average histogram correlation between `candidate_frame` and every
    sampled frame belonging to `shot`. Returns a value in [0, 1]
    (correlation is in [-1, 1]; we clip negatives to 0 since a negative
    correlation has no meaningful "representativeness").
    """
    if not shot.sampled_frames:
        return 0.5  # neutral fallback; should not normally happen

    candidate_hist = _color_histogram(candidate_frame)

    correlations: List[float] = []
    for sf in shot.sampled_frames:
        other_hist = _color_histogram(sf.frame)
        corr = cv2.compareHist(candidate_hist, other_hist, cv2.HISTCMP_CORREL)
        correlations.append(corr)

    mean_corr = float(np.mean(correlations))
    return float(np.clip(mean_corr, 0.0, 1.0))
