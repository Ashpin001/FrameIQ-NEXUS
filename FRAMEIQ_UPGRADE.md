# FrameIQ Studio — advanced upgrade

This is an extension of the uploaded Flask/CQTR project, retaining its original upload, scene segmentation, ranking, baselines, ablation, human evaluation, and SQLite history.

## Start

```bash
cd video-thumbnail-generator
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000, upload a video, wait for analysis, open its result, then click **Open FrameIQ AI Studio**. The editor can produce 16:9, 1:1, and 9:16 JPEGs with title, subtitle, overlays, brightness, and contrast. All processing stays local.

## Optional multimodal AI

```bash
pip install -r requirements-ai.txt
```

The semantic ranking button downloads the public `clip-ViT-B-32` model on first use (network needed). It compares text with the best candidate frames, blends semantic similarity and CQTR with category-specific weights, and shows its actual scores. No speech transcription, emotion recognition, learned weight training, or CTR prediction is claimed.

## Limitations

This is a runnable source-code extension, not a verified production deployment. Large videos and AI inference are synchronous and may take time; run behind a job queue for multi-user deployments. The optional model may need significant download/storage. Do not interpret algorithmic scores as actual click-through rates.
