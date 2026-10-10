"""
Database module for QA Assessment Platform using SQLite.
Stores candidate sessions, bug reports, and reviewer evaluations.
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "assessment.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'in_progress', -- in_progress, submitted, reviewed
        started_at TEXT,
        submitted_at TEXT,
        overall_score REAL DEFAULT 0,
        reviewer_notes TEXT DEFAULT '',
        reviewer_decision TEXT DEFAULT 'Pending' -- Pending, Pass, Strong Pass, Consider, Reject
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bug_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        report_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        steps_to_reproduce TEXT NOT NULL,
        expected_result TEXT NOT NULL,
        actual_result TEXT NOT NULL,
        environment_info TEXT DEFAULT '',
        matched_bug_id TEXT,
        match_confidence INTEGER DEFAULT 0,
        evaluator_valid INTEGER DEFAULT 1,
        evaluator_points INTEGER DEFAULT 0,
        evaluator_feedback TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_config (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    
    # Insert default config if empty
    cursor.execute("SELECT COUNT(*) FROM admin_config")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO admin_config (key, value) VALUES ('time_limit_minutes', '45')")
        cursor.execute("INSERT INTO admin_config (key, value) VALUES ('admin_pin', 'admin123')")
    
    conn.commit()
    conn.close()

def create_candidate(full_name: str, email: str, token: str):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO candidates (token, full_name, email, status, started_at) VALUES (?, ?, ?, 'in_progress', ?)",
        (token, full_name, email, now)
    )
    cand_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return cand_id

def get_candidate_by_token(token: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_candidate_by_id(candidate_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_candidate_by_email_or_name(email: str, full_name: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM candidates WHERE LOWER(email) = LOWER(?) OR LOWER(full_name) = LOWER(?) ORDER BY id DESC LIMIT 1",
        (email.strip(), full_name.strip())
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def list_candidates():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, COUNT(b.id) as report_count 
        FROM candidates c
        LEFT JOIN bug_reports b ON c.id = b.candidate_id
        GROUP BY c.id
        ORDER BY c.id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def submit_bug_report(candidate_id: int, title: str, category: str, severity: str, 
                      steps: str, expected: str, actual: str, env_info: str,
                      matched_bug_id: str = None, match_confidence: int = 0):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Determine report sequence number for this candidate
    cursor.execute("SELECT COUNT(*) FROM bug_reports WHERE candidate_id = ?", (candidate_id,))
    report_num = cursor.fetchone()[0] + 1
    
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO bug_reports (
            candidate_id, report_number, title, category, severity,
            steps_to_reproduce, expected_result, actual_result, environment_info,
            matched_bug_id, match_confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (candidate_id, report_num, title, category, severity, steps, expected, actual, env_info,
          matched_bug_id, match_confidence, now))
    
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return report_id

def get_candidate_reports(candidate_id: int, redact_ground_truth: bool = True):
    """
    Returns candidate's reports.
    If redact_ground_truth is True (for candidate view), hides matched_bug_id and scores.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bug_reports WHERE candidate_id = ? ORDER BY report_number ASC", (candidate_id,))
    rows = cursor.fetchall()
    conn.close()
    
    reports = []
    for r in rows:
        d = dict(r)
        if redact_ground_truth:
            d.pop("matched_bug_id", None)
            d.pop("match_confidence", None)
            d.pop("evaluator_valid", None)
            d.pop("evaluator_points", None)
            d.pop("evaluator_feedback", None)
        reports.append(d)
    return reports

def finalize_candidate_submission(candidate_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("UPDATE candidates SET status = 'submitted', submitted_at = ? WHERE id = ?", (now, candidate_id))
    conn.commit()
    conn.close()

def update_candidate_review(candidate_id: int, score: float, decision: str, notes: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE candidates 
        SET overall_score = ?, reviewer_decision = ?, reviewer_notes = ?, status = 'reviewed' 
        WHERE id = ?
    """, (score, decision, notes, candidate_id))
    conn.commit()
    conn.close()

