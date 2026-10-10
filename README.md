# ShopPulse — QA Tester Hiring & Assessment Platform

A realistic web application built specifically for hiring and assessing QA engineers through **hands-on, black-box exploratory testing**.

---

## 🌟 Core Philosophy: Strict Black-Box Testing

In real-world QA engineering, testers are not told how many bugs exist or given hints on where to look. They are provided with **Product Requirements (PRD)** and must independently explore the application, test boundaries, probe edge cases, and report defects.

* **No Bug Counts**: Candidates are **never** shown counters like *"5 of 20 bugs found"*.
* **No Progress Bars**: There are no completion meters, checklists, or categories shown to candidates.
* **Personal Submission Log**: Candidates can view what they personally submitted to review their notes, with **zero feedback** on whether a report was correct or matched a real defect.
* **Zero Client Leakage**: The master list of 20 bugs and scoring criteria resides strictly on the server and is never sent to the client browser bundle.

---

## 🐞 The 20 Seeded Bugs (Ground-Truth Catalog)

| Bug ID | Category | Severity | Title & Behavior | What It Tests |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Business Logic | **Blocker** | **Negative Quantity Exploit**: Entering `-1` or `-5` in cart multiplies unit price negatively, lowering the order total or generating store credit. | Negative numbers, boundary limits |
| **BUG-002** | Business Logic | **Blocker** | **Infinite Coupon Stacking**: Entering `SAVE20` can be clicked repeatedly, continuously compounding 20% off without single-use validation. | Idempotency, promotional state |
| **BUG-003** | Concurrency | **Blocker** | **Double-Click Duplicate Order**: Rapidly clicking "Place Order" lacks debouncing/disabling and fires multiple duplicate orders. | Race conditions, button debouncing |
| **BUG-004** | Business Logic | **Major** | **Free Shipping Threshold Glitch**: Banner advertises "Free Shipping over $50", but the cart charges $10 shipping until subtotal > $100. | Specification compliance |
| **BUG-005** | Cart State | **Major** | **Zero Quantity Lingers**: Editing quantity to `0` leaves the item in the cart with $0.00 line total instead of removing it. | Collection cleanup, edge-case input |
| **BUG-006** | Data Consistency | **Major** | **In-Stock Badge vs Add-to-Cart Failure**: Product #4 displays "In Stock (12 left)", but clicking "Add to Cart" triggers "Out of Stock" error toast. | Component state synchronization |
| **BUG-007** | Input Validation | **Major** | **Apostrophe / Hyphen Rejection**: Checkout form regex `/^[a-zA-Z0-9 ]+$/` rejects valid names like `O'Connor` or `Mary-Jane`. | Real-world string sanitization |
| **BUG-008** | Inventory Limit | **Major** | **Max Stock Bypass**: Manually typing `50` in cart quantity for Product #2 (which has only 3 in stock) bypasses inventory limits. | Inventory constraints |
| **BUG-009** | Error Handling | **Major** | **Special Character Search Crash**: Searching with `%`, `'`, or `?` triggers an unhandled 500 server error modal instead of an empty results view. | Error handling resilience |
| **BUG-010** | Filter Validation | **Medium** | **Inverted Price Range**: Entering Min Price ($80) higher than Max Price ($20) is accepted without validation. | Relational boundary validation |
| **BUG-011** | State Persistence | **Medium** | **Cart Lost on Page Reload (F5)**: Refreshing the browser resets the guest cart to empty because local storage persistence is missing. | Session resilience |
| **BUG-012** | Input Validation | **Medium** | **Future Expiry Date (12/30) Flagged as Expired**: Entering December 2030 triggers "Card expired" due to two-digit year parsing defect. | Date parsing boundaries |
| **BUG-013** | Responsive UI | **Medium** | **Mobile Sticky Checkout Bar Overlap**: On viewport widths `< 450px`, the fixed checkout bar obscures the terms checkbox. | Responsive cross-device testing |
| **BUG-014** | Visual UI | **Minor** | **Broken Image Asset**: Product #6 ("Mechanical Keyboard") has a 404 image link without fallback placeholder. | Visual inspection, asset loading |
| **BUG-015** | Visual UI | **Minor** | **Missing Currency Symbol**: Product detail page renders price as `149.99` instead of `$149.99`. | Formatting consistency |
| **BUG-016** | Usability | **Minor** | **Filter Reset Inconsistency**: "Clear All Filters" button clears text query but leaves category checkboxes checked. | Form state reset testing |
| **BUG-017** | Accessibility | **Minor** | **Modal Escape Key Non-Responsive**: Terms of Service modal cannot be closed using `Esc` key and close icon lacks `aria-label`. | Keyboard a11y (WCAG) |
| **BUG-018** | Security | **Medium** | **Unsanitized Review Submission (XSS)**: Submitting review comments with HTML tags (e.g. `<b>`, `<i>`) renders raw unescaped HTML. | Security QA, sanitization |
| **BUG-019** | Navigation | **Minor** | **Browser Back Button After Order**: Pressing browser back after order confirmation returns to populated payment form. | History navigation lifecycle |
| **BUG-020** | Business Logic | **Major** | **Cart Remove Wrong Item**: In a multi-item cart, clicking "Remove" on item 2 deletes item 1 due to off-by-one array index defect. | Array indexing, CRUD operations |

---

## 🚀 Quick Start & How to Run

### 1. Launch the Server
```bash
./run.sh
# Or directly:
python3 app.py
```
The server runs on **`http://localhost:8000`** with zero external dependencies (pure Python standard library + Jinja2 + SQLite).

---

## 👥 How to Conduct an Assessment

### Step 1: Candidate Starts the Assessment
Send the candidate to:
👉 **`http://localhost:8000/brief`**

1. The candidate reads the **Product Requirements (PRD)** and testing protocol.
2. They enter their name and email to start an isolated session.
3. They are redirected to the store with a floating **"🐞 Report Bug"** drawer in the bottom right corner.
4. They explore the store, uncover defects, and log them (Summary, Steps to Reproduce, Expected vs Actual, Severity).
5. When finished, they click **"Finish & Submit Assessment"**.

### Step 2: Hiring Manager Evaluates the Candidate
Visit the Evaluator Dashboard:
👉 **`http://localhost:8000/admin`**

1. View all candidates and their submitted reports.
2. Click **"Review & Grade"** on any applicant to open their detailed grading sheet.
3. The platform displays:
   - **Coverage Matrix**: Visual grid showing which of the 20 seeded bugs were discovered vs missed.
   - **Automated Bug Matching**: Matches candidate descriptions to canonical bug IDs (e.g., `BUG-001`, `BUG-002`) with match confidence.
   - **Report Quality Verification**: Reviewer inspects the clarity of reproduction steps and verifies if Expected vs Actual outcomes were accurately stated.
   - **Final Decision & Score**: Assign an overall score (0–100), hiring recommendation (*Strong Pass*, *Pass*, *Consider*, *Reject*), and evaluation notes.
