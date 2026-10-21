# Viva Questions &amp; Answers

## Core Concept

**1. What problem does your project solve?**
It automates video thumbnail selection so the chosen frame is both visually
high-quality and representative of the video's content, instead of relying
on random, middle, or purely sharpness-based frame picks.

**2. What is CQTR?**
Content-aware Quality-based Thumbnail Ranking — the proposed scoring
framework that combines visual quality, content importance, scene
representativeness, and a redundancy penalty into one weighted formula to
rank candidate frames.

**3. Why not just pick the sharpest frame in the video?**
A sharp frame can still be meaningless — e.g. an outlier close-up or a frame
from an irrelevant transitional moment. Sharpness alone ignores whether the
frame represents the shot's content or the video as a whole.

**4. Why not use a deep learning model for the whole pipeline?**
Deep models (e.g. CLIP/ViT-based saliency) can be effective but are
computationally heavier, less explainable, and harder to deploy locally
without a GPU. This project prioritizes a lightweight, explainable, classical
computer-vision approach, while noting deep learning as future work.

## Shot Boundary Detection

**5. How does your system detect shot boundaries?**
By computing frame-to-frame difference scores (weighted combination of
mean absolute pixel difference and histogram difference) across sampled
frames, then flagging a boundary wherever the difference exceeds an
adaptive threshold.

**6. Why an adaptive threshold instead of a fixed one?**
A fixed threshold that works for one video's lighting/motion pattern may
over- or under-segment a different video. The adaptive threshold
`T = mean + k·std` is derived per-video from its own difference-score
distribution.

**7. What value of k did you use, and why?**
k = 2.5 by default (configurable in `config.py`). It was chosen empirically
to balance sensitivity to real cuts against tolerance for gradual
motion/noise; it can be tuned per dataset.

**8. Does your system handle gradual transitions (fades/dissolves)?**
Partially — the histogram-difference component helps catch illumination
shifts during fades, but abrupt cuts are detected far more reliably. This is
documented as a limitation.

**9. What happens if a video has no real shot changes at all?**
The system correctly falls back to treating the whole video as a single
shot (verified in testing with a continuous-motion video that produced
exactly one detected shot).

**10. What's the minimum shot length you enforce, and why?**
`MIN_SHOT_LENGTH_FRAMES` (default 3 sampled frames) — prevents noise or
brief flicker from being mistaken for a full shot boundary, avoiding
over-segmentation.

## Key Frame Extraction

**11. Why do you trim frames at the edges of each shot?**
Frames right at a shot's start/end are the most likely to be transition or
partially-cut frames, which tend to be lower quality or ambiguous in
content.

**12. How do you avoid selecting near-duplicate frames?**
By comparing grayscale histograms via correlation; frames above a
correlation threshold (0.97 default) are treated as near-duplicates and only
the sharper one is kept.

**13. How many candidate frames does your system typically keep per shot?**
Configurable — up to `MAX_CANDIDATES_PER_SHOT` (6) are sampled per shot,
then de-duplicated down to `MAX_KEPT_CANDIDATES_PER_SHOT` (3).

## Visual Quality

**14. How do you measure sharpness?**
Laplacian variance on the grayscale frame — higher variance indicates more
high-frequency detail (sharper edges).

**15. How do you penalize over/under-exposed frames?**
Mean luminance is checked against an "ideal" band (60-200 on a 0-255 scale);
frames outside this band are scored proportionally lower the further they
are from the band.

**16. What contrast measure do you use?**
Standard deviation of pixel luminance — higher spread indicates higher
contrast.

**17. How do you assess color quality?**
Mean saturation in HSV space, scored highest within a moderate "natural but
vivid" band and penalized for both washed-out and oversaturated frames.

## Content Importance

**18. What is "content importance" in your system, concretely?**
A weighted combination of edge density (visual complexity), saliency
(via spectral-residual saliency or a gradient-magnitude fallback),
central-region prominence, and an optional face-presence bonus.

**19. Does your system prioritize frames with faces?**
It gives a bonus to content importance if a face is detected, but this never
overrides visual quality — a blurry or poorly-exposed face-containing frame
can still score low overall because quality is scored independently.

**20. What method do you use for saliency, and why?**
OpenCV's spectral-residual static saliency (fast, classical, no training
required); a gradient-magnitude proxy is used as a fallback if that OpenCV
module isn't available in a given build.

**21. What face detector do you use, and what are its limitations?**
OpenCV's Haar Cascade frontal-face detector — lightweight and dependency-free,
but less robust than modern deep detectors, especially for non-frontal faces
or poor lighting.

## Scene Representativeness

**22. How do you measure how "representative" a frame is of its shot?**
By computing the average color-histogram correlation between the candidate
frame and every other sampled frame within the same shot — a higher average
correlation means the frame's visual character matches the shot's overall
look.

**23. Why is this important?**
Without it, the system might select a frame that is sharp and well-exposed
but visually atypical for its shot (e.g. a brief flash or outlier angle).

## CQTR Formula &amp; Weighting

**24. Walk me through the CQTR formula.**
`CQTR(F) = Ws·S + Wb·B + Wc·C + Wcol·Col + Wsr·SR + Wci·CI − Wr·R`, where
each term is a normalized [0,1] score and the final term is a redundancy
penalty that's subtracted, not added.

**25. Are your weights scientifically optimal?**
No — they are an explicitly stated starting scheme (see `methodology.md`).
The system is built so weights are configurable, enabling controlled
experiments rather than claiming an untested formula is optimal.

**26. What is the redundancy penalty and why subtract it?**
It's the maximum histogram correlation of a candidate against any other
candidate in the pool — a proxy for "how much of a duplicate is this frame".
Subtracting it discourages multiple near-identical frames from all ranking
at the top, encouraging diverse, deliberate candidate coverage.

## Evaluation

**27. What baselines did you compare against?**
Random Frame Selection, Uniform Frame Sampling, Middle Frame Selection,
Sharpness-Based Selection, and Visual-Quality-Based Selection — all
genuinely implemented and run for direct comparison.

**28. What is your ablation study designed to show?**
How the selected thumbnail and its score change as components (sharpness →
+brightness → full visual quality → +scene representativeness →
+content importance → complete CQTR) are progressively added, isolating
each component's marginal contribution.

**29. Can you report accuracy or precision/recall for your system?**
Only if ground-truth shot boundaries or a ground-truth "ideal" thumbnail
frame are supplied for a video — the system explicitly returns `None` for
these metrics rather than fabricating them when no ground truth exists.

**30. What are the main limitations of your system, honestly?**
Threshold sensitivity in shot detection, weaker handling of gradual
transitions, no true semantic/deep understanding of content, subjectivity of
"good thumbnail" as a concept, Haar-cascade face-detection limitations, and
no bundled large-scale annotated dataset — all documented in
`research/methodology.md`.
