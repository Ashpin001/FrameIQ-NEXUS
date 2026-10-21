"""
content_analyzer.py
Lightweight content-importance analysis (Section 10 of the spec):
  - Edge density (visual complexity / subject boundaries)
  - Saliency (OpenCV's spectral-residual saliency, explainable & fast)
  - Central-region prominence (rule-of-thumb: important subjects are
    often centrally composed)
  - Optional face detection bonus (Haar Cascade, built into OpenCV)

IMPORTANT: face presence only ADDS a bonus on top of the content score;
it never overrides visual quality. A blurry/poorly-exposed face-containing
frame can still score low overall because quality is scored separately.
"""

import logging
from dataclasses import dataclass

import cv2
import numpy as np

import config

logger = logging.getLogger(__name__)

_face_cascade = None


def _get_face_cascade():
    """Lazily load the Haar cascade (ships with opencv-python)."""
    global _face_cascade
    if _face_cascade is None:
        cascade_path = cv2.data.haarcascades + config.HAAR_FACE_CASCADE
        _face_cascade = cv2.CascadeClassifier(cascade_path)
        if _face_cascade.empty():
            logger.warning("Could not load Haar cascade at %s; face detection disabled.", cascade_path)
    return _face_cascade


@dataclass
class ContentScores:
    edge_density: float
    saliency: float
    centrality: float
    face_bonus: float
    content_importance: float  # combined, normalized [0,1]


def _normalize(value: float, low: float, high: float) -> float:
    if high <= low:
        return 0.0
    return float(np.clip((value - low) / (high - low), 0.0, 1.0))


def compute_edge_density(frame: np.ndarray) -> float:
    """Fraction of pixels detected as edges via Canny, normalized."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    density = float(np.mean(edges > 0))  # already in [0,1]
    # Typical useful range for "meaningful complexity" without being noise: 0 - 0.25
    return _normalize(density, 0.0, 0.25)


def compute_saliency(frame: np.ndarray) -> float:
    """
    Spectral-residual saliency (fast, explainable, no training required).
    Returns mean saliency map activation, normalized to [0,1].
    """
    try:
        saliency_algo = cv2.saliency.StaticSaliencySpectralResidual_create()
        success, saliency_map = saliency_algo.computeSaliency(frame)
        if not success:
            return 0.5  # neutral fallback
        return float(np.clip(np.mean(saliency_map), 0.0, 1.0))
    except AttributeError:
        # cv2.saliency module not available in this OpenCV build (requires
        # opencv-contrib-python). Fall back to a simple gradient-magnitude
        # proxy for saliency so the pipeline still runs end-to-end.
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1)
        magnitude = np.sqrt(gx ** 2 + gy ** 2)
        mean_mag = float(np.mean(magnitude))
        return _normalize(mean_mag, 0, 60)


def compute_centrality(frame: np.ndarray) -> float:
    """
    Central-region prominence: compares edge density in the central
    region of the frame vs. the full frame. A higher ratio suggests the
    visually important content is centrally composed (a common heuristic
    for "the subject is here", not a semantic guarantee).
    """
    h, w = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)

    full_density = float(np.mean(edges > 0)) + 1e-6

    cy0, cy1 = int(h * 0.25), int(h * 0.75)
    cx0, cx1 = int(w * 0.25), int(w * 0.75)
    center_region = edges[cy0:cy1, cx0:cx1]
    center_density = float(np.mean(center_region > 0))

    ratio = center_density / full_density
    # ratio ~1 means center is as busy as the whole frame's average;
    # ratio > 1 means center is busier (more central subject prominence).
    return _normalize(ratio, 0.5, 2.0)


def detect_face_bonus(frame: np.ndarray) -> float:
    """
    Returns FACE_SCORE_BONUS if a reasonably clear face is detected,
    else 0.0. Uses a conservative minSize/minNeighbors to avoid false
    positives on noisy or low-quality frames.
    """
    cascade = _get_face_cascade()
    if cascade is None or cascade.empty():
        return 0.0

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]
    min_size = max(20, int(min(h, w) * 0.08))

    faces = cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=6, minSize=(min_size, min_size)
    )
    if len(faces) > 0:
        return config.FACE_SCORE_BONUS
    return 0.0


def analyze_content(frame: np.ndarray) -> ContentScores:
    """Compute the full content-importance score for a single frame."""
    edge_density = compute_edge_density(frame)
    saliency = compute_saliency(frame)
    centrality = compute_centrality(frame)
    face_bonus = detect_face_bonus(frame)

    # Combine sub-scores (equal-ish internal weighting), then add the
    # face bonus, capped at 1.0. Face presence never dominates the
    # score on its own -- it only nudges an already-decent frame up.
    base = 0.4 * edge_density + 0.35 * saliency + 0.25 * centrality
    content_importance = float(np.clip(base + face_bonus, 0.0, 1.0))

    return ContentScores(
        edge_density=edge_density,
        saliency=saliency,
        centrality=centrality,
        face_bonus=face_bonus,
        content_importance=content_importance,
    )
