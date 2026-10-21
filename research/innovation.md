# Innovation Statement

## Proposed Contribution

An integrated lightweight framework for automated video thumbnail generation
that combines shot-aware key-frame extraction with visual quality, scene
representativeness, and content-aware ranking (CQTR).

## Framing

This work presents:

- a **proposed framework** integrating shot boundary detection, key frame
  extraction, and multi-factor ranking;
- an **integrated approach** combining previously separate concerns
  (quality-only selection, shot-unaware sampling) into a single scoring model;
- a **lightweight quality-aware method** that avoids the computational cost of
  deep-learning pipelines while remaining explainable and reproducible;
- a **content-aware ranking strategy** that incorporates edge density,
  saliency, and centrality without requiring a trained neural network;
- an **experimental contribution**, evaluated against five baseline
  strategies and analyzed through an ablation study.

## What Is Explicitly NOT Claimed

- This is **not** claimed to be the first system of its kind.
- No unsupported novelty claims (e.g. "first in the world") are made.
- No unsupported accuracy or CTR-improvement claims are made — any such
  numbers would require real user-facing A/B testing data that has not been
  collected as part of this project.
- Traditional computer-vision techniques (Laplacian variance, Canny edges,
  histogram comparison) are described as classical CV methods, not
  mischaracterized as "AI" or "deep learning".

## Distinguishing Proposed Work from Existing Work

| Existing Approach | Limitation | CQTR's Difference |
|---|---|---|
| Random/uniform sampling | No quality awareness | Adds full quality + content scoring |
| Sharpness-only selection | Ignores content/context, can pick meaningless sharp frames | Adds content importance + scene representativeness |
| Deep semantic saliency (CLIP/ViT) | Computationally heavy, less explainable | Classical CV, fully explainable, runs locally without GPU |
