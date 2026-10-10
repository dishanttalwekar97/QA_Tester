# ShopPulse — MERN Stack QA Tester Hiring Assessment Platform

A full-stack **MERN (MongoDB, Express, React, Node.js)** web application built specifically for hiring and assessing QA engineers through **strict black-box exploratory testing**.

---

## 🌟 MERN Architecture Overview

```
QA_Tester/
├── client/
│   └── public/
│       ├── index.html            # React Single Page App container
│       ├── style.css             # Modern styling & responsive breakpoints
│       ├── app.js                # React 18 component tree (Single Page App)
│       └── react-bundle.js       # Offline React micro-runtime fallback
├── server/
│   ├── server.js                 # Express REST API server
│   ├── db/
│   │   ├── mongo.js              # MongoDB document engine (Mongoose-compatible)
│   │   └── seedData.js           # 20 Seeded QA Bugs & initial product catalog
│   ├── models/
│   │   ├── Candidate.js          # MongoDB Candidate model
│   │   ├── BugReport.js          # MongoDB BugReport model (with candidate redaction)
│   │   └── Product.js            # MongoDB Product & Order models
│   └── utils/
│       └── bugMatcher.js         # Server-side similarity matching algorithm
├── data/                         # MongoDB document store collections (.json)
├── run.sh                        # One-click launcher script
└── package.json                  # MERN project definition
```

---

## 🛡️ Strict Black-Box Testing Principle

Candidates are evaluated under true exploratory testing conditions:
* **No Bug Counts**: The candidate interface contains **no** "Bugs found: 4/20" counters.
* **No Progress Indicators**: No completion percentages, category quotas, or checklists.
* **Personal Submission Log Only**: Candidates can view their own logged drafts to review what they personally reported, with **zero feedback** on whether a report is correct or valid.
* **Backend Isolation**: Ground-truth bug IDs and scores are stored strictly in MongoDB on the server and are **never** exposed in client-side bundles or network payloads.

---

## 🐞 The 20 Seeded Bugs (Ground-Truth Catalog)

| Bug ID | Category | Severity | Description | What It Evaluates |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Business Logic | **Blocker** | **Negative Quantity Exploit**: In cart, entering negative numbers (`-1`, `-5`) multiplies unit price negatively, lowering the order total or generating store credit. | Boundary testing, negative numbers |
| **BUG-002** | Business Logic | **Blocker** | **Infinite Coupon Stacking**: Entering `SAVE20` can be clicked repeatedly, continuously compounding 20% discounts endlessly. | Idempotency, promotional state |
| **BUG-003** | Concurrency | **Blocker** | **Double-Click Duplicate Order**: Rapidly clicking "Place Order" lacks debouncing and triggers duplicate orders with separate IDs. | Race conditions, button debouncing |
| **BUG-004** | Business Logic | **Major** | **Free Shipping Threshold Glitch**: Banner advertises "Free Shipping over $50", but the cart charges $10 shipping until subtotal > $100. | Specification compliance |
| **BUG-005** | Cart State | **Major** | **Zero Quantity Lingers**: Changing quantity to `0` leaves the item in the cart as a $0.00 ghost item instead of removing it. | Collection cleanup, edge-case input |
| **BUG-006** | Data Consistency | **Major** | **In-Stock Badge vs Add-to-Cart Failure**: Product #4 displays "In Stock (12 left)", but clicking "Add to Cart" triggers "Out of Stock" error toast. | Component state synchronization |
| **BUG-007** | Input Validation | **Major** | **Apostrophe / Hyphen Rejection**: Checkout form regex rejects valid names like `O'Connor` or `Mary-Jane`. | Real-world string sanitization |
| **BUG-008** | Inventory Limit | **Major** | **Max Stock Bypass**: Manually typing `50` in cart quantity for Product #2 (which has only 3 in stock) bypasses inventory limits. | Inventory constraints |
| **BUG-009** | Error Handling | **Major** | **Special Character Search Crash**: Searching with `%`, `'`, or `?` triggers an unhandled 500 server error modal instead of empty results. | Error handling resilience |
| **BUG-010** | Filter Validation | **Medium** | **Inverted Price Range**: Entering Min Price ($80) higher than Max Price ($20) is accepted without validation. | Relational boundary validation |
| **BUG-011** | State Persistence | **Medium** | **Cart Lost on Page Reload (F5)**: Refreshing the browser resets the cart to empty because local storage persistence is missing. | Session resilience |
| **BUG-012** | Input Validation | **Medium** | **Future Expiry Date (12/30) Flagged as Expired**: Entering December 2030 triggers "Card expired" due to two-digit year parsing defect. | Date parsing boundaries |
| **BUG-013** | Responsive UI | **Medium** | **Mobile Sticky Checkout Bar Overlap**: On viewport widths `< 450px`, the fixed checkout bar obscures the terms checkbox. | Responsive cross-device testing |
| **BUG-014** | Visual UI | **Minor** | **Broken Image Asset**: Product #6 ("Mechanical Keyboard") has a 404 image link without fallback placeholder. | Visual inspection, asset loading |
| **BUG-015** | Visual UI | **Minor** | **Missing Currency Symbol**: Product detail modal renders price as `149.99` instead of `$149.99`. | Formatting consistency |
| **BUG-016** | Usability | **Minor** | **Filter Reset Inconsistency**: "Clear All Filters" button clears text query but leaves category checkboxes checked. | Form state reset testing |
| **BUG-017** | Accessibility | **Minor** | **Modal Escape Key Non-Responsive**: Terms of Service modal cannot be closed using `Esc` key and close icon lacks `aria-label`. | Keyboard a11y (WCAG) |
| **BUG-018** | Security | **Medium** | **Unsanitized Review Submission (XSS)**: Submitting review comments with HTML tags (e.g. `<b>`, `<i>`) renders raw unescaped HTML. | Security QA, sanitization |
| **BUG-019** | Navigation | **Minor** | **Browser Back Button After Order**: Pressing browser back after order confirmation returns to populated payment form. | History navigation lifecycle |
| **BUG-020** | Business Logic | **Major** | **Cart Remove Wrong Item**: In a multi-item cart, clicking "Remove" on item 2 deletes item 1 due to off-by-one array index defect. | Array indexing, CRUD operations |

---

## 🚀 How to Run the MERN Application

### 1. Launch Server
```bash
cd /home/tinyworks/Desktop/Testing_exam/QA_Tester
./run.sh
```

### 2. Access in Browser
* **Candidate Briefing & Test Launch**: [http://localhost:8000/brief](http://localhost:8000/brief) (or [http://localhost:8000](http://localhost:8000))
* **Store Playground**: [http://localhost:8000](http://localhost:8000)
* **Evaluator / Admin Dashboard**: [http://localhost:8000/admin](http://localhost:8000/admin)

### 3. Run Automated Tests
```bash
bin/node test_mern_inprocess.js
```
