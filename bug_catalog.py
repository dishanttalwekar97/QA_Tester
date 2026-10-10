"""
Master Ground-Truth Catalog of 20 Seeded Bugs.
Kept strictly server-side — never exposed to the candidate.
"""

SEEDED_BUGS = [
    {
        "id": "BUG-001",
        "category": "Business Logic",
        "severity": "Blocker",
        "title": "Negative Quantity in Cart Reduces Order Total",
        "description": "Typing a negative quantity (-1, -5) in the cart item input reduces the line item price and subtracts from the subtotal, effectively granting an unauthorized discount or negative bill.",
        "trigger_steps": "1. Add any product to cart. 2. Navigate to cart. 3. Change quantity field to -1. 4. Observe subtotal decreases below actual price.",
        "expected": "Cart should reject negative values, restore minimum quantity of 1, and validate positive integer input.",
        "actual": "Negative integer is accepted, multiplying unit price by negative number and decreasing the total.",
        "keywords": ["negative", "quantity", "cart", "discount", "subtotal", "below zero", "reduce", "minus", "less than zero"],
        "points": 10
    },
    {
        "id": "BUG-002",
        "category": "Business Logic",
        "severity": "Blocker",
        "title": "Infinite Coupon Code Stacking",
        "description": "Applying the discount coupon 'SAVE20' consecutively multiple times continues to apply 20% off recursively without checking if it was already applied.",
        "trigger_steps": "1. Add product to cart. 2. Enter coupon code 'SAVE20' and click Apply. 3. Click Apply again repeatedly. 4. Total continues decreasing exponentially.",
        "expected": "Coupon should apply only once per order with a message 'Coupon already applied'.",
        "actual": "Coupon can be applied unlimited times, stacking additional 20% discounts repeatedly.",
        "keywords": ["coupon", "discount", "save20", "stack", "stacking", "multiple times", "infinite", "promo", "voucher"],
        "points": 10
    },
    {
        "id": "BUG-003",
        "category": "Concurrency & State",
        "severity": "Blocker",
        "title": "Double-Clicking 'Place Order' Creates Duplicate Orders",
        "description": "The 'Place Order' button does not debounce or disable upon click, allowing rapid double-clicking to trigger duplicate order creations with separate IDs.",
        "trigger_steps": "1. Proceed to final checkout step. 2. Rapidly double-click 'Place Order'. 3. Observe two identical orders created in order history.",
        "expected": "Button should disable immediately on first click and display a loading spinner until checkout request completes.",
        "actual": "Multiple order submissions fire concurrently, creating duplicate orders.",
        "keywords": ["double click", "duplicate", "order", "place order", "debounce", "two orders", "multiple orders", "rapid click"],
        "points": 10
    },
    {
        "id": "BUG-004",
        "category": "Business Logic",
        "severity": "Major",
        "title": "Free Shipping Threshold Discrepancy",
        "description": "The promotional header claims 'Free Shipping on orders over $50', but the checkout calculation continues charging $10.00 shipping until the order exceeds $100.",
        "trigger_steps": "1. Add items totaling between $50 and $99 (e.g., $65.00). 2. View cart/checkout. 3. Shipping is charged at $10.00 instead of $0.00.",
        "expected": "Orders with subtotal >= $50.00 should receive free shipping ($0.00).",
        "actual": "Shipping remains $10.00 until order subtotal exceeds $100.00.",
        "keywords": ["shipping", "free shipping", "threshold", "$50", "banner", "delivery fee", "10", "calculation"],
        "points": 7
    },
    {
        "id": "BUG-005",
        "category": "Cart State",
        "severity": "Major",
        "title": "Zero Quantity Item Remains in Cart as Ghost Item",
        "description": "Entering 0 in the item quantity field does not remove the item or prompt for removal; the item lingers with $0.00 line total.",
        "trigger_steps": "1. Add item to cart. 2. Edit quantity to 0. 3. Item remains listed in cart table with 0 qty and $0.00 total.",
        "expected": "Setting quantity to 0 should automatically remove the item from cart or prompt confirmation.",
        "actual": "Item remains in cart as a 0-quantity row.",
        "keywords": ["zero", "0 quantity", "remove item", "ghost item", "quantity 0", "not removed"],
        "points": 7
    },
    {
        "id": "BUG-006",
        "category": "Data Consistency",
        "severity": "Major",
        "title": "In-Stock Badge vs Add-to-Cart Failure for Product #4",
        "description": "Product #4 (Noise-Cancelling Headphones Pro) displays 'In Stock (12 left)' on the catalog card, but clicking 'Add to Cart' fails with an 'Item is out of stock' error toast.",
        "trigger_steps": "1. Find 'Noise-Cancelling Headphones Pro' on catalog page. 2. Note 'In Stock (12 left)' badge. 3. Click 'Add to Cart'. 4. Error notification appears: 'Out of stock'.",
        "expected": "Catalog inventory badge and cart availability must match; if out of stock, badge should display 'Out of Stock' and button should be disabled.",
        "actual": "Catalog claims item is in stock while action treats it as out of stock.",
        "keywords": ["in stock", "out of stock", "headphones", "badge", "inventory mismatch", "toast error", "product 4"],
        "points": 7
    },
    {
        "id": "BUG-007",
        "category": "Input Validation",
        "severity": "Major",
        "title": "Name Field Rejects Apostrophes and Hyphens",
        "description": "Checkout shipping address validation rejects legitimate names containing apostrophes (e.g., O'Connor) or hyphens (e.g., Smith-Jones) with an 'Invalid characters' error.",
        "trigger_steps": "1. Add item and go to checkout. 2. Enter 'Liam O'Connor' in Full Name field. 3. Attempt to proceed. 4. Validation error blocks form.",
        "expected": "Name field should permit valid name characters including apostrophes, hyphens, and international letters.",
        "actual": "Regex rejects any non-pure-alphanumeric characters.",
        "keywords": ["apostrophe", "hyphen", "name", "o'connor", "special characters", "validation error", "shipping form", "regex"],
        "points": 7
    },
    {
        "id": "BUG-008",
        "category": "Inventory Validation",
        "severity": "Major",
        "title": "Max Stock Limit Bypass via Manual Typing",
        "description": "Product #2 (Ergonomic Wireless Mouse) only has 3 units in stock. Manually typing '50' into the cart quantity field bypasses inventory limits and allows ordering 50 units.",
        "trigger_steps": "1. Add Ergonomic Wireless Mouse to cart. 2. Open cart. 3. Type '50' into quantity field. 4. Proceed to checkout successfully with 50 units.",
        "expected": "System should enforce stock ceiling (max 3 units) and show validation error if requested quantity exceeds stock.",
        "actual": "Cart permits typing any number exceeding available inventory without validation.",
        "keywords": ["stock limit", "exceed stock", "inventory", "max quantity", "50", "available quantity", "bypass"],
        "points": 7
    },
    {
        "id": "BUG-009",
        "category": "Error Handling",
        "severity": "Major",
        "title": "Special Characters in Search Query Cause 500 Server Error",
        "description": "Searching for characters such as '%', '?', or '\'' triggers an unhandled 500 error modal instead of gracefully displaying an empty results view.",
        "trigger_steps": "1. In product search bar, enter '%' or '?'. 2. Press Enter or click Search. 3. Server 500 error dialog/crash appears.",
        "expected": "Search query should be sanitized and display 'No products found matching your search'.",
        "actual": "Application encounters unhandled exception and displays 500 internal server error.",
        "keywords": ["search", "500", "server error", "special character", "%", "crash", "unhandled error"],
        "points": 7
    },
    {
        "id": "BUG-010",
        "category": "Filter Validation",
        "severity": "Medium",
        "title": "Inverted Price Filter Range Accepted Without Error",
        "description": "Setting Min Price higher than Max Price (e.g. Min: $100, Max: $20) is accepted without validation, resulting in broken/empty catalog results.",
        "trigger_steps": "1. In sidebar filter, set Min Price to $100. 2. Set Max Price to $20. 3. Click Apply Filter. 4. Filter applies without validation warning.",
        "expected": "Form should validate that Min Price must be less than or equal to Max Price.",
        "actual": "Inverted range is processed with no validation warning.",
        "keywords": ["filter", "price range", "min price", "max price", "inverted", "greater than", "boundary"],
        "points": 5
    },
    {
        "id": "BUG-011",
        "category": "State Persistence",
        "severity": "Medium",
        "title": "Cart State Lost on Page Reload (F5)",
        "description": "Items added to the cart by a guest user are completely wiped out when the user refreshes the browser page (F5 / Reload).",
        "trigger_steps": "1. Add 2 products to cart. 2. Verify cart counter shows 2. 3. Refresh page (F5). 4. Cart resets to 0 items.",
        "expected": "Cart contents should persist across browser reloads using localStorage or session store.",
        "actual": "Cart is kept solely in transient memory and resets upon refresh.",
        "keywords": ["reload", "refresh", "f5", "cart lost", "persistence", "localStorage", "reset on refresh", "cleared"],
        "points": 5
    },
    {
        "id": "BUG-012",
        "category": "Input Validation",
        "severity": "Medium",
        "title": "Valid Future Credit Card Expiry Date (12/30) Flagged as Expired",
        "description": "Entering a valid future expiration date like '12/30' (December 2030) during checkout produces a 'Card has expired' validation error due to two-digit year parsing defect.",
        "trigger_steps": "1. Proceed to payment step. 2. Enter card expiry as '12/30'. 3. Click Place Order. 4. Validation error claims card is expired.",
        "expected": "Year '30' should parse as 2030 (future date) and pass validation.",
        "actual": "Parser treats '30' as 1930 or evaluates year improperly, falsely rejecting active future cards.",
        "keywords": ["credit card", "expiry", "expiration date", "12/30", "card expired", "year 30", "payment validation"],
        "points": 5
    },
    {
        "id": "BUG-013",
        "category": "Responsive UI",
        "severity": "Medium",
        "title": "Sticky Checkout Bar Overlaps Terms Checkbox on Mobile Viewports (<450px)",
        "description": "On small screen widths (<450px), the sticky bottom checkout bar overlays the 'I agree to Terms & Conditions' checkbox and order totals, making them inaccessible.",
        "trigger_steps": "1. Resize window or switch to mobile viewport (<450px). 2. Navigate to checkout. 3. Scroll to bottom. 4. Observe sticky footer covering checkbox.",
        "expected": "Adequate bottom padding should prevent fixed elements from obscuring interactive form inputs.",
        "actual": "Sticky footer obstructs checkbox, preventing completion without zooming or DOM manipulation.",
        "keywords": ["mobile", "overlap", "sticky", "responsive", "checkbox", "terms", "viewport", "obscured", "z-index"],
        "points": 5
    },
    {
        "id": "BUG-014",
        "category": "Visual UI",
        "severity": "Minor",
        "title": "Broken Image Asset for Product #6",
        "description": "Product #6 ('Ultra-Slim Mechanical Keyboard') links to a non-existent image URL (`/static/images/keyboard_broken.png`), rendering a broken image icon without fallback placeholder.",
        "trigger_steps": "1. Navigate to catalog. 2. Scroll to 'Ultra-Slim Mechanical Keyboard'. 3. Observe broken image icon.",
        "expected": "All product images should resolve properly or display a graceful fallback placeholder.",
        "actual": "Broken image icon with 404 console error displayed.",
        "keywords": ["broken image", "image 404", "missing image", "keyboard", "thumbnail", "fallback", "picture"],
        "points": 3
    },
    {
        "id": "BUG-015",
        "category": "Visual UI",
        "severity": "Minor",
        "title": "Missing Currency Symbol on Product Detail Page",
        "description": "On the Product Detail page, the price value displays as a bare float (e.g., '149.99') missing the '$' currency symbol, whereas the catalog shows '$149.99'.",
        "trigger_steps": "1. Click on any product to open detail page. 2. Inspect the price banner. 3. Displays '149.99' instead of '$149.99'.",
        "expected": "Price formatting should be uniform and include currency symbol ($).",
        "actual": "Currency symbol is omitted on product detail view.",
        "keywords": ["currency", "dollar sign", "$", "missing symbol", "product detail", "price format"],
        "points": 3
    },
    {
        "id": "BUG-016",
        "category": "Usability",
        "severity": "Minor",
        "title": "'Clear All Filters' Fails to Uncheck Category Checkboxes",
        "description": "Clicking 'Clear All Filters' resets the search query text input but leaves the category checkboxes checked.",
        "trigger_steps": "1. Select 'Electronics' category checkbox. 2. Type text in search box. 3. Click 'Clear All Filters'. 4. Search box clears, but category checkbox remains checked.",
        "expected": "All active filter controls including checkboxes, dropdowns, and sliders should reset to default unselected states.",
        "actual": "Only text input is reset; category checkboxes remain selected.",
        "keywords": ["clear filters", "reset", "filter checkbox", "category", "clear all", "uncheck"],
        "points": 3
    },
    {
        "id": "BUG-017",
        "category": "Accessibility (a11y)",
        "severity": "Minor",
        "title": "Terms Modal Cannot Be Closed with Escape Key & Missing ARIA Label",
        "description": "The 'Terms of Service' modal dialog does not listen for keyboard `Escape` key events, and the close 'X' button lacks an accessible `aria-label` attribute.",
        "trigger_steps": "1. Open 'Terms of Service' modal from footer. 2. Press 'Esc' key on keyboard. 3. Modal remains open. 4. Inspect close button for missing aria-label.",
        "expected": "Accessible modal dialogs must close on 'Esc' keypress and provide aria-label='Close modal'.",
        "actual": "Escape key is ignored and close button lacks accessibility labels.",
        "keywords": ["escape", "esc key", "modal", "accessibility", "a11y", "aria-label", "keyboard navigation"],
        "points": 3
    },
    {
        "id": "BUG-018",
        "category": "Security",
        "severity": "Medium",
        "title": "Unsanitized Review Submission Renders Raw HTML (XSS)",
        "description": "Submitting a product review containing HTML formatting tags (e.g., `<b>Great</b>` or `<i>Fast</i>`) renders raw unescaped HTML on the page.",
        "trigger_steps": "1. Open product page. 2. In review form, enter text containing '<b>Bold Review</b>'. 3. Submit review. 4. Text renders formatted in bold rather than sanitized literal text.",
        "expected": "User-generated comments must be sanitized and rendered as plain escaped text.",
        "actual": "HTML elements are parsed and rendered directly into the DOM.",
        "keywords": ["xss", "html", "sanitization", "raw html", "review", "bold tag", "injection", "script"],
        "points": 5
    },
    {
        "id": "BUG-019",
        "category": "Navigation",
        "severity": "Minor",
        "title": "Browser Back Button from Order Confirmation Re-Exposes Payment Form",
        "description": "After completing an order and landing on the Order Confirmation page, clicking browser Back button returns to the active checkout form with card details still filled.",
        "trigger_steps": "1. Complete order checkout successfully. 2. On confirmation screen, press browser Back button. 3. Returns to pre-filled payment screen.",
        "expected": "Checkout history should replace state or redirect to order summary if order was already submitted.",
        "actual": "User can navigate backward into already completed transaction form.",
        "keywords": ["back button", "browser back", "confirmation", "navigation", "re-exposed", "card details", "history"],
        "points": 3
    },
    {
        "id": "BUG-020",
        "category": "Business Logic",
        "severity": "Major",
        "title": "Removing 2nd Item in Cart Accidentally Removes 1st Item",
        "description": "When cart contains multiple distinct items and user clicks 'Remove' on the 2nd item, an off-by-one array index defect causes the 1st item to be removed instead.",
        "trigger_steps": "1. Add 3 different items (Item A, Item B, Item C) to cart. 2. In cart view, click 'Remove' button on Item B. 3. Observe Item A was deleted instead of Item B.",
        "expected": "Clicking Remove on a specific line item should remove precisely that item.",
        "actual": "Off-by-one index error deletes the preceding item in the cart array.",
        "keywords": ["remove item", "wrong item", "deletes first", "cart delete", "off-by-one", "second item", "index bug"],
        "points": 7
    }
]

def match_candidate_report(report_title: str, report_steps: str, report_actual: str):
    """
    Evaluates candidate's report text against seeded bugs.
    Returns matched bug object or None, plus matching confidence score.
    """
    text = f"{report_title} {report_steps} {report_actual}".lower()
    best_match = None
    best_score = 0
    
    for bug in SEEDED_BUGS:
        score = 0
        # Check keywords
        for kw in bug["keywords"]:
            if kw.lower() in text:
                score += 15
        
        # Check specific bug id mentioned
        if bug["id"].lower() in text:
            score += 50
            
        if score > best_score and score >= 25:
            best_score = score
            best_match = bug
            
    confidence = min(100, best_score)
    return best_match, confidence
