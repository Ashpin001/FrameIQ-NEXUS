"""
thumbnail_selector.py
Aggregates per-candidate feature scores into the final CQTR score
(Section 6 of the spec) and produces the ranked candidate list.

CQTR(F) = Ws*S + Wb*B + Wc*C + Wcol*Col + Wsr*SR + Wci*CI - Wr*R

All feature scores are already normalized to [0,1] by the upstream
modules. The redundancy penalty R(F) is computed here, since it
requires comparing each candidate against the OTHER candidates
(cross-shot), not just within a single frame or shot.
"""

import logging
from dataclasses import dataclass, asdict
from typing import List, Dict

import cv2
import numpy as np

import config
from modules.keyframe_extractor import Candidate
from modules.shot_detector import Shot
from modules.frame_quality import analyze_frame_quality, QualityScores
from modules.content_analyzer import analyze_content, ContentScores
from modules.scene_representativeness import compute_scene_representativeness

logger = logging.getLogger(__name__)


@dataclass
class ScoredCandidate:
    shot_id: int
    frame_index: int
    timestamp_sec: float
    sharpness: float
    brightness: float
    contrast: float
    color: float
    scene_representativeness: float
    content_importance: float
    redundancy_penalty: float
    cqtr_score: float
    frame: np.ndarray  # kept for downstream saving; excluded from dict export

    def to_dict(self) -> Dict:
        d = asdict(self)
        d.pop("frame", None)
        return d


def _color_histogram(frame: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return hist


def _compute_redundancy_penalties(candidates: List[Candidate]) -> List[float]:
    """
    For each candidate, redundancy penalty = max histogram correlation
    with any OTHER candidate (i.e. how much of a "duplicate" it is of
    something else in the candidate pool). Encourages diversity in the
    final ranking and prevents multiple near-identical frames from all
    scoring at the top.
    """
    if len(candidates) <= 1:
        return [0.0] * len(candidates)

    hists = [_color_histogram(c.frame) for c in candidates]
    penalties = []
    for i in range(len(candidates)):
        max_corr = 0.0
        for j in range(len(candidates)):
            if i == j:
                continue
            corr = cv2.compareHist(hists[i], hists[j], cv2.HISTCMP_CORREL)
            max_corr = max(max_corr, corr)
        penalties.append(float(np.clip(max_corr, 0.0, 1.0)))
    return penalties


def score_candidates(
    candidates: List[Candidate],
    shots: List[Shot],
    weights: Dict[str, float] = config.CQTR_WEIGHTS,
) -> List[ScoredCandidate]:
    """
    Compute the full CQTR score for every candidate frame.
    Returns candidates ranked descending by cqtr_score.
    """
    if not candidates:
        return []

    shots_by_id = {s.shot_id: s for s in shots}
    redundancy_penalties = _compute_redundancy_penalties(candidates)

    scored: List[ScoredCandidate] = []
    for cand, r_penalty in zip(candidates, redundancy_penalties):
        q: QualityScores = analyze_frame_quality(cand.frame)
        ct: ContentScores = analyze_content(cand.frame)
        shot = shots_by_id[cand.shot_id]
        sr = compute_scene_representativeness(cand.frame, shot)

        cqtr = (
            weights["sharpness"] * q.sharpness
            + weights["brightness"] * q.brightness
            + weights["contrast"] * q.contrast
            + weights["color"] * q.color
            + weights["scene_representativeness"] * sr
            + weights["content_importance"] * ct.content_importance
            - weights["redundancy_penalty"] * r_penalty
        )
        cqtr = float(np.clip(cqtr, 0.0, 1.0))

        scored.append(ScoredCandidate(
            shot_id=cand.shot_id,
            frame_index=cand.frame_index,
            timestamp_sec=cand.timestamp_sec,
            sharpness=q.sharpness,
            brightness=q.brightness,
            contrast=q.contrast,
            color=q.color,
            scene_representativeness=sr,
            content_importance=ct.content_importance,
            redundancy_penalty=r_penalty,
            cqtr_score=cqtr,
            frame=cand.frame,
        ))

    scored.sort(key=lambda sc: sc.cqtr_score, reverse=True)
    logger.info("Scored %d candidates; top score=%.3f (shot=%d, t=%.2fs)",
                len(scored), scored[0].cqtr_score, scored[0].shot_id, scored[0].timestamp_sec)
    return scored


def select_best_thumbnail(scored_candidates: List[ScoredCandidate]) -> ScoredCandidate:
    """Return the top-ranked candidate. Assumes scored_candidates is already sorted."""
    if not scored_candidates:
        raise ValueError("No scored candidates to select from.")
    return scored_candidates[0]
