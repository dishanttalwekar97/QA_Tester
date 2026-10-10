"""
Automated endpoint verification tests for QA Assessment Platform.
Tests all user flows and endpoints using Python's WSGI test environment.
"""
import io
import json
import urllib.parse
from app import application
import database

def make_test_request(path, method="GET", body=None, query_string="", content_type="application/json"):
    environ = {
        "PATH_INFO": path,
        "REQUEST_METHOD": method,
        "QUERY_STRING": query_string,
        "wsgi.input": io.BytesIO(body.encode("utf-8") if body else b""),
        "CONTENT_LENGTH": str(len(body.encode("utf-8")) if body else 0),
        "CONTENT_TYPE": content_type
    }
    status_header = {}
    
    def start_response(status, headers):
        status_header["status"] = status
        status_header["headers"] = headers

    response_iter = application(environ, start_response)
    response_body = b"".join(response_iter).decode("utf-8")
    return status_header["status"], response_body

def test_endpoints():
    print("Running automated verification tests...")

    # 1. Store Homepage
    status, body = make_test_request("/")
    assert "200 OK" in status, f"Failed store homepage: {status}"
    assert "ShopPulse" in body
    print("✓ GET / (Store Homepage) passed")

    # 2. Briefing Page
    status, body = make_test_request("/brief")
    assert "200 OK" in status
    assert "Quality Assurance Practical Assessment" in body
    print("✓ GET /brief (Candidate Onboarding) passed")

    # 3. Cart Page
    status, body = make_test_request("/cart")
    assert "200 OK" in status
    assert "Your Shopping Cart" in body
    print("✓ GET /cart (Cart & Checkout) passed")

    # 4. Product Detail Page
    status, body = make_test_request("/product/1")
    assert "200 OK" in status
    assert "Aura Noise-Canceling Wireless Earbuds" in body
    print("✓ GET /product/1 passed")

    # 5. Admin Dashboard
    status, body = make_test_request("/admin")
    assert "200 OK" in status
    assert "Hiring Evaluator Dashboard" in body
    assert "Alex Chen" in body
    print("✓ GET /admin (Evaluator Dashboard) passed")

    # 6. Admin Candidate Detail
    status, body = make_test_request("/admin/candidate/1")
    assert "200 OK" in status
    assert "Evaluation Sheet: Alex Chen" in body
    assert "20 Seeded Bugs Coverage Matrix" in body
    print("✓ GET /admin/candidate/1 passed")

    # 7. Bug Report Submission API
    new_cand_id = database.create_candidate("Test Tester", "test@test.com", "test-token-999")
    payload = json.dumps({
        "token": "test-token-999",
        "title": "Double clicking place order creates duplicate order",
        "category": "Concurrency & State",
        "severity": "Blocker",
        "steps_to_reproduce": "1. Go to checkout\n2. Double click Place Order\n3. Two orders placed",
        "expected_result": "Only one order should be placed",
        "actual_result": "Two duplicate orders created",
        "environment_info": "Chrome 124"
    })
    status, body = make_test_request("/api/candidate/report", method="POST", body=payload)
    assert "200 OK" in status
    res = json.loads(body)
    assert res.get("success") is True
    # Verify strict blind principle: no match info exposed to candidate
    assert "matched_bug_id" not in res
    assert "confidence" not in res
    print("✓ POST /api/candidate/report (Strict Blind API) passed")

    # 8. Candidate My Reports API
    status, body = make_test_request("/api/candidate/my-reports", query_string="token=test-token-999")
    assert "200 OK" in status
    data = json.loads(body)
    assert len(data["reports"]) == 1
    # Check that ground-truth IDs and evaluator ratings are redacted
    assert "matched_bug_id" not in data["reports"][0]
    print("✓ GET /api/candidate/my-reports (Redacted Ground-Truth) passed")

    print("\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_endpoints()

