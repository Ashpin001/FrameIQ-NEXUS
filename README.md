# FrameIQ AI & NEXUS

### Intelligent Video Thumbnail Generation with Shot Detection, CQTR Ranking & NEXUS 3D Spatial AI Lab

A modern React application ported from Flask/Python to a high-performance web platform running on Node.js and Vite. It automatically selects high-quality, representative thumbnails from uploaded or sample videos using classical computer vision principles and multi-objective ranking.

---

## 1. What This Project Does

Given an uploaded or demo video, the system:

1. **Video Preprocessing & Sampling**: Samples video frames evenly across time while extracting native resolution and playback metadata.
2. **Shot Boundary Detection**: Segments the video into distinct visual scenes using combined grayscale pixel differences and histogram correlation differences with an adaptive threshold ($T = \mu + 2.5\sigma$).
3. **Keyframe Extraction & De-duplication**: Extracts candidates from the stable interior of each shot (ignoring transition edge frames), and filters near-duplicates using histogram correlation ($r \ge 0.97$).
4. **Content-Aware Quality Ranking (CQTR)**: Evaluates sharpness (Laplacian variance), brightness exposure, contrast, color quality, saliency, and scene representativeness.
5. **Research Baselines & Ablation Study**: Compares against 5 baseline selection strategies (Random, Uniform Sampling, Middle Frame, Sharpness-Based, Proposed CQTR) and 6 ablation configurations.
6. **FrameIQ Creative Studio**: Allows in-browser thumbnail editing (cropping to 16:9, 1:1, or 9:16, contrast/brightness adjustments, gradient and dark overlays, wrapped typography, and JPEG export) along with semantic AI reranking.
7. **FrameIQ NEXUS 3D Spatial AI Lab**: Provides an interactive Three.js 3D WebGL frame constellation with orbit, zoom, raycaster selection, and visual-temporal Maximal Marginal Relevance (MMR) ranking.
8. **Persistent History**: Keeps records of processed videos and human evaluation ratings in browser storage.

---

## 2. CQTR Scoring Formula

```text
CQTR(F) = 0.20 * S(F) + 0.10 * B(F) + 0.10 * C(F) + 0.10 * Col(F)
          + 0.20 * SR(F) + 0.25 * CI(F) - 0.05 * R(F)
```

- **Sharpness ($S$)**: Laplacian variance, normalized $[0, 500] \to [0, 1]$.
- **Brightness ($B$)**: Mean luminance, ideal band $[60, 200]$.
- **Contrast ($C$)**: Standard deviation of luminance, normalized $[0, 80] \to [0, 1]$.
- **Color Quality ($Col$)**: Mean saturation in HSV space, ideal band $[40, 200]$.
- **Scene Representativeness ($SR$)**: Color-histogram correlation with all sampled frames in the parent shot.
- **Content Importance ($CI$)**: Edge density, gradient saliency proxy, and central-composition prominence ratio.
- **Redundancy Penalty ($R$)**: Max pairwise color histogram correlation against other candidate frames in the pool.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **3D Graphics**: Three.js WebGL (with HTML5 Canvas fallback)
- **Styling**: Responsive dark glassmorphism design with DM Sans, Inter, and Outfit typography
- **Data Persistence**: LocalStorage persistence layer

---

## 4. Running the Application

```bash
npm install
npm run dev
```

The application runs on port 3000 (`http://localhost:3000`).
