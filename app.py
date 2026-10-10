"""
ShopPulse QA Assessment Platform Web Application.
Built with Python standard library HTTP/WSGI + Jinja2 + SQLite.
No external pip dependencies required.
"""

import os
import sys
import json
import urllib.parse
from wsgiref.simple_server import make_server
import jinja2

# Internal imports
import database
import seed_data
from bug_catalog import SEEDED_BUGS, match_candidate_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Initialize Jinja2 Environment
jinja_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
    autoescape=jinja2.select_autoescape(["html", "xml"])
)

# Initialize Database
database.init_db()

def get_mime_type(path):
    if path.endswith(".css"): return "text/css"
    if path.endswith(".js"): return "application/javascript"
    if path.endswith(".png"): return "image/png"
    if path.endswith(".jpg") or path.endswith(".jpeg"): return "image/jpeg"
    if path.endswith(".svg"): return "image/svg+xml"
    if path.endswith(".ico"): return "image/x-icon"
    return "application/octet-stream"

def serve_static(environ, start_response, rel_path):
    # Remove query string if present
    rel_path = rel_path.split("?")[0]
    file_path = os.path.join(STATIC_DIR, rel_path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        mime = get_mime_type(file_path)
        start_response("200 OK", [("Content-Type", mime)])
        with open(file_path, "rb") as f:
            return [f.read()]
            
    # For BUG-014 (broken image): if request is keyboard_broken.png, deliberately return 404
    if "keyboard_broken.png" in rel_path:
        start_response("404 Not Found", [("Content-Type", "text/plain")])
        return [b"404 Not Found: Asset missing"]

    start_response("404 Not Found", [("Content-Type", "text/plain")])
    return [b"404 Not Found"]

def read_post_data(environ):
    try:
        content_length = int(environ.get("CONTENT_LENGTH", 0))
    except (ValueError, TypeError):
        content_length = 0
    if content_length > 0:
        return environ["wsgi.input"].read(content_length).decode("utf-8")
    return ""

def application(environ, start_response):
    path = environ.get("PATH_INFO", "/")
    method = environ.get("REQUEST_METHOD", "GET")
    query_string = environ.get("QUERY_STRING", "")
    query_params = urllib.parse.parse_qs(query_string)

    # Helper to get candidate from token param
    def get_candidate_from_req():
        token = query_params.get("token", [None])[0]
        if token:
            return database.get_candidate_by_token(token)
        return None

    # Static files routing
    if path.startswith("/static/"):
        rel = path[len("/static/"):]
        return serve_static(environ, start_response, rel)

    # 1. Store Catalog View: GET /
    if path == "/" and method == "GET":
        candidate = get_candidate_from_req()
        template = jinja_env.get_template("store.html")
        html = template.render(
            candidate=candidate,
            products=seed_data.PRODUCTS
        )
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 2. Product Detail View: GET /product/<id>
    if path.startswith("/product/") and method == "GET":
        candidate = get_candidate_from_req()
        try:
            prod_id = int(path.split("/")[2])
        except (IndexError, ValueError):
            prod_id = 1
        
        prod = next((p for p in seed_data.PRODUCTS if p["id"] == prod_id), seed_data.PRODUCTS[0])
        revs = seed_data.REVIEWS.get(prod_id, [])
        template = jinja_env.get_template("product.html")
        html = template.render(
            candidate=candidate,
            product=prod,
            reviews=revs
        )
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 3. Cart & Checkout View: GET /cart
    if path == "/cart" and method == "GET":
        candidate = get_candidate_from_req()
        template = jinja_env.get_template("cart.html")
        html = template.render(candidate=candidate)
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 4. Candidate Briefing & PRD: GET /brief
    if path == "/brief" and method == "GET":
        candidate = get_candidate_from_req()
        template = jinja_env.get_template("brief.html")
        html = template.render(candidate=candidate)
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 5. Start Candidate Session: POST /candidate/start
    if path == "/candidate/start" and method == "POST":
        body = read_post_data(environ)
        params = urllib.parse.parse_qs(body)
        full_name = params.get("full_name", ["Candidate"])[0].strip()
        email = params.get("email", ["candidate@example.com"])[0].strip()
        
        import uuid
        token = "cand-" + uuid.uuid4().hex[:8]
        database.create_candidate(full_name, email, token)
        
        # Redirect to store with candidate token
        start_response("303 See Other", [("Location", f"/?token={token}")])
        return [b"Redirecting..."]

    # 6. Candidate Completed Debrief: GET /candidate/completed
    if path == "/candidate/completed" and method == "GET":
        candidate = get_candidate_from_req()
        if not candidate:
            start_response("303 See Other", [("Location", "/brief")])
            return [b"Redirecting..."]
            
        reports = database.get_candidate_reports(candidate["id"], redact_ground_truth=True)
        template = jinja_env.get_template("completed.html")
        html = template.render(candidate=candidate, reports=reports)
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 7. Candidate API: Submit Bug Report (POST /api/candidate/report)
    if path == "/api/candidate/report" and method == "POST":
        body = read_post_data(environ)
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}
            
        token = payload.get("token", "")
        candidate = database.get_candidate_by_token(token)
        if not candidate:
            start_response("401 Unauthorized", [("Content-Type", "application/json")])
            return [json.dumps({"success": False, "error": "Invalid candidate session token"}).encode("utf-8")]
            
        title = payload.get("title", "")
        category = payload.get("category", "")
        severity = payload.get("severity", "")
        steps = payload.get("steps_to_reproduce", "")
        expected = payload.get("expected_result", "")
        actual = payload.get("actual_result", "")
        env_info = payload.get("environment_info", "")
        
        # Match against ground-truth catalog on backend (Candidate is NEVER shown this)
        matched_bug, confidence = match_candidate_report(title, steps, actual)
        matched_id = matched_bug["id"] if matched_bug else None
        
        database.submit_bug_report(
            candidate_id=candidate["id"],
            title=title,
            category=category,
            severity=severity,
            steps=steps,
            expected=expected,
            actual=actual,
            env_info=env_info,
            matched_bug_id=matched_id,
            match_confidence=confidence
        )
        
        # STRICT BLIND RESPONSE: Do NOT reveal matched_bug or confidence
        start_response("200 OK", [("Content-Type", "application/json")])
        return [json.dumps({"success": True, "message": "Bug report logged to candidate session."}).encode("utf-8")]

    # 8. Candidate API: View Personal Logged Reports (GET /api/candidate/my-reports)
    if path == "/api/candidate/my-reports" and method == "GET":
        token = query_params.get("token", [None])[0]
        candidate = database.get_candidate_by_token(token) if token else None
        if not candidate:
            start_response("401 Unauthorized", [("Content-Type", "application/json")])
            return [json.dumps({"error": "Invalid token"}).encode("utf-8")]
            
        # Ground-truth values are redacted for candidate
        reports = database.get_candidate_reports(candidate["id"], redact_ground_truth=True)
        start_response("200 OK", [("Content-Type", "application/json")])
        return [json.dumps({"reports": reports}).encode("utf-8")]

    # 9. Candidate API: Finalize Assessment (POST /api/candidate/finalize)
    if path == "/api/candidate/finalize" and method == "POST":
        body = read_post_data(environ)
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}
        token = payload.get("token", "")
        candidate = database.get_candidate_by_token(token)
        if not candidate:
            start_response("401 Unauthorized", [("Content-Type", "application/json")])
            return [json.dumps({"success": False, "error": "Invalid token"}).encode("utf-8")]
            
        database.finalize_candidate_submission(candidate["id"])
        start_response("200 OK", [("Content-Type", "application/json")])
        return [json.dumps({"success": True}).encode("utf-8")]

    # 10. Mock Order API: Place Order (POST /api/orders/place)
    if path == "/api/orders/place" and method == "POST":
        start_response("200 OK", [("Content-Type", "application/json")])
        return [json.dumps({"success": True, "status": "processed"}).encode("utf-8")]

    # 11. Admin Reviewer Dashboard: GET /admin
    if path == "/admin" and method == "GET":
        candidates = database.list_candidates()
        completed = sum(1 for c in candidates if c["status"] in ("submitted", "reviewed"))
        template = jinja_env.get_template("admin_dashboard.html")
        html = template.render(
            candidates=candidates,
            completed_count=completed,
            seeded_bugs=SEEDED_BUGS
        )
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 12. Admin Candidate Detailed Evaluation: GET /admin/candidate/<id>
    if path.startswith("/admin/candidate/") and method == "GET":
        try:
            cand_id = int(path.split("/")[3])
        except (IndexError, ValueError):
            start_response("404 Not Found", [("Content-Type", "text/plain")])
            return [b"Candidate not found"]
            
        candidate = database.get_candidate_by_id(cand_id)
        if not candidate:
            start_response("404 Not Found", [("Content-Type", "text/plain")])
            return [b"Candidate not found"]
            
        reports = database.get_candidate_reports(candidate["id"], redact_ground_truth=False)
        found_bug_ids = set(r["matched_bug_id"] for r in reports if r.get("matched_bug_id"))
        matched_count = len(found_bug_ids)
        
        # Calculate baseline points earned out of total seeded points
        total_seeded_points = sum(b["points"] for b in SEEDED_BUGS)
        earned_points = sum(b["points"] for b in SEEDED_BUGS if b["id"] in found_bug_ids)
        suggested_score = round((earned_points / total_seeded_points) * 100, 1) if total_seeded_points else 0
        
        template = jinja_env.get_template("candidate_detail.html")
        html = template.render(
            candidate=candidate,
            reports=reports,
            seeded_bugs=SEEDED_BUGS,
            found_bug_ids=found_bug_ids,
            matched_count=matched_count,
            suggested_score=suggested_score
        )
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [html.encode("utf-8")]

    # 13. Admin Submit Candidate Grade: POST /admin/candidate/<id>/grade
    if path.startswith("/admin/candidate/") and path.endswith("/grade") and method == "POST":
        try:
            cand_id = int(path.split("/")[3])
        except (IndexError, ValueError):
            start_response("404 Not Found", [("Content-Type", "text/plain")])
            return [b"Not found"]
            
        body = read_post_data(environ)
        params = urllib.parse.parse_qs(body)
        score = float(params.get("score", [0])[0])
        decision = params.get("decision", ["Pending"])[0]
        notes = params.get("notes", [""])[0]
        
        database.update_candidate_review(cand_id, score, decision, notes)
        start_response("303 See Other", [("Location", f"/admin/candidate/{cand_id}")])
        return [b"Redirecting..."]

    # Fallback 404
    start_response("404 Not Found", [("Content-Type", "text/plain")])
    return [b"404 Page Not Found"]

def run_server(port=8000):
    print(f"🚀 QA Assessment Platform server listening on http://0.0.0.0:{port}")
    httpd = make_server("0.0.0.0", port, application)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    run_server(port)

