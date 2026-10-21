# Methodology

## 1. Problem Statement

Online video platforms rely heavily on thumbnails to attract viewers, yet
automated thumbnail selection is commonly reduced to trivial strategies
(random, uniform, or middle-frame sampling) that ignore both visual quality
and content relevance. Manual thumbnail creation does not scale, and heavy
deep-learning pipelines carry a computational cost that is often unjustified
for lightweight or locally-deployed systems.

## 2. Research Gap

- Uniform/random sampling methods carry no notion of quality.
- Quality-only methods (e.g. sharpest frame) ignore whether a frame is
  representative of a coherent shot, so an outlier frame can be selected.
- Deep semantic methods (CLIP, ViT-based saliency) can be effective but are
  computationally heavy, less explainable, and harder to deploy locally.
- No widely available lightweight framework integrates shot structure,
  visual quality, content importance, and scene representativeness into a
  single explainable, reproducible score.

## 3. Proposed Methodology: CQTR

**Content-aware Quality-based Thumbnail Ranking (CQTR)** is proposed as an
integrated framework combining:

1. **Shot Boundary Detection** — adaptive-threshold frame-difference analysis.
2. **Key Frame Candidate Extraction** — per-shot sampling with de-duplication.
3. **Visual Quality Assessment** — sharpness, brightness, contrast, color.
4. **Content Importance Analysis** — edge density, saliency, centrality,
   optional face-presence bonus.
5. **Scene Representativeness** — intra-shot histogram similarity.
6. **Multi-Factor Ranking** — a weighted linear combination of the above,
   with a redundancy penalty to encourage diversity among top candidates.

### 3.1 Shot Boundary Detection

Sampled frames are converted to grayscale and compared pairwise using a
combination of mean absolute pixel difference and histogram correlation
difference. An **adaptive threshold** is computed per video:

```
T = mean(diff_scores) + k * std(diff_scores)      (k = 2.5 by default)
```

This avoids a single hard-coded value that would work for one video's
lighting/motion characteristics but not another's.

### 3.2 Key Frame Extraction

Within each detected shot, frames near the shot's edges (most likely to be
transition frames) are trimmed. The remaining "stable" frames are evenly
sampled, preliminarily scored by sharpness, and de-duplicated using
histogram correlation, keeping the sharpest non-duplicate candidates.

### 3.3 CQTR Scoring Formula

```
CQTR(F) = Ws*S(F) + Wb*B(F) + Wc*C(F) + Wcol*Col(F)
          + Wsr*SR(F) + Wci*CI(F) - Wr*R(F)
```

All components are normalized to [0, 1]. Initial weights (see `config.py`):

| Component | Weight |
|---|---|
| Sharpness | 0.20 |
| Brightness | 0.10 |
| Contrast | 0.10 |
| Color | 0.10 |
| Scene Representativeness | 0.20 |
| Content Importance | 0.25 |
| Redundancy Penalty | 0.05 |

These weights are a **starting scheme**, explicitly not claimed to be
optimal without further experimentation (see `experiment_plan.md`).

## 4. Baseline Methods

Five baselines are implemented for fair comparison: Random Frame Selection,
Uniform Frame Sampling, Middle Frame Selection, Sharpness-Based Selection,
and Visual-Quality-Based Selection. Each is a genuinely working
implementation (see `modules/baseline_methods.py`), not a placeholder.

## 5. Limitations

- **Threshold sensitivity**: the adaptive shot-boundary threshold (k=2.5) was
  chosen empirically and may need adjustment for videos with unusual pacing.
- **Gradual transitions**: dissolves/fades are only partially captured by the
  histogram-difference component; abrupt cuts are detected far more reliably.
- **Very long videos**: frame sampling keeps compute tractable, but extremely
  long videos (>1 hour) have not been stress-tested for memory behavior.
- **No deep semantic understanding**: the system does not "understand" video
  content in the way a CLIP/ViT-based model would; it relies on classical CV
  heuristics (edges, saliency, histograms).
- **Subjectivity**: "thumbnail quality" is inherently subjective; human
  evaluation is offered as a module, not treated as ground truth.
- **Face detection**: uses Haar Cascades, which are lightweight but less
  robust than modern deep face detectors, especially for non-frontal faces.
- **Dataset size**: no large annotated benchmark is bundled; the system is
  designed to work with user-supplied videos and an optional CSV metadata
  structure for experiments.

## 6. Future Work

Vision Transformer or CNN-based feature extraction, CLIP-based semantic
relevance, emotion detection, advanced object detection, multimodal video
understanding, real-time processing, cloud GPU acceleration, personalized
thumbnail generation, A/B testing, and CTR prediction are all identified as
future work and are **not** implemented in the current system.
