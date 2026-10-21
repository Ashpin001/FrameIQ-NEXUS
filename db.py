"""
db.py
SQLite persistence layer for video run history (Section 28 of the spec).

Tables:
  videos             - one row per uploaded video
  processing_results - one row per completed pipeline run (best thumbnail + timings)
  evaluation          - one row per human evaluation rating submitted for a run
"""

import sqlite3
import json
import logging
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

import config

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    upload_date TEXT NOT NULL DEFAULT (datetime('now')),
    duration_sec REAL,
    fps REAL,
    frame_count INTEGER
);

CREATE TABLE IF NOT EXISTS processing_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    processed_date TEXT NOT NULL DEFAULT (datetime('now')),
    num_shots INTEGER,
    num_candidates INTEGER,
    best_frame_index INTEGER,
    best_timestamp_sec REAL,
    cqtr_score REAL,
    thumbnail_path TEXT,
    score_breakdown_json TEXT,
    baseline_results_json TEXT,
    ablation_results_json TEXT,
    processing_time_sec REAL,
    FOREIGN KEY (video_id) REFERENCES videos (id)
);

CREATE TABLE IF NOT EXISTS evaluation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    evaluator_name TEXT,
    visual_attractiveness INTEGER,
    representativeness INTEGER,
    sharpness_rating INTEGER,
    content_relevance INTEGER,
    overall_quality INTEGER,
    submitted_date TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (result_id) REFERENCES processing_results (id)
);
"""


@contextmanager
def get_connection():
    conn = sqlite3.connect(config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        conn.executescript(SCHEMA)
    logger.info("Database initialized at %s", config.DATABASE_PATH)


def insert_video(filename: str, stored_path: str, duration_sec: float, fps: float, frame_count: int) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO videos (filename, stored_path, duration_sec, fps, frame_count) VALUES (?, ?, ?, ?, ?)",
            (filename, stored_path, duration_sec, fps, frame_count),
        )
        return cur.lastrowid


def insert_processing_result(
    video_id: int,
    num_shots: int,
    num_candidates: int,
    best_frame_index: int,
    best_timestamp_sec: float,
    cqtr_score: float,
    thumbnail_path: str,
    score_breakdown: Dict[str, Any],
    baseline_results: Dict[str, Any],
    ablation_results: List[Dict[str, Any]],
    processing_time_sec: float,
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO processing_results
               (video_id, num_shots, num_candidates, best_frame_index, best_timestamp_sec,
                cqtr_score, thumbnail_path, score_breakdown_json, baseline_results_json,
                ablation_results_json, processing_time_sec)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                video_id, num_shots, num_candidates, best_frame_index, best_timestamp_sec,
                cqtr_score, thumbnail_path, json.dumps(score_breakdown),
                json.dumps(baseline_results), json.dumps(ablation_results), processing_time_sec,
            ),
        )
        return cur.lastrowid


def insert_evaluation(result_id: int, evaluator_name: str, ratings: Dict[str, int]) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO evaluation
               (result_id, evaluator_name, visual_attractiveness, representativeness,
                sharpness_rating, content_relevance, overall_quality)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                result_id, evaluator_name,
                ratings.get("visual_attractiveness"),
                ratings.get("representativeness"),
                ratings.get("sharpness_rating"),
                ratings.get("content_relevance"),
                ratings.get("overall_quality"),
            ),
        )
        return cur.lastrowid


def get_video(video_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()


def get_latest_result_for_video(video_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM processing_results WHERE video_id = ? ORDER BY id DESC LIMIT 1",
            (video_id,),
        ).fetchone()


def get_result(result_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute("SELECT * FROM processing_results WHERE id = ?", (result_id,)).fetchone()


def get_evaluations_for_result(result_id: int) -> List[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM evaluation WHERE result_id = ?", (result_id,)
        ).fetchall()


def get_all_history() -> List[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            """SELECT videos.id as video_id, videos.filename, videos.upload_date,
                      processing_results.id as result_id, processing_results.num_shots,
                      processing_results.num_candidates, processing_results.cqtr_score,
                      processing_results.processing_time_sec, processing_results.thumbnail_path
               FROM processing_results
               JOIN videos ON videos.id = processing_results.video_id
               ORDER BY processing_results.id DESC"""
        ).fetchall()
