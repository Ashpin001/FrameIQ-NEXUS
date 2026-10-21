"""
frame_quality.py
Visual quality analysis (Section 9 of the spec):
  - Sharpness (Laplacian variance)
  - Brightness (mean luminance, penalizing too-dark/too-bright frames)
  - Contrast (standard deviation of luminance)
  - Color quality (saturation-based)
  - Blur penalty (derived from sharpness)

All outputs are normalized to [0, 1] so they can be combined linearly
in the CQTR formula.
"""

import logging
from dataclasses import dataclass

import cv2
import numpy as np

import config

logger = logging.getLogger(__name__)


@dataclass
class QualityScores:
    sharpness: float
    brightness: float
    contrast: float
    color: float
    blur_penalty: float  # 0 = no blur penalty, 1 = maximally blurred


def _normalize(value: float, low: float, high: float) -> float:
    """Clamp and linearly rescale `value` from [low, high] to [0, 1]."""
    if high <= low:
        return 0.0
    return float(np.clip((value - low) / (high - low), 0.0, 1.0))


def compute_sharpness(frame: np.ndarray) -> float:
    """
    Sharpness via Laplacian variance. Higher variance = sharper edges.
    Raw values are unbounded, so we normalize against an empirically
    reasonable range (0 - 500) for typical natural video frames; values
    above 500 are treated as maximally sharp.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return _normalize(variance, 0, 500)


def compute_brightness(frame: np.ndarray) -> float:
    """
    Mean luminance, penalized outside the ideal band
    [BRIGHTNESS_IDEAL_LOW, BRIGHTNESS_IDEAL_HIGH]. Frames inside the band
    score 1.0; the score falls off linearly outside it.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mean_lum = float(np.mean(gray))

    low, high = config.BRIGHTNESS_IDEAL_LOW, config.BRIGHTNESS_IDEAL_HIGH
    if low <= mean_lum <= high:
        return 1.0
    if mean_lum < low:
        # falls to 0 as mean_lum approaches 0
        return _normalize(mean_lum, 0, low)
    # mean_lum > high: falls to 0 as mean_lum approaches 255
    return _normalize(255 - mean_lum, 0, 255 - high)


def compute_contrast(frame: np.ndarray) -> float:
    """Contrast via standard deviation of luminance, normalized to [0,1]."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    std = float(np.std(gray))
    # Typical useful contrast std range for natural images: ~0 - 80
    return _normalize(std, 0, 80)


def compute_color_quality(frame: np.ndarray) -> float:
    """
    Color quality via mean saturation in HSV space, penalizing washed-out
    (very low saturation) frames. Extremely oversaturated frames are also
    slightly penalized as they are often compression artifacts.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1].astype(np.float32)
    mean_sat = float(np.mean(saturation))  # 0-255

    # Ideal saturation band: moderate saturation reads as "vivid but natural"
    ideal_low, ideal_high = 40, 200
    if ideal_low <= mean_sat <= ideal_high:
        return 1.0
    if mean_sat < ideal_low:
        return _normalize(mean_sat, 0, ideal_low)
    return _normalize(255 - mean_sat, 0, 255 - ideal_high)


def compute_blur_penalty(sharpness_score: float) -> float:
    """
    Blur penalty is the inverse of the normalized sharpness score:
    a very sharp frame (sharpness_score ~1) has ~0 blur penalty.
    """
    return float(np.clip(1.0 - sharpness_score, 0.0, 1.0))


def analyze_frame_quality(frame: np.ndarray) -> QualityScores:
    """Compute the full set of visual-quality scores for a single frame."""
    sharpness = compute_sharpness(frame)
    brightness = compute_brightness(frame)
    contrast = compute_contrast(frame)
    color = compute_color_quality(frame)
    blur_penalty = compute_blur_penalty(sharpness)

    return QualityScores(
        sharpness=sharpness,
        brightness=brightness,
        contrast=contrast,
        color=color,
        blur_penalty=blur_penalty,
    )
