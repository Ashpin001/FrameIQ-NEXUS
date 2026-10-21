# Experiment Plan

## 1. Dataset Strategy

- **Primary source**: user-supplied local videos (no copyrighted material is
  downloaded automatically, per the project's research rules).
- **Metadata structure**: `dataset/metadata.csv` with columns
  `video_id, video_name, duration, category, number_of_shots,
  ground_truth_frame, annotator_score`.
- Recommended categories to test across, for a well-rounded evaluation:
  talking-head/interview clips, action/sports clips, nature/scenic footage,
  and multi-scene edited content (e.g. vlogs).
- If a public benchmark is desired for shot-boundary evaluation specifically,
  standard shot-boundary-detection benchmark sets from the TRECVID evaluation
  series are commonly referenced in the literature; any such dataset must be
  obtained through its own official licensing terms, not bundled here.

## 2. Experimental Setup

For each test video:

1. Run the full CQTR pipeline (`modules/evaluator.run_full_pipeline`).
2. Run all five baselines (`modules/baseline_methods.run_all_baselines`).
3. Run the ablation study (`modules/evaluator.run_ablation_study`).
4. Record processing time, number of shots, number of candidates, and the
   final CQTR score.
5. Optionally collect human evaluation ratings via the results-page rating
   widget (stored in the `evaluation` SQLite table).

## 3. Weight Sensitivity Experiments

Because the CQTR weights in `config.py` are a starting scheme rather than a
scientifically optimized set, a legitimate experiment is to vary each weight
(e.g. ±0.05 to ±0.15) one at a time, re-run scoring on the same candidate set
(candidates only need to be extracted once — only the weighted aggregation
step needs to be re-run), and observe how the selected frame and its score
change. `modules/thumbnail_selector.score_candidates` accepts a custom
`weights` dict for exactly this purpose.

## 4. Evaluation Metrics (see also `evaluation.md`)

- **Thumbnail quality**: human rating (1-5 scale, 5 dimensions).
- **Processing time**: wall-clock seconds per video, per method.
- **Candidate reduction ratio**: candidate frames / total native frames.
- **Shot detection precision/recall/F1**: only computable if ground-truth
  shot boundaries are supplied for a video (not fabricated otherwise).
- **Thumbnail selection accuracy**: only computable if a ground-truth
  "correct" thumbnail frame is annotated for a video.

## 5. What This Project Does NOT Claim Without Data

- No claim of superiority over baselines is made without actually running the
  comparison and reporting the real numbers produced by `modules/evaluator.py`
  and `modules/visualizer.py` for the specific videos tested.
- No fabricated precision/recall/F1 values — these fields are explicitly
  `None` in `MetricsReport` when no ground truth is supplied.
