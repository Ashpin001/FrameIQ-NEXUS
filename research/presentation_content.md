# Presentation Content (PPT Outline)

Use this as slide-by-slide content. Suggested: 1 slide per numbered section
below (some sections may split into 2 slides if detail-heavy).

---

## Slide 1: Title
**Intelligent Video Thumbnail Generation Using Shot Boundary Detection, Key
Frame Selection and Content-Aware Quality Ranking (CQTR)**
Final Year Project | [Your Name] | [Institution] | [Date]

## Slide 2: Introduction
- Thumbnails strongly influence viewer click-through decisions.
- Manual creation doesn't scale; naive automated methods (random/middle
  frame) often produce poor results.
- Goal: an automated, explainable, lightweight system that selects
  high-quality, representative thumbnails.

## Slide 3: Problem Statement
- Frames may be blurry, poorly exposed, or transitional.
- A visually attractive frame may not represent the video's content.
- Existing tools address only one part of the problem (quality OR sampling,
  rarely both, and rarely shot-aware).

## Slide 4: Literature Survey
[Fill in with real papers you have read on: shot boundary detection,
key-frame extraction, image quality assessment, visual saliency. Do not
fabricate references — cite only papers you have actually reviewed.]

## Slide 5: Research Gap
- No integrated, lightweight, explainable framework combining shot
  structure + visual quality + content importance + scene
  representativeness.
- Heavy deep-learning approaches solve part of this at high compute cost.

## Slide 6: Objectives
1. Detect shot boundaries adaptively (no hard-coded threshold).
2. Extract representative, de-duplicated key frame candidates per shot.
3. Score candidates on quality, content, and representativeness.
4. Rank and select the best thumbnail via a unified formula (CQTR).
5. Compare against baseline methods and run an ablation study.

## Slide 7: Proposed System (Overview Diagram)
Input Video → Preprocessing → Frame Sampling → Shot Boundary Detection →
Key Frame Extraction → Quality/Content/Scene Scoring → CQTR Ranking →
Best Thumbnail

## Slide 8: System Architecture
Flask backend + OpenCV/NumPy/scikit-image processing + SQLite history +
HTML/CSS/JS frontend. All local, no paid APIs.

## Slide 9: Algorithms — Shot Boundary Detection
- Grayscale frame differencing + histogram difference.
- Adaptive threshold: T = mean(diff) + k·std(diff).

## Slide 10: Algorithms — Key Frame Extraction
- Trim shot-edge frames (likely transitions).
- Evenly sample stable region, de-duplicate via histogram correlation,
  keep sharpest non-duplicates.

## Slide 11: Mathematical Model
```
CQTR(F) = Ws·S + Wb·B + Wc·C + Wcol·Col + Wsr·SR + Wci·CI − Wr·R
```
All terms normalized to [0,1]; weights configurable (table of starting
weights).

## Slide 12: Innovations
- Adaptive (not hard-coded) shot detection.
- Unified scoring across quality + content + representativeness.
- Redundancy penalty for candidate diversity.
- Fully explainable — every component is a transparent, inspectable formula.

## Slide 13: Implementation Highlights
- Modular Python codebase (`modules/`), each responsibility isolated.
- Full Flask web app with real-time-style processing feedback.
- SQLite-backed run history.

## Slide 14: Results — Selected Thumbnail Example
[Insert a real screenshot from your own test run's `/result/<id>` page.]

## Slide 15: Results — Score Breakdown
[Insert the real `score_breakdown.png` chart from an actual run.]

## Slide 16: Baseline Comparison
[Insert the real `baseline_comparison.png` chart + table from an actual run.]

## Slide 17: Ablation Study
[Insert the real `ablation_study.png` chart from an actual run — report
whichever result you actually observed, including if some configurations
tie.]

## Slide 18: Evaluation Metrics
- Processing time, candidate reduction ratio (always available).
- Precision/Recall/F1 and thumbnail accuracy — only if you annotate ground
  truth for your test videos.

## Slide 19: Limitations
Threshold sensitivity, gradual-transition handling, no deep semantic
understanding, subjectivity of "attractiveness", face-detection limits,
no bundled large dataset.

## Slide 20: Conclusion
Recap: a working, lightweight, explainable, locally-deployable framework
that measurably outperforms naive baselines on visual quality and shot
awareness (state your *actual* observed results here, not assumed ones).

## Slide 21: Future Scope
CLIP-based semantic relevance, ViT/CNN features, emotion detection, YouTube
API integration, personalized thumbnails, A/B testing, CTR prediction.

## Slide 22: Thank You / Questions
