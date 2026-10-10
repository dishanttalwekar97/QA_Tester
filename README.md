# ShopPulse — MERN Stack QA Tester Hiring Assessment Platform

A full-stack **MERN (MongoDB, Express, React, Node.js)** web application built specifically for hiring and assessing QA engineers through **strict black-box exploratory testing**.

---

## 🌟 MERN Architecture Overview

```
QA_Tester/
├── client/
│   └── public/
│       ├── index.html            # React 18 Single Page App container
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

## 🚀 How to Run the MERN Application

### 1. Launch Server
```bash
cd /home/tinyworks/Desktop/Testing_exam/QA_Tester
./run.sh
```

### 2. Access in Browser
* **Candidate Briefing & Test Launch**: [http://localhost:8000/brief](http://localhost:8000/brief) (or [http://localhost:8000](http://localhost:8000))
* **Store Playground**: [http://localhost:8000](http://localhost:8000)
* **Evaluator / Admin Dashboard**: [http://localhost:8000/admin](http://localhost:8000/admin) *(Secured: Protected by Admin Security PIN `admin123` or `$ADMIN_PIN` environment variable. Unauthorized requests are rejected with 401)*

### 3. Run Automated Tests
```bash
# Core MERN models & blind matching test:
bin/node test_mern_inprocess.js

# Admin security, route lockdown & PIN auth verification:
bin/node test_admin_security.js
```

---

## 🐞 Master Known Errors & Seeded Bug Answer Key (Comprehensive Reviewer Guide)

This section serves as the **ground-truth answer key** for hiring managers and evaluators. The application contains exactly **20 intentional defects** spanning business logic, validation, edge cases, responsive layout, security, and accessibility.

---

### Category 1: Blocker / Critical Defects (10 Points Each)

#### 1. BUG-001: Negative Quantity in Cart Reduces Total Bill
* **Category:** Business Logic / Pricing Integrity
* **Severity:** **Blocker**
* **Code Location:** `client/public/app.js` (`handleUpdateQuantity`, line ~135)
* **Reproduction Steps:**
  1. Add any product (e.g. Aura Earbuds, $79.99) to the cart.
  2. Navigate to `/cart`.
  3. In the quantity input, type `-2` and blur/change.
  4. Inspect the item line total and order subtotal.
* **Expected Result:** Cart should only accept positive integers ($\ge 1$). Negative numbers must be rejected with validation or automatically reset to minimum 1.
* **Actual Defect:** Quantity accepts negative numbers and multiplies unit price by negative integer (`-2 * $79.99 = -$159.98`), reducing the total bill or resulting in negative balance.
* **Competency Tested:** Boundary value analysis, negative input testing, financial integrity.

#### 2. BUG-002: Infinite Coupon Code Stacking
* **Category:** Business Logic / Idempotency
* **Severity:** **Blocker**
* **Code Location:** `client/public/app.js` (`handleApplyCoupon`, line ~172)
* **Reproduction Steps:**
  1. Add an item to cart and proceed to `/cart`.
  2. Type promo code `SAVE20` into coupon box and click **Apply**.
  3. Click **Apply** multiple times consecutively.
* **Expected Result:** Coupon should apply strictly once per order. Subsequent attempts should show: *"Coupon already applied."*
* **Actual Defect:** Each click stacks an additional 20% discount recursively (`setCouponRate(prev => prev + 0.20)`), reducing the total bill toward $0.
* **Competency Tested:** Promotional state management, idempotency, repeat transaction testing.

#### 3. BUG-003: Double-Clicking 'Place Order' Creates Duplicate Orders
* **Category:** Concurrency / Race Conditions
* **Severity:** **Blocker**
* **Code Location:** `client/public/app.js` (`handlePlaceOrder`, line ~215)
* **Reproduction Steps:**
  1. Fill out checkout form details.
  2. Rapidly double-click the **Place Order Now ➔** button.
  3. Check the Orders collection in MongoDB or the Admin dashboard.
* **Expected Result:** The button should disable immediately on first click and display a loading spinner to prevent concurrent submissions.
* **Actual Defect:** Button has no debounce or disable flag; rapid clicks fire multiple concurrent POST requests, resulting in duplicate order creation.
* **Competency Tested:** Button debouncing, API throttling, duplicate payment prevention.

---

### Category 2: Major Severity Defects (7 Points Each)

#### 4. BUG-004: Free Shipping Threshold Discrepancy
* **Category:** Business Logic / Requirement Compliance
* **Severity:** **Major**
* **Code Location:** `client/public/app.js` (`calculateTotals`, line ~255)
* **Reproduction Steps:**
  1. Add an item totaling between $50.00 and $99.99 (e.g. Aura Earbuds, $79.99).
  2. View cart summary.
  3. Observe shipping line item.
* **Expected Result:** As advertised on the top banner (*"Free Shipping on all orders over $50.00"*), shipping fee should be `$0.00`.
* **Actual Defect:** Logic checks `subtotal >= 100 ? 0 : 10.00`, continuing to charge $10.00 shipping until subtotal exceeds $100.
* **Competency Tested:** Specification verification, promotional calculation validation.

#### 5. BUG-005: Zero Quantity Item Lingers as Ghost Item
* **Category:** Cart State / Data Lifecycle
* **Severity:** **Major**
* **Code Location:** `client/public/app.js` (`handleUpdateQuantity`, line ~135)
* **Reproduction Steps:**
  1. Add an item to cart and view `/cart`.
  2. Change the quantity input to `0`.
* **Expected Result:** Setting quantity to 0 should automatically remove the line item or prompt for removal confirmation.
* **Actual Defect:** Item remains in the cart table with quantity 0 and line total $0.00, lingering as a ghost row.
* **Competency Tested:** Zero-value edge case testing, collection cleanup.

#### 6. BUG-006: In-Stock Badge vs Add-to-Cart Failure for Product #4
* **Category:** Data Consistency / Inventory Sync
* **Severity:** **Major**
* **Code Location:** `client/public/app.js` (`handleAddToCart`, line ~110) & `server/db/seedData.js`
* **Reproduction Steps:**
  1. On the catalog page, find Product #4 ("Noise-Cancelling Headphones Pro").
  2. Note the green badge: `"In Stock (12 left)"`.
  3. Click **+ Add to Cart**.
* **Expected Result:** If an item is in stock, it should add to the cart. If out of stock, badge should indicate *"Out of Stock"* and button should be disabled.
* **Actual Defect:** Badge claims product is in stock, but clicking Add to Cart triggers an error toast: *"Error: Item is out of stock in warehouse inventory."*
* **Competency Tested:** Cross-component state consistency, warehouse inventory sync testing.

#### 7. BUG-007: Name Field Rejects Apostrophes and Hyphens
* **Category:** Input Validation / Real-World Sanitization
* **Severity:** **Major**
* **Code Location:** `client/public/app.js` (`handlePlaceOrder`, line ~185)
* **Reproduction Steps:**
  1. Navigate to `/cart` checkout form.
  2. Enter legitimate real-world names such as `Liam O'Connor` or `Anne-Marie Smith` in the Full Name field.
  3. Click Place Order.
* **Expected Result:** Form should accept valid punctuation marks found in legitimate human names (apostrophes, hyphens, accented characters).
* **Actual Defect:** Regex `/^[a-zA-Z0-9 ]+$/` strictly rejects any non-alphanumeric character with error: *"Full name must only contain alphanumeric characters without punctuation."*
* **Competency Tested:** Input validation, character set sanitization, internationalization.

#### 8. BUG-008: Max Stock Limit Bypass via Manual Typing
* **Category:** Inventory Constraints / Form Validation
* **Severity:** **Major**
* **Code Location:** `client/public/app.js` (`handleUpdateQuantity`, line ~135)
* **Reproduction Steps:**
  1. Add Product #2 ("Ergonomic Vertical Mouse", available stock: 3 units).
  2. Open cart.
  3. In the quantity box, type `50`.
  4. Proceed through checkout.
* **Expected Result:** Cart should validate quantity against available stock (`max="3"`) and show error if quantity exceeds available units.
* **Actual Defect:** Manual typing bypasses stock validation entirely, permitting orders exceeding warehouse inventory.
* **Competency Tested:** Client-side constraint bypass, inventory boundary checks.

#### 9. BUG-009: Special Characters in Search Crash Server with 500 Error
* **Category:** Error Handling / Resilience
* **Severity:** **Major**
* **Code Location:** `server/server.js` (line ~175) & `client/public/app.js`
* **Reproduction Steps:**
  1. In the product search bar, enter characters like `%`, `'`, or `?`.
  2. Click **Search** or press Enter.
* **Expected Result:** Search query should sanitize characters gracefully and return *"No products matched your criteria"*.
* **Actual Defect:** Unhandled exception triggers a red **500 Internal Server Error** crash modal.
* **Competency Tested:** API resilience, crash handling, special character fuzzing.

#### 10. BUG-020: Removing 2nd Item in Cart Accidentally Removes 1st Item
* **Category:** Business Logic / Array Indexing
* **Severity:** **Major**
* **Code Location:** `client/public/app.js` (`handleRemoveFromCart`, line ~150)
* **Reproduction Steps:**
  1. Add 3 distinct items to cart (e.g. Item 1: Earbuds, Item 2: Mouse, Item 3: Stand).
  2. Navigate to cart.
  3. Click **Remove** on the 2nd item (Mouse).
* **Expected Result:** Only the 2nd item (Mouse) should be removed from cart.
* **Actual Defect:** Off-by-one array index defect (`copy.splice(index - 1, 1)`) removes the preceding item (Item 1: Earbuds) instead.
* **Competency Tested:** CRUD operations, list management, array index boundary verification.

---

### Category 3: Medium Severity Defects (5 Points Each)

#### 11. BUG-010: Inverted Price Filter Range Accepted Without Error
* **Category:** Filter Validation / Relational Inputs
* **Severity:** **Medium**
* **Code Location:** `client/public/app.js` (line ~285)
* **Reproduction Steps:**
  1. In the sidebar filter, set **Min Price** to `$80` and **Max Price** to `$20`.
  2. Observe catalog grid.
* **Expected Result:** Form should validate that Min Price $\le$ Max Price and show validation warning.
* **Actual Defect:** Inverted range is silently processed without warning, resulting in an empty catalog.
* **Competency Tested:** Relational input validation, boundary checking.

#### 12. BUG-011: Cart State Lost on Page Reload (F5)
* **Category:** State Persistence / Session Resilience
* **Severity:** **Medium**
* **Code Location:** `client/public/app.js` (`const [cart, setCart] = useState([])`)
* **Reproduction Steps:**
  1. Add 3 products to the cart.
  2. Note cart badge counter shows `3`.
  3. Refresh the browser page (**F5** or Ctrl+R).
* **Expected Result:** Cart contents should persist across reloads using `localStorage` or session store.
* **Actual Defect:** Cart resides solely in volatile memory and resets to empty on refresh.
* **Competency Tested:** Session state persistence, reload resilience.

#### 13. BUG-012: Valid Future Expiry Date (12/30) Flagged as Expired
* **Category:** Input Validation / Date Logic
* **Severity:** **Medium**
* **Code Location:** `client/public/app.js` (`handlePlaceOrder`, line ~195)
* **Reproduction Steps:**
  1. In checkout payment section, enter card expiry as `12/30` (December 2030).
  2. Click Place Order.
* **Expected Result:** Expiry date in 2030 is in the future and should pass validation.
* **Actual Defect:** Defective year comparison evaluates `30` incorrectly and flags: *"Card Error: Your card has expired."*
* **Competency Tested:** Date boundary analysis, format parsing logic.

#### 14. BUG-013: Sticky Checkout Bar Overlaps Terms Checkbox on Mobile (<450px)
* **Category:** Responsive UI / Viewport Breakpoints
* **Severity:** **Medium**
* **Code Location:** `client/public/style.css` (`@media (max-width: 450px) .checkout-sticky-bar`)
* **Reproduction Steps:**
  1. Resize browser window or switch to mobile viewport width `< 450px`.
  2. Scroll to the bottom of the checkout view.
* **Expected Result:** Adequate bottom padding should keep form inputs accessible above fixed footers.
* **Actual Defect:** Fixed sticky bar overlays the "Terms of Service" checkbox, making it unclickable.
* **Competency Tested:** Responsive cross-device testing, CSS z-index and fixed element layout.

#### 15. BUG-018: Unsanitized Review Submission Renders Raw HTML (XSS)
* **Category:** Security / Input Sanitization
* **Severity:** **Medium**
* **Code Location:** `client/public/app.js` (`renderProductModal`, line ~365)
* **Reproduction Steps:**
  1. Open any product detail view.
  2. In review comment box, enter: `<b>Superb product!</b> <i>Highly recommend.</i>`.
  3. Click **Post**.
* **Expected Result:** User comments should be sanitized and rendered as literal plain text.
* **Actual Defect:** HTML formatting is injected raw via `dangerouslySetInnerHTML`, parsing tags directly into DOM.
* **Competency Tested:** Security QA, Cross-Site Scripting (XSS) awareness, sanitization.

---

### Category 4: Minor Severity Defects (3 Points Each)

#### 16. BUG-014: Broken Product Image Asset for Product #6
* **Category:** Visual UI / Media Loading
* **Severity:** **Minor**
* **Code Location:** `server/db/seedData.js` (`/static/images/keyboard_broken.png`)
* **Reproduction Steps:**
  1. Browse the store catalog.
  2. Inspect the thumbnail for Product #6 ("Ultra-Slim Mechanical Keyboard").
* **Expected Result:** All product images should load cleanly or display a fallback placeholder.
* **Actual Defect:** Image link returns 404, displaying a broken image icon.
* **Competency Tested:** Visual inspection, 404 network asset tracking.

#### 17. BUG-015: Missing Currency Symbol on Product Detail Page
* **Category:** Visual UI / Localization Consistency
* **Severity:** **Minor**
* **Code Location:** `client/public/app.js` (`renderProductModal`, line ~350)
* **Reproduction Steps:**
  1. Click any product to open the detail modal.
  2. Inspect the price display banner.
* **Expected Result:** Price should display formatted with currency symbol (e.g. `$149.99`).
* **Actual Defect:** Price renders as a bare float (`149.99`) missing the `$` sign.
* **Competency Tested:** Formatting consistency, localization inspection.

#### 18. BUG-016: Clear All Filters Fails to Uncheck Category Checkboxes
* **Category:** Usability / Form State
* **Severity:** **Minor**
* **Code Location:** `client/public/app.js` (`handleClearFilters`, line ~178)
* **Reproduction Steps:**
  1. Check category "Audio", type search text, and set price.
  2. Click **Clear All Filters**.
* **Expected Result:** All active filter controls (search text, sliders, and checkboxes) should reset.
* **Actual Defect:** Search text and prices clear, but category checkboxes remain selected.
* **Competency Tested:** Reset workflow verification, state cleanup.

#### 19. BUG-017: Modal Escape Key Non-Responsive & Missing ARIA Label
* **Category:** Accessibility (a11y) / Keyboard Navigation
* **Severity:** **Minor**
* **Code Location:** `client/public/app.js` (`renderTermsModal`, line ~225)
* **Reproduction Steps:**
  1. Click "Terms of Service" to open modal.
  2. Press the `Esc` key on keyboard.
  3. Inspect modal close button in DevTools Elements.
* **Expected Result:** Accessible modals must dismiss on `Esc` key and close button must include `aria-label="Close"`.
* **Actual Defect:** Escape key is ignored and close button lacks accessibility labels.
* **Competency Tested:** WCAG 2.1 accessibility, keyboard trap avoidance.

#### 20. BUG-019: Browser Back Button After Order Re-Exposes Payment Form
* **Category:** Navigation / History Lifecycle
* **Severity:** **Minor**
* **Code Location:** `client/public/app.js` (`renderCartView`, line ~385)
* **Reproduction Steps:**
  1. Complete an order to reach the Order Confirmation screen.
  2. Click browser **Back** button.
* **Expected Result:** Browser should redirect or display an empty/completed state.
* **Actual Defect:** Previous populated checkout form re-appears with card details intact.
* **Competency Tested:** Navigation history hygiene, sensitive data lifecycle.

---

## 📊 Candidate Scoring & Evaluation Matrix

| Score Range | Recommendation | QA Seniority Profile |
| :--- | :--- | :--- |
| **85% – 100%** | **Strong Pass** | **Senior QA**: Discovered all critical logic/race-condition defects (BUG-001, BUG-002, BUG-003), plus security (BUG-018) and responsive/a11y bugs with minimal, reproducible steps. |
| **65% – 84%** | **Pass** | **Mid QA**: Strong functional coverage (caught negative quantities, shipping discrepancies, max stock limits, and form validations). |
| **40% – 64%** | **Consider** | **Junior QA**: Caught obvious visual and cosmetic defects (broken images, missing symbols, clear filter bugs) but missed subtle business logic edge cases. |
| **< 40%** | **Reject** | Low exploratory initiative, poor reproduction steps clarity, or high false-positive rate. |

---

## 📋 Quick Reference: 20 Seeded Bugs (One-Liner Summary)

* **BUG-001**: **Negative Quantity in Cart Reduces Order Total** — Entering negative quantities in the cart reduces the line item total, giving an unauthorized discount or negative bill.
* **BUG-002**: **Infinite Coupon Code Stacking** — Repeatedly clicking "Apply" on promo code `SAVE20` compounds 20% discounts indefinitely without limit.
* **BUG-003**: **Double-Clicking 'Place Order' Creates Duplicate Orders** — Checkout button lacks click debouncing or disabling, creating multiple orders on rapid clicks.
* **BUG-004**: **Free Shipping Threshold Discrepancy** — Banner promises free shipping over $50, but cart calculation continues charging $10 shipping until subtotal exceeds $100.
* **BUG-005**: **Zero Quantity Item Remains in Cart as Ghost Item** — Setting item quantity to 0 fails to remove the product, leaving a $0.00 ghost line item in the cart.
* **BUG-006**: **In-Stock Badge vs Add-to-Cart Failure for Product #4** — Catalog displays "In Stock (12 left)" for headphones, but clicking "Add to Cart" triggers an "Out of stock" error toast.
* **BUG-007**: **Name Field Rejects Apostrophes and Hyphens** — Checkout name validation regex rejects legitimate human names containing apostrophes or hyphens (e.g., *O'Connor*, *Mary-Jane*).
* **BUG-008**: **Max Stock Limit Bypass via Manual Typing** — Manually typing a quantity into the cart input bypasses inventory limits, allowing orders exceeding available stock.
* **BUG-009**: **Special Characters in Search Query Cause 500 Server Error** — Searching for special characters (`%`, `?`, `'`) triggers an unhandled 500 internal server error crash modal.
* **BUG-010**: **Inverted Price Filter Range Accepted Without Error** — Setting Min Price higher than Max Price (e.g., $80 to $20) is accepted without validation, producing a blank catalog.
* **BUG-011**: **Cart State Lost on Page Reload (F5)** — Cart contents reside strictly in volatile component state and are lost when the page is refreshed.
* **BUG-012**: **Valid Future Expiry Date (12/30) Flagged as Expired** — Expiration date comparison logic misparses two-digit future years (e.g., December 2030) as already expired.
* **BUG-013**: **Sticky Checkout Bar Overlaps Terms Checkbox on Mobile (<450px)** — On mobile viewports under 450px, the fixed bottom bar obstructs the terms checkbox and totals.
* **BUG-014**: **Broken Image Asset for Product #6** — Product #6 ("Ultra-Slim Mechanical Keyboard") links to a non-existent image (`keyboard_broken.png`), returning 404 without a fallback.
* **BUG-015**: **Missing Currency Symbol on Product Detail Page** — Product detail modal displays price as a bare float (e.g., `149.99`) missing the `$` currency symbol.
* **BUG-016**: **'Clear All Filters' Fails to Uncheck Category Checkboxes** — Clicking "Clear All Filters" resets search text and prices but leaves category filter checkboxes selected.
* **BUG-017**: **Terms Modal Cannot Be Closed with Escape Key & Missing ARIA Label** — Terms modal ignores the keyboard Escape key and its close button lacks an `aria-label` attribute.
* **BUG-018**: **Unsanitized Review Submission Renders Raw HTML (XSS)** — Submitting user reviews with HTML tags (e.g., `<b>Great</b>`) renders unescaped HTML directly in the DOM.
* **BUG-019**: **Browser Back Button After Order Re-Exposes Payment Form** — Clicking browser Back after order completion returns to the populated checkout form with card details exposed.
* **BUG-020**: **Removing 2nd Item in Cart Accidentally Removes 1st Item** — In a multi-item cart, clicking "Remove" on the 2nd item deletes the 1st item instead due to an off-by-one array index defect.
