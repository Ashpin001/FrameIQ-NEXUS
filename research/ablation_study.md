# Ablation Study

## Purpose

To demonstrate the marginal contribution of each CQTR component, six
weight configurations are defined in `modules/evaluator.ABLATION_CONFIGS`
and re-scored against the *same* extracted candidate set (candidates and
shots are computed once; only the aggregation weights change per
configuration).

## Configurations

| ID | Configuration | Weights Used |
|---|---|---|
| A | Sharpness only | sharpness = 1.0, all others = 0 |
| B | Sharpness + Brightness | 0.5 / 0.5 |
| C | Visual Quality (S+B+C+Col) | 0.25 each |
| D | Visual Quality + Scene Representativeness | 0.2 each across 5 components |
| E | Visual Quality + Content Importance | 0.2 each across 5 components |
| F | Complete CQTR | Full weight scheme from `config.py` |

## How to Run

```python
from modules.evaluator import run_ablation_study
results = run_ablation_study("path/to/video.mp4")
for r in results:
    print(r.config_name, r.best_frame_index, r.best_score)
```

This is also run automatically as part of every `/api/run/<video_id>` call
in the web application, and its results are visualized on the
`/comparison/<result_id>` page (`plot_ablation_study` in `visualizer.py`).

## Interpreting Results

- If configurations D/E/F select a meaningfully different (and, by visual
  inspection, more representative) frame than A/B/C, this supports the value
  of scene representativeness and content importance beyond raw visual
  quality.
- If D, E, and F select the *same* frame as C on a given video, that is a
  legitimate and informative result too — it suggests that, for that
  particular video's structure, visual quality alone was already sufficient
  to identify the best frame. Report this honestly rather than only
  reporting videos where the full method "wins".
- Because this ablation re-scores the same fixed candidate pool, it isolates
  the *ranking* effect of each component — it does not test whether a
  different candidate-extraction strategy would have surfaced better
  candidates in the first place. That is a separate, unimplemented
  experiment for future work.
