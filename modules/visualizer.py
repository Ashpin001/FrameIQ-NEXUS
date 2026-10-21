"""
visualizer.py
Generates Matplotlib charts for the comparison and results dashboards:
  - Baseline vs CQTR score/time comparison bar charts
  - Ablation study score progression chart
  - Score breakdown radar/bar chart for the selected thumbnail

Charts are saved as PNG files into RESULTS_DIR and referenced by the
Flask templates (kept as static files rather than streamed, for
simplicity and cacheability across dashboard reloads).
"""

import logging
import os
from typing import Dict, List

import matplotlib
matplotlib.use("Agg")  # headless rendering, required for server-side generation
import matplotlib.pyplot as plt

import config
from modules.baseline_methods import BaselineResult
from modules.evaluator import AblationResult
from modules.thumbnail_selector import ScoredCandidate

logger = logging.getLogger(__name__)


def plot_baseline_comparison(
    baseline_results: Dict[str, BaselineResult],
    cqtr_best: ScoredCandidate,
    cqtr_processing_time: float,
    out_path: str = None,
) -> str:
    """
    Bar chart comparing each baseline's score against CQTR, and a second
    panel comparing processing time. Baseline scores are NOT numerically
    equivalent to CQTR scores (different scales/definitions per method),
    so this is presented with that caveat rather than implying a single
    unified metric.
    """
    out_path = out_path or os.path.join(config.RESULTS_DIR, "baseline_comparison.png")

    names = list(baseline_results.keys()) + ["Proposed CQTR"]
    scores = [r.score for r in baseline_results.values()] + [cqtr_best.cqtr_score]
    times = [r.processing_time_sec for r in baseline_results.values()] + [cqtr_processing_time]

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    colors = ["#94a3b8"] * (len(names) - 1) + ["#2563eb"]

    axes[0].bar(names, scores, color=colors)
    axes[0].set_title("Method Score (own scale per method)")
    axes[0].set_ylabel("Score")
    axes[0].tick_params(axis="x", rotation=30)

    axes[1].bar(names, times, color=colors)
    axes[1].set_title("Processing Time")
    axes[1].set_ylabel("Seconds")
    axes[1].tick_params(axis="x", rotation=30)

    fig.suptitle("Baseline Methods vs Proposed CQTR")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)

    logger.info("Saved baseline comparison chart to %s", out_path)
    return out_path


def plot_ablation_study(ablation_results: List[AblationResult], out_path: str = None) -> str:
    """Line/bar chart showing how the selected-thumbnail score changes as components are added."""
    out_path = out_path or os.path.join(config.RESULTS_DIR, "ablation_study.png")

    names = [a.config_name for a in ablation_results]
    scores = [a.best_score for a in ablation_results]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(names, scores, marker="o", color="#2563eb", linewidth=2)
    ax.set_title("Ablation Study: Score Progression as Components Are Added")
    ax.set_ylabel("CQTR Score of Selected Frame")
    ax.tick_params(axis="x", rotation=25)
    ax.grid(True, alpha=0.3)

    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)

    logger.info("Saved ablation study chart to %s", out_path)
    return out_path


def plot_score_breakdown(best: ScoredCandidate, out_path: str = None) -> str:
    """Bar chart of the individual component scores for the selected thumbnail."""
    out_path = out_path or os.path.join(config.RESULTS_DIR, "score_breakdown.png")

    labels = ["Sharpness", "Brightness", "Contrast", "Color",
              "Scene Rep.", "Content Imp.", "Redundancy Pen."]
    values = [best.sharpness, best.brightness, best.contrast, best.color,
              best.scene_representativeness, best.content_importance, best.redundancy_penalty]
    colors = ["#2563eb"] * 6 + ["#ef4444"]  # redundancy penalty highlighted differently (it's subtracted)

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar(labels, values, color=colors)
    ax.set_ylim(0, 1)
    ax.set_title(f"Score Breakdown for Selected Thumbnail (Final CQTR = {best.cqtr_score:.3f})")
    ax.tick_params(axis="x", rotation=20)
    ax.grid(True, axis="y", alpha=0.3)

    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)

    logger.info("Saved score breakdown chart to %s", out_path)
    return out_path
