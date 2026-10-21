# Intelligent Video Thumbnail Generation
### Using Shot Boundary Detection, Key Frame Selection and Content-Aware Quality Ranking (CQTR)

A final-year CSE project: a lightweight, explainable, locally-run web application
that automatically selects a high-quality, representative thumbnail from an
uploaded video — instead of grabbing a random or middle frame.

---

## 1. What This Project Does

Given an uploaded video, the system:

1. Detects shot (scene) boundaries using adaptive frame-difference thresholding.
2. Extracts a small set of candidate key frames per shot.
3. Scores every candidate on visual quality, content importance, and scene
   representativeness.
4. Combines these into a single **CQTR score** and selects the best-ranked frame.
5. Compares the result against five baseline selection strategies and runs an
   ablation study showing each component's contribution.

Everything runs **locally** with OpenCV/NumPy/scikit-image — no external APIs,
no paid services, no cloud GPU required.

---

## 2. Requirements

- Windows 10/11 (also works on macOS/Linux)
- Python 3.9 – 3.12
- ~200MB free disk space for dependencies

---

## 3. Installation (Windows)

Open **Command Prompt** or **PowerShell** in the project folder:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

If `pip` complains about permissions, try:
```
pip install -r requirements.txt --user
```

---

## 4. Running the Application

```
python app.py
```

Then open your browser at:

```
http://127.0.0.1:5000
```

You should see the **AI Video Thumbnail Generator** home page. Upload a video
(MP4, AVI, MOV, MKV, or WEBM, up to 200MB) and click **Generate Thumbnail**.

---

## 5. Project Structure

```
video-thumbnail-generator/
├── app.py                     # Flask application (routes, orchestration)
├── config.py                  # All tunable parameters (weights, thresholds, paths)
├── db.py                      # SQLite persistence layer
├── requirements.txt
├── modules/
│   ├── video_processor.py     # Video loading, metadata, frame sampling
│   ├── shot_detector.py       # Adaptive shot boundary detection
│   ├── keyframe_extractor.py  # Per-shot candidate extraction + de-duplication
│   ├── frame_quality.py       # Sharpness / brightness / contrast / color
│   ├── content_analyzer.py    # Edge density / saliency / centrality / faces
│   ├── scene_representativeness.py
│   ├── thumbnail_selector.py  # CQTR aggregation + ranking
│   ├── baseline_methods.py    # 5 baseline strategies for comparison
│   ├── evaluator.py           # Full pipeline runner + ablation + metrics
│   └── visualizer.py          # Matplotlib comparison / ablation / breakdown charts
├── templates/                 # Flask/Jinja2 HTML templates
├── static/                    # CSS + JS
├── uploads/ outputs/ candidates/ results/ evaluation/  # Runtime data (created automatically)
├── dataset/metadata.csv       # Dataset metadata template
└── research/                  # Methodology, innovation, evaluation & ablation docs,
                                # presentation content, viva Q&A
```

---

## 6. How the CQTR Score Is Computed

```
CQTR(F) = Ws*S(F) + Wb*B(F) + Wc*C(F) + Wcol*Col(F)
          + Wsr*SR(F) + Wci*CI(F) - Wr*R(F)
```

All feature scores are normalized to [0, 1]. Weights live in `config.py`
(`CQTR_WEIGHTS`) and can be changed for experimentation — they are **not**
claimed to be scientifically optimal, only a reasonable starting scheme
(see `research/methodology.md`).

---

## 7. Known Limitations

See `research/methodology.md` (Limitations section) for the full, honest list —
including threshold sensitivity, difficulty with gradual/complex transitions,
the subjectivity of "good thumbnail", and that this is a lightweight
classical-CV approach rather than a deep-learning semantic model.

---

## 8. Optional Cloud Deployment

The app runs fine locally with `python app.py`. For cloud deployment
(Render / Railway / Hugging Face Spaces), you'll additionally need:

- A `Procfile` (e.g. `web: gunicorn app:app`)
- `gunicorn` added to `requirements.txt`
- Awareness that free-tier CPU/memory limits may slow down processing of
  longer or higher-resolution videos — this is a genuine constraint, not
  something the current codebase works around.

This is optional and not required for demonstrating or evaluating the project.
