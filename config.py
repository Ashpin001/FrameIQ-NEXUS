"""
config.py
Central configuration for the Intelligent Video Thumbnail Generator.
All tunable parameters live here so experiments are reproducible and
nothing is hard-coded deep inside the modules.
"""

import os

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
CANDIDATES_DIR = os.path.join(BASE_DIR, "candidates")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
EVALUATION_DIR = os.path.join(BASE_DIR, "evaluation")
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
DATABASE_PATH = os.path.join(BASE_DIR, "app_data.db")

for _d in (UPLOAD_DIR, OUTPUT_DIR, CANDIDATES_DIR, RESULTS_DIR, EVALUATION_DIR, DATASET_DIR):
    os.makedirs(_d, exist_ok=True)

# ---------------------------------------------------------------------------
# Upload / security
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm"}
MAX_CONTENT_LENGTH_MB = 200
MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH_MB * 1024 * 1024

# ---------------------------------------------------------------------------
# Frame sampling
# ---------------------------------------------------------------------------
# How many frames per second to sample for shot-boundary analysis.
# Full FPS is unnecessary and expensive; 2-4 samples/sec is enough to
# catch cuts without missing very short shots.
SAMPLE_FPS = 3

# Minimum shot length (in sampled-frame units) to avoid over-segmentation
# from noise / camera flashes.
MIN_SHOT_LENGTH_FRAMES = 3

# Shot boundary adaptive threshold: threshold = mean + K_SIGMA * std
SHOT_BOUNDARY_K_SIGMA = 2.5

# ---------------------------------------------------------------------------
# Key frame candidate extraction
# ---------------------------------------------------------------------------
# Max candidate frames sampled per shot before quality filtering.
MAX_CANDIDATES_PER_SHOT = 6

# Final number of candidates kept per shot after preliminary quality +
# de-duplication filtering.
MAX_KEPT_CANDIDATES_PER_SHOT = 3

# Histogram correlation above this value => frames considered near-duplicate.
DUPLICATE_HIST_CORR_THRESHOLD = 0.97

# ---------------------------------------------------------------------------
# CQTR scoring weights (Section 6 of the master spec)
# NOTE: these are a reasonable *starting* scheme, not claimed to be
# scientifically optimal. They are meant to be varied during experiments
# (see research/ablation_study.md).
# ---------------------------------------------------------------------------
CQTR_WEIGHTS = {
    "sharpness": 0.20,
    "brightness": 0.10,
    "contrast": 0.10,
    "color": 0.10,
    "scene_representativeness": 0.20,
    "content_importance": 0.25,
    "redundancy_penalty": 0.05,
}

# Brightness "ideal" band (0-255 mean luminance). Frames outside this
# band are penalized increasingly the further they are from the band.
BRIGHTNESS_IDEAL_LOW = 60
BRIGHTNESS_IDEAL_HIGH = 200

# Face detection cascade (OpenCV built-in, no external download required)
HAAR_FACE_CASCADE = "haarcascade_frontalface_default.xml"
FACE_SCORE_BONUS = 0.15  # additive bonus to content-importance if a clear face is found

# ---------------------------------------------------------------------------
# Top-N candidates shown on results page
# ---------------------------------------------------------------------------
TOP_N_ALTERNATIVES = 5

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = "INFO"
