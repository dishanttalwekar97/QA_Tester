"""
Helper script to populate demo candidates for testing the evaluator dashboard.
"""
import database
from bug_catalog import match_candidate_report

def seed_sample():
    database.init_db()
    
    # Check if demo candidate already exists
    cand = database.get_candidate_by_token("demo-qa-alex")
    if cand:
        print("Demo candidate already seeded.")
        return

    cand_id = database.create_candidate("Alex Chen", "alex.chen.qa@example.com", "demo-qa-alex")
    print(f"Created demo candidate Alex Chen (ID: {cand_id})")

    # Sample reports logged by Alex
    sample_reports = [
        {
            "title": "Cart allows negative item quantity, reducing the total payable amount",
            "category": "Business Logic",
            "severity": "Blocker",
            "steps": "1. Add item to cart\n2. In quantity box type -2\n3. Notice subtotal is reduced by $159.98",
            "expected": "Cart should only accept positive integers and prevent negative subtotals.",
            "actual": "Line total becomes negative and reduces the order total.",
            "env": "Viewport: 1440x900 | Chrome 124"
        },
        {
            "title": "Coupon code SAVE20 can be stacked multiple times indefinitely",
            "category": "Business Logic",
            "severity": "Blocker",
            "steps": "1. Enter SAVE20 and click Apply\n2. Click Apply again\n3. Discount compounds infinitely",
            "expected": "Coupon should apply once per transaction with an error if reapplied.",
            "actual": "Each click deducts an additional 20% discount.",
            "env": "Viewport: 1440x900 | Chrome 124"
        },
        {
            "title": "Banner claims free shipping over $50 but cart charges $10 shipping for $79 subtotal",
            "category": "Business Logic",
            "severity": "Major",
            "steps": "1. Add Aura Earbuds ($79.99) to cart\n2. Observe shipping line item\n3. Shipping is $10.00 instead of FREE",
            "expected": "Shipping should be $0.00 for orders over $50 as stated on promo banner.",
            "actual": "System charges $10 shipping.",
            "env": "Viewport: 1440x900 | Chrome 124"
        },
        {
            "title": "Mechanical keyboard has a broken image link",
            "category": "UI & Visual",
            "severity": "Minor",
            "steps": "1. Look at product #6 on catalog\n2. Observe image missing",
            "expected": "Product image should load or display a fallback placeholder.",
            "actual": "Broken image icon with 404 response.",
            "env": "Viewport: 1440x900 | Chrome 124"
        }
    ]

    for rep in sample_reports:
        matched_bug, conf = match_candidate_report(rep["title"], rep["steps"], rep["actual"])
        matched_id = matched_bug["id"] if matched_bug else None
        database.submit_bug_report(
            candidate_id=cand_id,
            title=rep["title"],
            category=rep["category"],
            severity=rep["severity"],
            steps=rep["steps"],
            expected=rep["expected"],
            actual=rep["actual"],
            env_info=rep["env"],
            matched_bug_id=matched_id,
            match_confidence=conf
        )

    database.finalize_candidate_submission(cand_id)
    print("Demo reports successfully populated and candidate marked as submitted.")

if __name__ == "__main__":
    seed_sample()

