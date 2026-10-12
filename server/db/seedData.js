/**
 * Ground-Truth Master Catalog of 40 Seeded Bugs & Product Catalog
 */

const SEEDED_BUGS = [
  {
    id: "BUG-001",
    category: "Business Logic",
    severity: "Blocker",
    title: "Negative Quantity in Cart Reduces Order Total",
    description: "Entering a negative quantity (-1, -5) in the cart item input reduces the line item total, giving an unauthorized discount or negative bill.",
    triggerSteps: "1. Add item to cart. 2. Edit quantity to -1. 3. Observe total reduces.",
    expected: "Cart should only accept positive integers and reject values <= 0.",
    actual: "Negative quantity multiplies unit price by negative number, decreasing the order total.",
    keywords: ["negative", "quantity", "cart", "discount", "subtotal", "below zero", "reduce", "minus"],
    points: 10
  },
  {
    id: "BUG-002",
    category: "Business Logic",
    severity: "Blocker",
    title: "Infinite Coupon Code Stacking",
    description: "Applying promo code SAVE20 repeatedly stacks 20% discounts exponentially without checking if already applied.",
    triggerSteps: "1. Add item to cart. 2. Enter code SAVE20 and click Apply. 3. Click Apply again repeatedly.",
    expected: "Coupon should apply only once per transaction.",
    actual: "Each click applies an additional 20% discount on the remaining balance.",
    keywords: ["coupon", "discount", "save20", "stack", "stacking", "multiple times", "infinite", "promo"],
    points: 10
  },
  {
    id: "BUG-003",
    category: "Concurrency & State",
    severity: "Blocker",
    title: "Double-Clicking 'Place Order' Creates Duplicate Orders",
    description: "Place Order button lacks debouncing/disabling on click, causing rapid double-clicks to fire duplicate API requests.",
    triggerSteps: "1. Proceed to checkout. 2. Double-click Place Order rapidly.",
    expected: "Button should disable immediately upon first click and display a loading state.",
    actual: "Two duplicate orders are created with different IDs.",
    keywords: ["double click", "duplicate", "order", "place order", "debounce", "two orders", "multiple orders"],
    points: 10
  },
  {
    id: "BUG-004",
    category: "Business Logic",
    severity: "Major",
    title: "Free Shipping Threshold Discrepancy",
    description: "Banner promises 'Free Shipping over $50', but checkout calculation continues charging $10.00 shipping until subtotal > $100.",
    triggerSteps: "1. Add item totaling between $50 and $99. 2. Check cart/checkout shipping cost.",
    expected: "Orders with subtotal >= $50.00 must receive free shipping ($0.00).",
    actual: "Shipping remains $10.00 until order subtotal exceeds $100.00.",
    keywords: ["shipping", "free shipping", "threshold", "$50", "banner", "delivery fee", "10", "calculation"],
    points: 7
  },
  {
    id: "BUG-005",
    category: "Cart State",
    severity: "Major",
    title: "Zero Quantity Item Remains in Cart as Ghost Item",
    description: "Entering 0 in quantity input does not remove the item; it lingers as a $0.00 row affecting line item counts.",
    triggerSteps: "1. Add item to cart. 2. Change quantity to 0.",
    expected: "Setting quantity to 0 should remove the item from the cart.",
    actual: "Item remains in cart table with 0 quantity and $0.00 total.",
    keywords: ["zero", "0 quantity", "remove item", "ghost item", "quantity 0", "not removed"],
    points: 7
  },
  {
    id: "BUG-006",
    category: "Data Consistency",
    severity: "Major",
    title: "In-Stock Badge vs Add-to-Cart Failure for Product #4",
    description: "Product #4 (Noise-Cancelling Headphones Pro) shows 'In Stock (12 left)', but clicking 'Add to Cart' produces an 'Out of stock' error toast.",
    triggerSteps: "1. Locate Product #4 on catalog. 2. Note 'In Stock' badge. 3. Click 'Add to Cart'.",
    expected: "UI badge and cart action availability must match.",
    actual: "Badge claims item is in stock while action fails with out of stock error.",
    keywords: ["in stock", "out of stock", "headphones", "badge", "inventory mismatch", "toast error", "product 4"],
    points: 7
  },
  {
    id: "BUG-007",
    category: "Input Validation",
    severity: "Major",
    title: "Name Field Rejects Apostrophes and Hyphens",
    description: "Checkout form validation regex rejects legitimate names like O'Connor or Mary-Jane with an 'Invalid characters' error.",
    triggerSteps: "1. In checkout, enter 'Liam O'Connor' in Full Name. 2. Attempt to proceed.",
    expected: "Name field should permit valid name characters including apostrophes and hyphens.",
    actual: "Regex rejects any non-pure-alphanumeric characters.",
    keywords: ["apostrophe", "hyphen", "name", "o'connor", "special characters", "validation error", "shipping form"],
    points: 7
  },
  {
    id: "BUG-008",
    category: "Inventory Validation",
    severity: "Major",
    title: "Max Stock Limit Bypass via Manual Typing",
    description: "Product #2 has only 3 units in stock. Manually typing '50' into cart quantity allows placing an order for 50 units.",
    triggerSteps: "1. Add Ergonomic Mouse to cart. 2. Type 50 in quantity input. 3. Checkout.",
    expected: "System should enforce stock ceiling of 3 units.",
    actual: "Cart permits typing any number exceeding available inventory without constraint.",
    keywords: ["stock limit", "exceed stock", "inventory", "max quantity", "50", "available quantity", "bypass"],
    points: 7
  },
  {
    id: "BUG-009",
    category: "Error Handling",
    severity: "Major",
    title: "Special Characters in Search Query Cause 500 Server Error",
    description: "Searching for characters such as '%', '?', or '\'' triggers an unhandled 500 error modal crash.",
    triggerSteps: "1. In search bar, type '%' or '?'. 2. Press Enter.",
    expected: "Search query should sanitize and return 'No products found'.",
    actual: "Application crashes with 500 internal server error dialog.",
    keywords: ["search", "500", "server error", "special character", "%", "crash", "unhandled error"],
    points: 7
  },
  {
    id: "BUG-010",
    category: "Filter Validation",
    severity: "Medium",
    title: "Inverted Price Filter Range Accepted Without Error",
    description: "Setting Min Price higher than Max Price (e.g. Min: $80, Max: $20) is accepted without validation, resulting in blank catalog.",
    triggerSteps: "1. In filter sidebar, set Min: 80, Max: 20. 2. Click Apply Filters.",
    expected: "Form should validate that Min Price must be less than or equal to Max Price.",
    actual: "Inverted range is processed with no validation warning.",
    keywords: ["filter", "price range", "min price", "max price", "inverted", "greater than", "boundary"],
    points: 5
  },
  {
    id: "BUG-011",
    category: "State Persistence",
    severity: "Medium",
    title: "Cart State Lost on Page Reload (F5)",
    description: "Items in the cart reset to empty when the user refreshes the browser page.",
    triggerSteps: "1. Add items to cart. 2. Refresh browser page (F5). 3. Cart resets to empty.",
    expected: "Cart contents should persist across reloads using localStorage or session store.",
    actual: "Cart state is kept solely in volatile memory and resets upon refresh.",
    keywords: ["reload", "refresh", "f5", "cart lost", "persistence", "localStorage", "reset on refresh"],
    points: 5
  },
  {
    id: "BUG-012",
    category: "Input Validation",
    severity: "Medium",
    title: "Valid Future Expiry Date (12/30) Flagged as Expired",
    description: "Entering valid future expiration date '12/30' (December 2030) produces a 'Card expired' validation error.",
    triggerSteps: "1. In payment step, enter card expiry as '12/30'. 2. Click Place Order.",
    expected: "Year '30' should parse as 2030 and pass validation.",
    actual: "Parser evaluates year improperly, falsely rejecting active future cards.",
    keywords: ["credit card", "expiry", "expiration date", "12/30", "card expired", "year 30"],
    points: 5
  },
  {
    id: "BUG-013",
    category: "Responsive UI",
    severity: "Medium",
    title: "Sticky Checkout Bar Overlaps Terms Checkbox on Mobile (<450px)",
    description: "On small screen widths (<450px), the sticky bottom checkout bar overlays the terms checkbox and order totals.",
    triggerSteps: "1. Resize window to mobile viewport (<450px). 2. Go to checkout. 3. Scroll to bottom.",
    expected: "Layout padding should prevent fixed elements from obscuring interactive inputs.",
    actual: "Sticky footer obstructs checkbox, preventing completion.",
    keywords: ["mobile", "overlap", "sticky", "responsive", "checkbox", "terms", "viewport", "obscured"],
    points: 5
  },
  {
    id: "BUG-014",
    category: "Visual UI",
    severity: "Minor",
    title: "Broken Image Asset for Product #6",
    description: "Product #6 ('Ultra-Slim Mechanical Keyboard') links to missing image URL, displaying a broken image icon without fallback.",
    triggerSteps: "1. Browse catalog. 2. Look at Product #6 thumbnail.",
    expected: "Images should load or render a clean fallback placeholder.",
    actual: "Broken image icon with 404 response.",
    keywords: ["broken image", "image 404", "missing image", "keyboard", "thumbnail", "fallback"],
    points: 3
  },
  {
    id: "BUG-015",
    category: "Visual UI",
    severity: "Minor",
    title: "Missing Currency Symbol on Product Detail Page",
    description: "On Product Detail view, price displays as a bare float (e.g., '149.99') missing the '$' currency symbol.",
    triggerSteps: "1. Click Product to open details. 2. Inspect price tag.",
    expected: "Price formatting should include currency symbol ($).",
    actual: "Currency symbol is omitted on detail view.",
    keywords: ["currency", "dollar sign", "$", "missing symbol", "product detail", "price format"],
    points: 3
  },
  {
    id: "BUG-016",
    category: "Usability",
    severity: "Minor",
    title: "'Clear All Filters' Fails to Uncheck Category Checkboxes",
    description: "Clicking 'Clear All Filters' clears search query text but leaves category checkboxes checked.",
    triggerSteps: "1. Check category 'Audio'. 2. Click 'Clear All Filters'.",
    expected: "All active filter controls should reset to default unselected states.",
    actual: "Only text input is reset; category checkboxes remain selected.",
    keywords: ["clear filters", "reset", "filter checkbox", "category", "clear all", "uncheck"],
    points: 3
  },
  {
    id: "BUG-017",
    category: "Accessibility (a11y)",
    severity: "Minor",
    title: "Terms Modal Cannot Be Closed with Escape Key & Missing ARIA Label",
    description: "Terms of Service modal dialog does not listen for keyboard 'Escape' key, and close button lacks an aria-label.",
    triggerSteps: "1. Open Terms modal. 2. Press 'Esc' on keyboard.",
    expected: "Accessible dialogs must close on 'Esc' key and provide aria-label.",
    actual: "Escape key is ignored and close button lacks accessibility attributes.",
    keywords: ["escape", "esc key", "modal", "accessibility", "a11y", "aria-label", "keyboard navigation"],
    points: 3
  },
  {
    id: "BUG-018",
    category: "Security",
    severity: "Medium",
    title: "Unsanitized Review Submission Renders Raw HTML (XSS)",
    description: "Submitting a product review containing HTML tags (e.g. <b>Great</b>) renders raw unescaped HTML on the page.",
    triggerSteps: "1. In product review box, enter '<b>Bold review</b>'. 2. Submit.",
    expected: "User-generated comments must be sanitized and rendered as plain text.",
    actual: "HTML elements are rendered directly in the DOM.",
    keywords: ["xss", "html", "sanitization", "raw html", "review", "bold tag", "injection"],
    points: 5
  },
  {
    id: "BUG-019",
    category: "Navigation",
    severity: "Minor",
    title: "Browser Back Button After Order Re-Exposes Payment Form",
    description: "After completing checkout, clicking the browser Back button returns to the active checkout form with card details filled.",
    triggerSteps: "1. Place order. 2. On confirmation screen, click browser Back button.",
    expected: "Checkout history should replace state or redirect if already submitted.",
    actual: "User can navigate backward into already completed transaction form.",
    keywords: ["back button", "browser back", "confirmation", "navigation", "re-exposed", "card details"],
    points: 3
  },
  {
    id: "BUG-020",
    category: "Business Logic",
    severity: "Major",
    title: "Removing 2nd Item in Cart Accidentally Removes 1st Item",
    description: "In a multi-item cart, clicking 'Remove' on the 2nd item deletes the 1st item instead due to off-by-one index defect.",
    triggerSteps: "1. Add 3 distinct items to cart. 2. Click Remove on item #2. 3. Observe item #1 was removed.",
    expected: "Clicking Remove should remove precisely that selected line item.",
    actual: "Off-by-one index error deletes the preceding item in array.",
    keywords: ["remove item", "wrong item", "deletes first", "cart delete", "off-by-one", "second item"],
    points: 7
  },
  {
    id: "BUG-021",
    category: "Security",
    severity: "Blocker",
    title: "Password Change Allows 1-Character Password & Disregards Confirmation Mismatch",
    description: "On the Profile page, the 'Change Password' form accepts a 1-character password (e.g. 'x') and successfully saves even when 'New Password' and 'Confirm Password' completely mismatch.",
    triggerSteps: "1. Navigate to Profile page. 2. Under Change Password, enter current password, new password 'x', and confirm password '12345678'. 3. Click 'Update Password'. 4. System saves with success toast.",
    expected: "Password must enforce minimum 8 characters and reject when confirmation password does not match.",
    actual: "No minimum length validation or match comparison is executed; weak mismatched passwords are saved.",
    keywords: ["password", "mismatch", "confirm password", "weak password", "1 character", "password length", "profile security"],
    points: 10
  },
  {
    id: "BUG-022",
    category: "Input Validation",
    severity: "Major",
    title: "Profile Phone Number Field Accepts Alphabetic & Special Characters",
    description: "The phone number input in User Profile accepts arbitrary letters and symbols (e.g. 'call-me-maybe-$$$') without numeric format validation.",
    triggerSteps: "1. Go to Profile page. 2. In Phone Number, enter 'call-me-now!'. 3. Click 'Save Profile Changes'. 4. Profile updates with non-numeric phone.",
    expected: "Phone number should only accept valid digits and standard telephone punctuation (+, -, ()).",
    actual: "Accepts any arbitrary letters or symbols without validation.",
    keywords: ["phone", "phone number", "letters", "alphabet", "invalid phone", "profile validation", "telephone"],
    points: 7
  },
  {
    id: "BUG-023",
    category: "State Persistence",
    severity: "Medium",
    title: "Notification Settings Changes Silently Revert on Page Refresh",
    description: "Toggling notification preferences (Email Notifications, SMS Alerts, Promotional Deals) displays a 'Saved successfully' toast, but navigating away or refreshing the page immediately resets toggles back to default.",
    triggerSteps: "1. Go to Profile page. 2. Toggle 'SMS Order Alerts' ON and 'Promotional Deals' OFF. 3. Click Save. 4. Refresh page or return to Profile. 5. Toggles revert to defaults.",
    expected: "Updated notification settings should persist across sessions and page navigation.",
    actual: "Settings are not stored in state or persistence and revert on reload.",
    keywords: ["notification", "toggle", "revert", "reset", "preferences", "sms alerts", "profile settings"],
    points: 5
  },
  {
    id: "BUG-024",
    category: "Input Validation",
    severity: "Major",
    title: "Profile Email Update Accepts Invalid Format Without Domain",
    description: "Updating the email address on the User Profile accepts malformed inputs like 'tester@' or 'myemail' without standard email regex validation.",
    triggerSteps: "1. On Profile page, change email to 'student@'. 2. Click 'Save Profile Changes'. 3. Update succeeds without error.",
    expected: "Email field must validate standard email syntax (user@domain.com).",
    actual: "Form accepts strings lacking a valid domain or TLD.",
    keywords: ["email", "invalid email", "malformed email", "no domain", "profile email", "email format"],
    points: 7
  },
  {
    id: "BUG-025",
    category: "Usability",
    severity: "Major",
    title: "Danger 'Delete Account' Button Erases Account Instantly Without Confirmation Dialog",
    description: "Clicking the red 'Delete Account' button on the Profile page immediately deletes session data without showing a confirmation prompt ('Are you sure?'), risking accidental data loss.",
    triggerSteps: "1. Go to Profile page. 2. Click 'Delete Account' button. 3. Session is wiped immediately without warning modal.",
    expected: "Destructive actions must require explicit two-step user confirmation before execution.",
    actual: "Single click instantly deletes data without confirmation.",
    keywords: ["delete account", "no confirmation", "accidental click", "warning prompt", "destructive", "profile delete"],
    points: 7
  },
  {
    id: "BUG-026",
    category: "Data Consistency",
    severity: "Major",
    title: "Order Tracking Displays 'Delivered' With Impossible Future Delivery Date",
    description: "In Order History, tracking for Order #ORD-8821 displays status badge 'Delivered' with a timestamp set in the year 2099 ('Delivered on December 31, 2099').",
    triggerSteps: "1. Go to Order History page. 2. View tracking on Order #ORD-8821. 3. Note status 'Delivered' with date 'Dec 31, 2099'.",
    expected: "Delivered orders must display past or current timestamps; future dates must indicate 'Scheduled' or 'In Transit'.",
    actual: "Displays 'Delivered' alongside a date decades in the future.",
    keywords: ["tracking", "delivered", "future date", "2099", "order date", "order history", "ord-8821"],
    points: 7
  },
  {
    id: "BUG-027",
    category: "Usability",
    severity: "Minor",
    title: "Order Search Fails on Lowercase Tracking ID",
    description: "Searching for orders by ID is strictly case-sensitive. Searching 'ord-9942' returns 'No orders found', whereas searching 'ORD-9942' succeeds.",
    triggerSteps: "1. Go to Order History page. 2. In Order Search, type 'ord-9942' in lowercase. 3. Press Enter. 4. Shows 'No orders found'.",
    expected: "Order search should perform case-insensitive matching (ord-9942 matches ORD-9942).",
    actual: "Strict uppercase matching rejects lowercase tracking IDs.",
    keywords: ["case sensitive", "lowercase", "order search", "tracking search", "order id", "ord-9942"],
    points: 3
  },
  {
    id: "BUG-028",
    category: "Business Logic",
    severity: "Blocker",
    title: "Invoice Download Calculates Double Tax on Line Items",
    description: "Clicking 'Download Invoice / Receipt' on an order displays an invoice breakdown where the 10% tax is added twice to the total (e.g. Subtotal $100 + Tax $10 + Extra Tax $10 = $120 total).",
    triggerSteps: "1. Go to Orders page. 2. Click 'View Invoice' on any order. 3. Check tax and grand total calculation.",
    expected: "Total must be Subtotal + 10% Tax + Shipping.",
    actual: "Tax line item is compounded twice in invoice summary.",
    keywords: ["invoice", "tax", "double tax", "receipt", "calculation", "order total", "overcharged"],
    points: 10
  },
  {
    id: "BUG-029",
    category: "Business Logic",
    severity: "Blocker",
    title: "'Re-Order Items' Button Adds Products to Cart at $0.00 Price",
    description: "Clicking 'Re-Order' on a past order in Order History adds the items into the active cart, but sets their unit price to $0.00 instead of their catalog price.",
    triggerSteps: "1. Go to Order History. 2. Click 'Re-Order Items' on Order #ORD-9942. 3. Open Shopping Bag. 4. Observe items have $0.00 price.",
    expected: "Re-ordered items should retain their legitimate catalog prices in the cart.",
    actual: "Items are added with price reset to $0.00, enabling free checkout.",
    keywords: ["reorder", "re-order", "$0.00", "free item", "price zero", "order history cart", "zero price"],
    points: 10
  },
  {
    id: "BUG-030",
    category: "Navigation",
    severity: "Medium",
    title: "Order History 'Next Page' Button Increments Past Last Page into Blank Screen",
    description: "In Order History, clicking 'Next Page >' when already on the last page increments the page counter indefinitely (e.g., Page 4 of 2), rendering an empty table without disabling the button.",
    triggerSteps: "1. Go to Order History. 2. Navigate to Page 2. 3. Click 'Next Page >'. 4. Page counter becomes 'Page 3 of 2' and table is empty.",
    expected: "Next button should be disabled when the user is on the final page (currentPage >= totalPages).",
    actual: "Button remains clickable and increments page out of bounds.",
    keywords: ["pagination", "next page", "out of bounds", "blank table", "page counter", "page 3 of 2"],
    points: 5
  },
  {
    id: "BUG-031",
    category: "Input Validation",
    severity: "Major",
    title: "Support Ticket Submission Permits Completely Blank Inquiries",
    description: "On the Customer Support page, the ticket submission form allows sending tickets with empty Subject and empty Message body.",
    triggerSteps: "1. Go to Support page. 2. Leave Subject and Description blank. 3. Click 'Submit Ticket'. 4. Ticket is successfully recorded.",
    expected: "Form must require non-empty Subject and Description with validation error feedback.",
    actual: "Empty form submits without validation and creates a blank ticket.",
    keywords: ["support ticket", "blank message", "empty subject", "required field", "support form", "no validation"],
    points: 7
  },
  {
    id: "BUG-032",
    category: "Security",
    severity: "Major",
    title: "Ticket Attachment Accepts Executable Files (.exe, .sh) Without Validation",
    description: "In the Customer Support ticket form, the file upload input accepts dangerous executable file extensions (.exe, .sh, .bat) without file type whitelisting.",
    triggerSteps: "1. Go to Support page. 2. Attach a file named 'malware.exe' or 'script.sh'. 3. Observe file is accepted and attached without error.",
    expected: "Attachment input should restrict files to safe document/image formats (PNG, JPG, PDF) using accept attribute and MIME validation.",
    actual: "No file extension filter; any dangerous executable file is accepted.",
    keywords: ["file upload", "attachment", ".exe", "executable", "file type", "support ticket upload", "security"],
    points: 7
  },
  {
    id: "BUG-033",
    category: "Accessibility (a11y)",
    severity: "Minor",
    title: "Support FAQ Accordions Cannot Be Toggled via Keyboard (Enter/Space)",
    description: "On the Support page, FAQ accordion question headers cannot be opened or closed using keyboard navigation (Enter or Space key) and lack aria-expanded attributes.",
    triggerSteps: "1. Go to Support page. 2. Tab to an FAQ accordion item. 3. Press Enter or Space. 4. Accordion fails to open.",
    expected: "Accordion triggers must support keyboard activation and communicate state with aria-expanded='true/false'.",
    actual: "Accordion only responds to pointer click events and lacks ARIA attributes.",
    keywords: ["faq", "accordion", "keyboard", "enter key", "space key", "aria-expanded", "a11y", "accessibility"],
    points: 3
  },
  {
    id: "BUG-034",
    category: "Error Handling",
    severity: "Major",
    title: "Live Chat Message Exceeding 100 Characters Crashes Chat Window",
    description: "In the Customer Support simulated live chat widget, typing and sending a message longer than 100 characters triggers an uncaught recursion error, crashing the chat window.",
    triggerSteps: "1. Open Live Chat on Support page. 2. Type a message with 120 characters. 3. Press Send. 4. Chat component crashes with error.",
    expected: "Long messages should wrap properly or be truncated with a character counter limit.",
    actual: "Triggers maximum call stack or unhandled exception, breaking chat UI.",
    keywords: ["live chat", "chat crash", "100 characters", "long message", "recursion", "support chat", "chat error"],
    points: 7
  },
  {
    id: "BUG-035",
    category: "Visual UI",
    severity: "Minor",
    title: "Support Priority Badges Have Swapped Color Semantics (Urgent is Green, Low is Red)",
    description: "On the Support page ticket priority picker, 'Urgent' priority displays a peaceful green badge (#22c55e) while 'Low' priority displays an alarming red badge (#ef4444).",
    triggerSteps: "1. Go to Support page. 2. Inspect priority selection badges. 3. Observe 'Urgent' is green and 'Low' is red.",
    expected: "Urgent priority should use alert colors (red/orange) and Low priority should use neutral/green colors.",
    actual: "Color semantics are inverted.",
    keywords: ["priority", "urgent", "color", "green", "red", "color inverted", "support ticket", "badge color"],
    points: 3
  },
  {
    id: "BUG-036",
    category: "Business Logic",
    severity: "Major",
    title: "'Move All to Cart' from Wishlist Fails to Remove Items from Wishlist",
    description: "Clicking 'Move All to Cart' on the Wishlist adds all saved items to the cart, but leaves them in the Wishlist instead of removing them, causing accidental re-purchases.",
    triggerSteps: "1. Add 2 items to Wishlist. 2. Go to Wishlist page. 3. Click 'Move All to Cart'. 4. Observe items are added to cart but still exist in Wishlist.",
    expected: "Moving items to cart should remove them from the Wishlist.",
    actual: "Items are duplicated into the cart while lingering in the Wishlist.",
    keywords: ["wishlist", "move all to cart", "duplicate", "not removed", "still in wishlist", "move to bag"],
    points: 7
  },
  {
    id: "BUG-037",
    category: "Business Logic",
    severity: "Major",
    title: "Moving Out-of-Stock Product from Wishlist to Cart Bypasses Stock Check",
    description: "Product #4 (Noise-Cancelling Headphones Pro) cannot be added to cart from the catalog due to 0 inventory, but if added to Wishlist, clicking 'Move to Cart' bypasses the check and successfully adds it to cart.",
    triggerSteps: "1. Wishlist Product #4 (Headphones). 2. Go to Wishlist page. 3. Click 'Move to Cart' on Product #4. 4. Product is added to cart despite zero stock.",
    expected: "Stock availability check must be enforced when transferring items from Wishlist to cart.",
    actual: "Wishlist-to-cart action bypasses inventory validation.",
    keywords: ["wishlist stock", "bypass stock", "out of stock", "headphones", "move to cart inventory", "zero stock bypass"],
    points: 7
  },
  {
    id: "BUG-038",
    category: "Visual UI",
    severity: "Minor",
    title: "Navbar Wishlist Badge Counter Remains at 0 When Items Are Added",
    description: "Adding products to the Wishlist fails to update the heart icon counter badge (🤍) in the top navbar, which remains stuck at 0.",
    triggerSteps: "1. Click the heart icon on any product card to add to Wishlist. 2. Inspect the Wishlist count in the top navbar. 3. Badge remains at '0'.",
    expected: "Navbar Wishlist badge should increment to reflect the count of saved wishlist items.",
    actual: "Badge remains static at 0 regardless of saved items.",
    keywords: ["wishlist badge", "counter", "navbar badge", "stuck at 0", "heart icon", "count not updating"],
    points: 3
  },
  {
    id: "BUG-039",
    category: "Usability",
    severity: "Medium",
    title: "Wishlist 'Sort by Price' Performs Lexicographical String Sort Instead of Numeric Sort",
    description: "Selecting 'Sort by Price: Low to High' on the Wishlist sorts prices as text strings ('$129.99', '$149.99', '$29.99', '$39.99', '$49.99', '$79.99', '$89.99'), placing $129 before $29 because '1' < '2'.",
    triggerSteps: "1. Save products with prices $29.99 and $129.99 to Wishlist. 2. On Wishlist page, select 'Sort by Price: Low to High'. 3. Observe $129 appears before $29.",
    expected: "Prices must be sorted numerically ($29.99 < $129.99).",
    actual: "Sorted alphabetically/lexicographically as raw strings.",
    keywords: ["sort by price", "alphabetical sort", "string sort", "lexicographical", "wishlist sorting", "129 before 29"],
    points: 5
  },
  {
    id: "BUG-040",
    category: "State Management",
    severity: "Medium",
    title: "Removed Wishlist Items Reappear After Navigating to Store and Back",
    description: "Clicking 'Remove' on an item in the Wishlist removes it visually from the list, but navigating to the Store page and returning to the Wishlist page resurrects the removed item.",
    triggerSteps: "1. Have items in Wishlist. 2. Click 'Remove' on one item. 3. Navigate to Store page. 4. Return to Wishlist page. 5. Removed item reappears.",
    expected: "Wishlist removal should persist in state across internal route navigation.",
    actual: "State mutation is temporary and deleted items are restored on route change.",
    keywords: ["wishlist remove", "item reappears", "resurrects", "state lost", "wishlist navigation", "deleted item returns"],
    points: 5
  }
];

const PRODUCTS = [
  {
    id: 1,
    name: "Aura Noise-Canceling Wireless Earbuds",
    category: "Audio",
    price: 79.99,
    stock: 25,
    rating: 4.8,
    reviewsCount: 42,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    description: "True wireless earbuds with active noise cancellation, ambient mode, and 32-hour battery life with Qi charging case.",
    features: ["Active Noise Cancellation", "IPX5 Water Resistant", "32-hour battery life", "Bluetooth 5.3"]
  },
  {
    id: 2,
    name: "Ergonomic Vertical Wireless Mouse",
    category: "Accessories",
    price: 49.99,
    stock: 3, // Limited stock for BUG-008
    rating: 4.6,
    reviewsCount: 28,
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
    description: "Ergonomic handshake grip reduces forearm strain. Precision optical sensor with adjustable DPI.",
    features: ["57° vertical angle", "Whisper-quiet clicks", "3 DPI levels", "Rechargeable battery"]
  },
  {
    id: 3,
    name: "Smart Fitness Watch Ultra",
    category: "Wearables",
    price: 129.99,
    stock: 15,
    rating: 4.7,
    reviewsCount: 64,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    description: "All-day heart rate, SpO2 tracking, Dual GPS sports tracking with AMOLED high-contrast touch screen.",
    features: ["1.43\" AMOLED Display", "Dual GPS", "5ATM Water Resistance", "100+ Workout Modes"]
  },
  {
    id: 4,
    name: "Noise-Cancelling Headphones Pro",
    category: "Audio",
    price: 199.99,
    stock: 0, // Actually 0, but UI displays "In Stock (12 left)" for BUG-006
    displayStockOverride: "In Stock (12 left)",
    rating: 4.9,
    reviewsCount: 91,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    description: "Premium over-ear acoustic headphones with custom 40mm titanium drivers and memory foam earcups.",
    features: ["Hybrid Active ANC", "Hi-Res Audio", "40-Hour Playtime", "Multipoint Pairing"]
  },
  {
    id: 5,
    name: "4K Ultra-HD USB Streaming Webcam",
    category: "Video",
    price: 89.99,
    stock: 18,
    rating: 4.5,
    reviewsCount: 19,
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80",
    description: "Crisp 4K 30fps streaming with HDR, dual noise-reducing stereo microphones, and physical privacy shutter.",
    features: ["Sony STARVIS sensor", "Autofocus & HDR", "Built-in Privacy Shutter", "Tripod-mountable"]
  },
  {
    id: 6,
    name: "Ultra-Slim Mechanical Keyboard",
    category: "Accessories",
    price: 149.99,
    stock: 8,
    rating: 4.8,
    reviewsCount: 55,
    image: "/static/images/keyboard_broken.png", // Broken image for BUG-014
    description: "Low-profile optical red switches, CNC anodized aluminum frame, RGB backlighting, and Bluetooth 5.1 dual mode.",
    features: ["Low Profile Optical Switches", "PBT Keycaps", "Wireless + Wired", "Customizable RGB"]
  },
  {
    id: 7,
    name: "Aluminum Ergonomic Laptop Stand",
    category: "Accessories",
    price: 39.99,
    stock: 30,
    rating: 4.9,
    reviewsCount: 73,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
    description: "Elevates laptop to eye level for optimal posture. Precision aluminum with ventilation heat slots.",
    features: ["Fits up to 17\" laptops", "Non-slip silicone pads", "Foldable portable design", "Heat ventilation slot"]
  },
  {
    id: 8,
    name: "Wireless Fast Charging Pad Duo",
    category: "Charging",
    price: 29.99,
    stock: 40,
    rating: 4.4,
    reviewsCount: 31,
    image: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&auto=format&fit=crop&q=80",
    description: "Dual 15W Qi fast charging pads for simultaneously powering your phone and earbuds.",
    features: ["Dual 15W Fast Qi", "Case-friendly", "Foreign Object Detection", "Slim non-slip base"]
  }
];

const REVIEWS = {
  1: [
    { author: "Sarah M.", rating: 5, comment: "The active noise cancellation is remarkable for daily commutes." },
    { author: "David K.", rating: 4, comment: "Good audio fidelity and microphone clarity." }
  ],
  2: [
    { author: "Elena R.", rating: 5, comment: "Solved my wrist pain within two days of using it." }
  ],
  3: [
    { author: "Marcus B.", rating: 5, comment: "Accurate GPS tracking during long outdoor runs." }
  ]
};

const ORDERS = [
  {
    id: "ORD-8821",
    date: "2026-03-28",
    status: "Delivered",
    deliveryDate: "December 31, 2099", // BUG-026: Impossible future delivery date
    items: [
      { id: 1, name: "Aura Wireless Earbuds", price: 79.99, quantity: 1 },
      { id: 8, name: "Fast Charging Pad Duo", price: 29.99, quantity: 1 }
    ],
    subtotal: 109.98,
    tax: 11.00,
    shipping: 0.00,
    total: 120.98
  },
  {
    id: "ORD-9942",
    date: "2026-04-02",
    status: "In Transit",
    deliveryDate: "April 15, 2026",
    items: [
      { id: 2, name: "Ergonomic Vertical Mouse", price: 49.99, quantity: 1 }
    ],
    subtotal: 49.99,
    tax: 5.00,
    shipping: 10.00,
    total: 64.99
  },
  {
    id: "ORD-7715",
    date: "2026-04-08",
    status: "Processing",
    deliveryDate: "April 20, 2026",
    items: [
      { id: 3, name: "Smart Fitness Watch Ultra", price: 129.99, quantity: 1 },
      { id: 7, name: "Aluminum Laptop Stand", price: 39.99, quantity: 1 }
    ],
    subtotal: 169.98,
    tax: 17.00,
    shipping: 0.00,
    total: 186.98
  }
];

const FAQS = [
  {
    id: 1,
    q: "How do I track my active shipment?",
    a: "Orders can be tracked directly from the Order History page using your tracking ID (e.g. ORD-9942)."
  },
  {
    id: 2,
    q: "What is your 30-day return policy?",
    a: "Returns are accepted within 30 days of confirmed delivery with original tags and packaging intact."
  },
  {
    id: 3,
    q: "How do promotional coupon codes work?",
    a: "Coupons must be entered during checkout in the promo code input before clicking Place Order."
  },
  {
    id: 4,
    q: "Are all electronics covered by manufacturer warranty?",
    a: "Yes, all ShopPulse studio hardware includes a 1-year limited hardware replacement warranty."
  }
];

module.exports = {
  SEEDED_BUGS,
  PRODUCTS,
  REVIEWS,
  ORDERS,
  FAQS
};

