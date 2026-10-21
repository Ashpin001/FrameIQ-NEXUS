"""
app.py
Flask web application tying together the full CQTR pipeline.

Routes:
  GET  /                      -> upload page
  POST /upload                -> handle video upload, redirect to processing page
  GET  /process/<video_id>    -> processing page (kicks off AJAX call to /api/run)
  POST /api/run/<video_id>    -> runs the full pipeline + baselines + ablation, saves results
  GET  /result/<result_id>    -> results dashboard
  GET  /comparison/<result_id>-> baseline + ablation comparison page
  GET  /history                -> run history
  POST /evaluate/<result_id>   -> submit a human evaluation rating
  GET  /media/<folder>/<path:filename> -> secure static file serving for generated images
"""

import os
import json
import logging
import traceback
from datetime import datetime

from flask import Flask, request, render_template, redirect, url_for, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename

import config
import db
from modules.video_processor import allowed_file, get_video_metadata, save_frame_as_image, VideoProcessingError
from modules.baseline_methods import run_all_baselines
from modules.evaluator import run_full_pipeline, run_ablation_study, compute_metrics
from modules.visualizer import plot_baseline_comparison, plot_ablation_study, plot_score_breakdown

logging.basicConfig(level=getattr(logging, config.LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")

db.init_db()

@app.context_processor
def global_template_values():
    return {"max_mb": config.MAX_CONTENT_LENGTH_MB}


ALLOWED_MEDIA_ROOTS = {
    "uploads": config.UPLOAD_DIR,
    "outputs": config.OUTPUT_DIR,
    "candidates": config.CANDIDATES_DIR,
    "results": config.RESULTS_DIR,
}


# ---------------------------------------------------------------------------
# Media serving (secure - restricted to known project directories only)
# ---------------------------------------------------------------------------
@app.route("/media/<folder>/<path:filename>")
def media(folder, filename):
    root = ALLOWED_MEDIA_ROOTS.get(folder)
    if root is None:
        abort(404)
    # secure_filename would strip subfolders we sometimes use (e.g. video_id/); instead
    # rely on send_from_directory's own path traversal protection.
    return send_from_directory(root, filename)


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    if "video" not in request.files:
        return render_template("index.html", error="No file part in the request.")

    file = request.files["video"]
    if file.filename == "":
        return render_template("index.html", error="No file selected.")

    if not allowed_file(file.filename):
        return render_template(
            "index.html",
            error=f"Unsupported file type. Allowed: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}",
        )

    filename = secure_filename(file.filename)
    timestamped_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    stored_path = os.path.join(config.UPLOAD_DIR, timestamped_name)
    file.save(stored_path)

    try:
        metadata = get_video_metadata(stored_path)
    except VideoProcessingError as e:
        os.remove(stored_path)
        return render_template("index.html", error=f"Could not process video: {e}")

    video_id = db.insert_video(
        filename=filename,
        stored_path=stored_path,
        duration_sec=metadata.duration_sec,
        fps=metadata.fps,
        frame_count=metadata.frame_count,
    )

    return redirect(url_for("process_page", video_id=video_id))


# ---------------------------------------------------------------------------
# Processing page + API
# ---------------------------------------------------------------------------
@app.route("/process/<int:video_id>")
def process_page(video_id):
    video = db.get_video(video_id)
    if video is None:
        abort(404)
    return render_template("processing.html", video=video)


@app.route("/api/run/<int:video_id>", methods=["POST"])
def api_run(video_id):
    video = db.get_video(video_id)
    if video is None:
        return jsonify({"error": "Video not found"}), 404

    video_path = video["stored_path"]

    try:
        # --- Proposed CQTR pipeline ---
        run_result = run_full_pipeline(video_path)
        best = run_result.best_thumbnail

        # Save the selected thumbnail image
        thumb_rel_path = f"{video_id}_best_thumbnail.jpg"
        thumb_abs_path = os.path.join(config.OUTPUT_DIR, thumb_rel_path)
        save_frame_as_image(best.frame, thumb_abs_path)

        # Save top-N alternative candidate images (Section 21)
        alternatives = []
        for i, sc in enumerate(run_result.scored_candidates[: config.TOP_N_ALTERNATIVES]):
            alt_rel = f"{video_id}_candidate_{i}.jpg"
            alt_abs = os.path.join(config.CANDIDATES_DIR, alt_rel)
            save_frame_as_image(sc.frame, alt_abs)
            alt_dict = sc.to_dict()
            alt_dict["image_path"] = alt_rel
            alternatives.append(alt_dict)

        # --- Baselines ---
        baselines = run_all_baselines(video_path, run_result.metadata)
        baseline_summary = {}
        for name, r in baselines.items():
            b_rel = f"{video_id}_baseline_{name.replace(' ', '_')}.jpg"
            b_abs = os.path.join(config.OUTPUT_DIR, b_rel)
            save_frame_as_image(r.frame, b_abs)
            baseline_summary[name] = {
                "frame_index": r.frame_index,
                "timestamp_sec": r.timestamp_sec,
                "score": r.score,
                "processing_time_sec": r.processing_time_sec,
                "image_path": b_rel,
            }

        # --- Ablation study ---
        ablation = run_ablation_study(video_path)
        ablation_summary = [
            {"config_name": a.config_name, "best_frame_index": a.best_frame_index,
             "best_timestamp_sec": a.best_timestamp_sec, "best_score": a.best_score}
            for a in ablation
        ]

        # --- Metrics (no fabricated ground truth) ---
        metrics = compute_metrics(run_result)

        # --- Charts ---
        chart_dir = config.RESULTS_DIR
        plot_baseline_comparison(baselines, best, run_result.processing_time_sec,
                                  out_path=os.path.join(chart_dir, f"{video_id}_baseline_comparison.png"))
        plot_ablation_study(ablation, out_path=os.path.join(chart_dir, f"{video_id}_ablation_study.png"))
        plot_score_breakdown(best, out_path=os.path.join(chart_dir, f"{video_id}_score_breakdown.png"))

        score_breakdown = best.to_dict()
        score_breakdown["image_path"] = thumb_rel_path
        score_breakdown["alternatives"] = alternatives
        score_breakdown["metrics"] = {
            "processing_time_sec": metrics.processing_time_sec,
            "total_native_frames": metrics.total_native_frames,
            "total_candidate_frames": metrics.total_candidate_frames,
            "candidate_reduction_ratio": metrics.candidate_reduction_ratio,
            "note": metrics.note,
        }

        result_id = db.insert_processing_result(
            video_id=video_id,
            num_shots=len(run_result.shots),
            num_candidates=run_result.num_candidates,
            best_frame_index=best.frame_index,
            best_timestamp_sec=best.timestamp_sec,
            cqtr_score=best.cqtr_score,
            thumbnail_path=thumb_rel_path,
            score_breakdown=score_breakdown,
            baseline_results=baseline_summary,
            ablation_results=ablation_summary,
            processing_time_sec=run_result.processing_time_sec,
        )

        return jsonify({"success": True, "redirect": url_for("result_page", result_id=result_id)})

    except VideoProcessingError as e:
        logger.error("Pipeline failed for video %d: %s", video_id, e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Unexpected error processing video %d: %s\n%s", video_id, e, traceback.format_exc())
        return jsonify({"error": f"Unexpected server error: {e}"}), 500


# ---------------------------------------------------------------------------
# Results dashboard
# ---------------------------------------------------------------------------
@app.route("/result/<int:result_id>")
def result_page(result_id):
    result = db.get_result(result_id)
    if result is None:
        abort(404)
    video = db.get_video(result["video_id"])

    score_breakdown = json.loads(result["score_breakdown_json"])

    return render_template(
        "result.html",
        video=video,
        result=result,
        breakdown=score_breakdown,
        alternatives=score_breakdown.get("alternatives", []),
        metrics=score_breakdown.get("metrics", {}),
    )


@app.route("/comparison/<int:result_id>")
def comparison_page(result_id):
    result = db.get_result(result_id)
    if result is None:
        abort(404)
    video = db.get_video(result["video_id"])

    baseline_results = json.loads(result["baseline_results_json"])
    ablation_results = json.loads(result["ablation_results_json"])

    return render_template(
        "comparison.html",
        video=video,
        result=result,
        baselines=baseline_results,
        ablation=ablation_results,
        video_id=result["video_id"],
    )


# ---------------------------------------------------------------------------
# Human evaluation (Section 14)
# ---------------------------------------------------------------------------
@app.route("/evaluate/<int:result_id>", methods=["POST"])
def evaluate(result_id):
    result = db.get_result(result_id)
    if result is None:
        return jsonify({"error": "Result not found"}), 404

    data = request.get_json(force=True)
    ratings = {
        "visual_attractiveness": int(data.get("visual_attractiveness", 0)),
        "representativeness": int(data.get("representativeness", 0)),
        "sharpness_rating": int(data.get("sharpness_rating", 0)),
        "content_relevance": int(data.get("content_relevance", 0)),
        "overall_quality": int(data.get("overall_quality", 0)),
    }
    evaluator_name = data.get("evaluator_name", "Anonymous")

    db.insert_evaluation(result_id, evaluator_name, ratings)
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# FrameIQ Studio: functional local editor + optional multimodal reranking
# ---------------------------------------------------------------------------
@app.route("/studio/<int:result_id>")
def studio(result_id):
    result = db.get_result(result_id)
    if result is None: abort(404)
    breakdown = json.loads(result["score_breakdown_json"])
    return render_template("studio.html", result=result, breakdown=breakdown)

@app.route("/api/edit/<int:result_id>", methods=["POST"])
def edit_thumbnail(result_id):
    result = db.get_result(result_id)
    if result is None: return jsonify(error="Result not found"), 404
    from modules.thumbnail_editor import create_thumbnail
    import uuid
    data = request.get_json(silent=True) or {}
    breakdown = json.loads(result["score_breakdown_json"])
    choice = str(data.get('source', 'best'))
    options = {'best': breakdown['image_path']}
    options.update({str(i): x['image_path'] for i,x in enumerate(breakdown.get('alternatives', []))})
    if choice not in options: return jsonify(error='Invalid frame selection'), 400
    root = config.OUTPUT_DIR if choice == 'best' else config.CANDIDATES_DIR
    source = os.path.join(root, options[choice])
    name = f"frameiq_{result_id}_{uuid.uuid4().hex[:10]}.jpg"
    try:
        create_thumbnail(source, os.path.join(config.OUTPUT_DIR,name),
            title=data.get('title',''),subtitle=data.get('subtitle',''),
            aspect=data.get('aspect','16:9'),brightness=data.get('brightness',1),
            contrast=data.get('contrast',1),style=data.get('style','gradient'))
    except (ValueError, TypeError, OSError) as exc:
        return jsonify(error=str(exc)),400
    return jsonify(success=True, url=url_for('media',folder='outputs',filename=name))

@app.route("/api/semantic/<int:result_id>", methods=["POST"])
def semantic_rank(result_id):
    result=db.get_result(result_id)
    if result is None:return jsonify(error='Result not found'),404
    data=request.get_json(silent=True) or {}
    topic=str(data.get('topic','')).strip()[:250]
    category=str(data.get('category','general'))
    if not topic:return jsonify(error='Enter a topic or video description'),400
    video=db.get_video(result['video_id'])
    try:
        from modules.evaluator import run_full_pipeline
        from modules.semantic_engine import rerank
        from modules.video_processor import save_frame_as_image
        ranked=rerank(run_full_pipeline(video['stored_path']).scored_candidates,topic,category)
        for row in ranked[:5]:
            name=f"{result_id}_semantic_{row['frame_index']}.jpg"
            save_frame_as_image(row.pop('frame'),os.path.join(config.CANDIDATES_DIR,name))
            row['url']=url_for('media',folder='candidates',filename=name)
        for row in ranked[5:]:row.pop('frame',None)
        return jsonify(success=True,ranking=ranked[:5],model='clip-ViT-B-32')
    except (ImportError,ModuleNotFoundError) as exc:
        return jsonify(error='Optional semantic model unavailable. Install requirements-ai.txt. '+str(exc)),503
    except Exception as exc:
        logger.exception('Semantic reranking failed')
        return jsonify(error=str(exc)),500

# ---------------------------------------------------------------------------
# FrameIQ Nexus: 3D research workspace and explainable diversity ranking
# ---------------------------------------------------------------------------
@app.route('/nexus')
def nexus_home():
    return render_template('nexus.html', result_id=None)

@app.route('/nexus/<int:result_id>')
def nexus_result(result_id):
    if db.get_result(result_id) is None: abort(404)
    return render_template('nexus.html', result_id=result_id)

@app.route('/api/nexus/<int:result_id>')
def nexus_data(result_id):
    result=db.get_result(result_id)
    if result is None: return jsonify(error='Result not found'),404
    breakdown=json.loads(result['score_breakdown_json'])
    items=breakdown.get('alternatives',[])
    out=[]
    for item in items:
        out.append({'frame_index':int(item.get('frame_index',0)),
                    'timestamp_sec':float(item.get('timestamp_sec',0)),
                    'cqtr_score':float(item.get('cqtr_score',0)),
                    'image_path':item['image_path'],
                    'url':url_for('media',folder='candidates',filename=item['image_path'])})
    return jsonify(candidates=out,video_id=result['video_id'],result_id=result_id,
                   processing_time_sec=result['processing_time_sec'])

@app.route('/api/nexus/<int:result_id>/rank',methods=['POST'])
def nexus_rank(result_id):
    result=db.get_result(result_id)
    if result is None: return jsonify(error='Result not found'),404
    from pathlib import Path
    from modules.advanced_ranker import rerank
    data=request.get_json(silent=True) or {}
    try:
        diversity=float(data.get('diversity',.55));novelty=float(data.get('novelty',.35))
        if not (0<=diversity<=1 and 0<=novelty<=1): raise ValueError('Weights must be between 0 and 1')
        category=str(data.get('category','general'))
        breakdown=json.loads(result['score_breakdown_json'])
        ranked=rerank(breakdown.get('alternatives',[]),Path(config.CANDIDATES_DIR),diversity,novelty,category)
        for row in ranked:
            row['url']=url_for('media',folder='candidates',filename=row['image_path'])
        return jsonify(ranking=ranked,parameters={'diversity':diversity,'novelty':novelty,'category':category})
    except (ValueError,TypeError) as exc: return jsonify(error=str(exc)),400

# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------
@app.route("/history")
def history():
    rows = db.get_all_history()
    return render_template("history.html", rows=rows) if os.path.exists(
        os.path.join(config.BASE_DIR, "templates", "history.html")
    ) else jsonify([dict(r) for r in rows])


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return render_template("error.html", message="Page not found."), 404


@app.errorhandler(413)
def too_large(e):
    return render_template("error.html", message=f"File too large. Max size is {config.MAX_CONTENT_LENGTH_MB}MB."), 413


@app.errorhandler(500)
def server_error(e):
    return render_template("error.html", message="An unexpected server error occurred."), 500


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
