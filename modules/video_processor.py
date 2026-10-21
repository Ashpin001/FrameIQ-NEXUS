"""
video_processor.py
Handles video loading, validation, metadata extraction and frame sampling.
This is the first stage of the pipeline: INPUT VIDEO -> VIDEO PREPROCESSING -> FRAME SAMPLING.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import List, Tuple

import cv2
import numpy as np

import config

logger = logging.getLogger(__name__)
logging.basicConfig(level=getattr(logging, config.LOG_LEVEL, logging.INFO))


class VideoProcessingError(Exception):
    """Raised when a video cannot be opened or processed."""
    pass


@dataclass
class VideoMetadata:
    path: str
    fps: float
    frame_count: int
    duration_sec: float
    width: int
    height: int


@dataclass
class SampledFrame:
    """A single sampled frame with its position information."""
    frame: np.ndarray          # BGR image (OpenCV format)
    frame_index: int           # index in the ORIGINAL video
    timestamp_sec: float


def allowed_file(filename: str) -> bool:
    """Check the uploaded filename has an allowed video extension."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in config.ALLOWED_EXTENSIONS


def get_video_metadata(video_path: str) -> VideoMetadata:
    """
    Open the video with OpenCV and extract basic metadata.
    Raises VideoProcessingError if the file cannot be opened or is empty.
    """
    if not os.path.exists(video_path):
        raise VideoProcessingError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoProcessingError(f"OpenCV could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    if fps <= 0 or np.isnan(fps):
        # Some containers report broken FPS; fall back to a safe default
        # rather than crashing, but log it clearly.
        logger.warning("FPS could not be reliably read for %s; defaulting to 25.0", video_path)
        fps = 25.0

    if frame_count <= 0:
        raise VideoProcessingError(f"Video appears to have zero frames: {video_path}")

    duration_sec = frame_count / fps

    logger.info(
        "Video metadata: %s | fps=%.2f frames=%d duration=%.2fs resolution=%dx%d",
        video_path, fps, frame_count, duration_sec, width, height,
    )

    return VideoMetadata(
        path=video_path,
        fps=fps,
        frame_count=frame_count,
        duration_sec=duration_sec,
        width=width,
        height=height,
    )


def sample_frames(
    video_path: str,
    metadata: VideoMetadata,
    sample_fps: float = config.SAMPLE_FPS,
) -> List[SampledFrame]:
    """
    Sample frames from the video at approximately `sample_fps` frames per
    second (not the full native FPS) to keep shot-detection lightweight.

    Returns a list of SampledFrame in chronological order.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoProcessingError(f"OpenCV could not open video for sampling: {video_path}")

    # Number of native frames to skip between samples.
    step = max(1, int(round(metadata.fps / sample_fps)))

    sampled: List[SampledFrame] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % step == 0:
            timestamp = frame_idx / metadata.fps
            sampled.append(SampledFrame(frame=frame, frame_index=frame_idx, timestamp_sec=timestamp))

        frame_idx += 1

    cap.release()

    if not sampled:
        raise VideoProcessingError("No frames could be sampled from the video.")

    logger.info("Sampled %d frames (step=%d, target_sample_fps=%.1f) from %d native frames",
                len(sampled), step, sample_fps, metadata.frame_count)

    return sampled


def get_frame_at_index(video_path: str, frame_index: int) -> np.ndarray:
    """Retrieve a single full-resolution frame at an exact native frame index."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoProcessingError(f"OpenCV could not open video: {video_path}")

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise VideoProcessingError(f"Could not read frame at index {frame_index}")

    return frame


def save_frame_as_image(frame: np.ndarray, out_path: str) -> str:
    """Save a BGR frame (numpy array) to disk as an image. Returns the path."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    success = cv2.imwrite(out_path, frame)
    if not success:
        raise VideoProcessingError(f"Failed to write image to {out_path}")
    return out_path
