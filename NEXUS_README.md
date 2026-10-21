# FrameIQ NEXUS — spatial thumbnail intelligence

This upgrade **extends** the existing Flask/OpenCV/CQTR application rather than replacing its working processing pipeline.

## Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000/nexus for the spatial interface. Upload a video from the dashboard, wait for processing, then click **Explore in FrameIQ NEXUS 3D** on its results page.

## Implemented research features

- True Three.js WebGL 3D candidate-card constellation with orbit, zoom, selection, 2D grid toggle and motion control. Three.js is loaded from a public CDN; a local canvas fallback works offline.
- Adaptive context-dependent visual/temporal **Maximal Marginal Relevance (MMR)** ranking on actual candidate images.
- HSV histogram and grayscale spatial feature vector, pairwise cosine similarity, temporal separation, and a diversity-penalized greedy selection.
- Adjustable novelty/diversity sliders; working JSON API, real thumbnail preview, and export.
- Preserves original CQTR processing, ablations, baseline comparison, editor, and optional CLIP semantic analysis.

## Honest limitations

- This is an **experimental heuristic**, not a trained CTR prediction model, not guaranteed novel in published literature, and not evidence of outperforming YouTube.
- 3D positions are a visual constellation (not a learned semantic 3D embedding).
- The existing upload/process endpoint runs synchronously; very large videos can take time.
- No API keys are needed for the local ranker. Optional CLIP uses requirements-ai.txt.
- For paper-quality claims, run human blinded studies and benchmark on held-out datasets.
- The 3D scene uses CDN Three.js and requires internet for full WebGL; offline uses the fallback visualization.
