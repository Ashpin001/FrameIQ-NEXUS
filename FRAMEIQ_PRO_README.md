# FrameIQ AI — Professional Dashboard Edition

A redesigned, responsive Flask application based on the supplied video-thumbnail-generator research project and the approved FrameIQ dashboard reference image.

## Functional workflow
1. Upload MP4/MOV/AVI/MKV/WEBM video.
2. Process shots and extract candidates with OpenCV.
3. Rank thumbnails with existing CQTR scoring.
4. Explore ranked frames and download JPEGs.
5. Open creative studio to crop, add title/subtitle, adjust brightness/contrast and export aspect ratios.
6. Run optional CLIP topic-based semantic reranking (separate AI dependencies).
7. Inspect baseline comparisons, ablations and processing history; submit human ratings.

## Start locally (macOS / Linux)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000

Optional CLIP features:
```bash
pip install -r requirements-ai.txt
```
First use downloads model weights; internet access is required. Standard ranking does not need CLIP.

## Implementation notes
- Visual layout matches the supplied dark violet/blue dashboard inspiration, while thumbnails and scores come from actual uploaded videos, not mock results.
- The original Flask, SQLite, CQTR research pipeline and evaluation code are preserved.
- Image thumbnails are stored locally. Use only trusted videos and avoid exposing Flask debug mode on public servers.
- Processing may take several minutes and runs synchronously; use a production job queue for public deployment.
- CLIP scores are similarities, not CTR predictions. Do not report mock metrics as measured research findings.
- Verify behavior on your machine after installing dependencies; automated runtime integration tests were not completed in this environment.
