# FrameIQ NEXUS: An Explainable, Diversity-Aware Framework for Automatic Video Thumbnail Selection

**Ashpin Geo G A, Dr. A. Kethsy Prabavathy**
*Div. of Computer Science and Engineering, Karunya Institute of Technology and Sciences, Coimbatore, Tamil Nadu, India*

## Abstract
A good thumbnail must perform multiple functions: it should look aesthetically pleasing, accurately represent the video content, maintain readability at small scales, and offer diversity when multiple thumbnails are presented. Creating such thumbnails manually is tedious and time-consuming for content creators. This paper introduces FrameIQ NEXUS 2.0, an explainable, local-machine-optimized framework for automatic video thumbnail generation. The system integrates shot-aware candidate extraction, interpretable visual-quality scoring, and diversity-aware reranking via an Enhanced Content-aware Quality-based Thumbnail Ranking (E-CQTR) algorithm combined with Maximal Marginal Relevance (MMR). By utilizing local heuristics for semantic analysis, FrameIQ NEXUS 2.0 avoids mandatory paid APIs while providing a transparent, user-steerable thumbnail selection pipeline. We present a reproducible experimental protocol and a quantitative comparison against baseline selection methods.

## I. Introduction
The video thumbnail serves as the primary visual hook for viewers. For creators, selecting a thumbnail that balances technical quality with narrative relevance is challenging. Simple strategies, such as selecting the middle frame or the sharpest frame, frequently fail to capture the video's essential context, leading to thumbnails that are either visually cluttered or narratively misleading.

FrameIQ NEXUS 2.0 addresses this by shifting the thumbnail selection process from a black-box model to a transparent, explainable pipeline. Our framework is built on three core tenets: (1) shot-aware candidate extraction to ensure comprehensive video coverage; (2) explainable, feature-based scoring that allows creators to understand why a candidate was selected; and (3) diversity-aware reranking to prevent redundant suggestions.

## II. Methodology
### A. System Architecture
The system operates as a local Flask-based application. Video ingestion via OpenCV facilitates shot segmentation using an adaptive thresholding algorithm based on pixel and histogram differences. After shot boundary detection, candidates are extracted and processed for visual-quality metrics (sharpness, brightness, contrast) and semantic relevance.

### B. Enhanced CQTR and Diversity-Aware MMR
The core ranking logic utilizes E-CQTR (Enhanced Content-aware Quality-based Thumbnail Ranking), which computes a weighted score for each candidate. This is followed by an MMR reranking stage to maximize diversity, ensuring that selected thumbnails represent distinct scenes and perspectives. 

## III. Experimental Results
To validate the effectiveness of the proposed framework, we evaluated five distinct methods: Middle Frame, Random Selection, Sharpness Only, Proposed CQTR, and the full Enhanced CQTR + MMR pipeline. Table V summarizes our quantitative findings, derived from the automated benchmark execution.

### TABLE V: Quantitative Comparison of Thumbnail Selection Methods
| Method | Selection Rule | Quality (Qv) | Relevance (Ci) | Semantics | Diversity | Runtime (s) | Human Rating (1-5) |
|---|---|---|---|---|---|---|---|
| Middle Frame | Temporal midpoint | 0.612 | 0.540 | 0.520 | 0.200 | 0.0012 | 2.33 |
| Random | Uniform random draw | 0.485 | 0.410 | 0.460 | 0.350 | 0.0008 | 1.67 |
| Sharpness Only | Global max Laplacian | 0.884 | 0.650 | 0.610 | 0.450 | 0.0450 | 3.33 |
| Proposed CQTR | Weighted quality + content | 0.795 | 0.720 | 0.780 | 0.680 | 0.0240 | 4.33 |
| **CQTR + MMR** | **Diversity-aware CQTR** | **0.750** | **0.780** | **0.880** | **0.890** | **0.0330** | **5.00** |

*Note: Results were measured across a standardized video dataset.*

## IV. Discussion
The experimental results demonstrate that while the "Sharpness Only" method yields high technical quality scores, it often selects redundant frames. The Enhanced CQTR + MMR pipeline shows superior performance in content relevance, semantic alignment, and diversity, leading to the highest human-rated satisfaction. While the proposed method introduces a negligible runtime overhead compared to the baseline approaches, it significantly enhances the utility of the resulting thumbnail set.

## V. Conclusion
FrameIQ NEXUS 2.0 provides a robust, explainable approach to automatic thumbnail selection. By combining lightweight computer vision heuristics with diversity-aware reranking, we offer a system that is transparent, efficient, and well-suited for deployment on local hardware. Future work will focus on fine-tuning the heuristic weights based on larger-scale user preference data to further improve thumbnail click-appeal.
