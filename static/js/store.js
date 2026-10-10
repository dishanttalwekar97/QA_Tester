/**
 * ShopPulse Target Application Logic
 * Contains realistic seeded bugs for candidate QA testing.
 */

// In-memory cart (BUG-011: Not persisted to localStorage, so F5 wipes cart)
let cart = [];
let appliedDiscountRate = 0; // Cumulative discount rate for BUG-002
let activeCategories = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initSearch();
  initFilters();
  initModals();
  updateCartBadge();
  
  // Expose global store methods
  window.ShopPulse = {
    addToCart,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    placeOrder,
    submitReview
  };
});

// Toast notification helper
function showToast(message, type = "info") {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

// Add to Cart Logic
function addToCart(productId, name, price, stock) {
  // BUG-006: Product #4 displays In Stock on UI, but throws Out of stock error here
  if (productId === 4) {
    showToast("Error: Item is out of stock in warehouse inventory.", "error");
    return;
  }

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    // BUG-008: If user clicked add on product 2 (stock 3), let's check stock only on click, 
    // but manual typing in cart bypasses this.
    if (existing.quantity >= stock) {
      showToast(`Cannot add more than available stock (${stock}).`, "error");
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({
      id: productId,
      name: name,
      price: price,
      quantity: 1,
      stock: stock
    });
  }

  showToast(`Added "${name}" to cart.`, "success");
  updateCartBadge();
  renderCartView();
}

// Update Cart Quantity
function updateQuantity(index, newQtyStr) {
  const qty = parseInt(newQtyStr, 10);
  if (isNaN(qty)) return;

  // BUG-001: Allows negative quantity!
  // BUG-005: Allows 0 quantity to stay in cart!
  // BUG-008: Does not enforce stock ceiling (e.g. typing 50 bypasses stock)
  if (cart[index]) {
    cart[index].quantity = qty;
  }

  renderCartView();
}

// Remove from Cart
function removeFromCart(index) {
  if (!cart[index]) return;

  // BUG-020: Off-by-one error when removing from cart!
  // If index > 0, removes (index - 1) instead of index!
  if (cart.length > 1 && index > 0) {
    const wrongItemName = cart[index - 1].name;
    cart.splice(index - 1, 1);
    showToast(`Removed "${wrongItemName}" from cart.`, "info");
  } else {
    const itemName = cart[index].name;
    cart.splice(index, 1);
    showToast(`Removed "${itemName}" from cart.`, "info");
  }

  updateCartBadge();
  renderCartView();
}

// Update Cart Badge Count
function updateCartBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (badge) {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    badge.textContent = totalItems;
  }
}

// Render Cart View Table
function renderCartView() {
  const tableBody = document.getElementById("cart-table-body");
  if (!tableBody) return;

  if (cart.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">Your cart is empty.</td></tr>`;
    updateSummary(0);
    return;
  }

  let rowsHtml = "";
  let subtotal = 0;

  cart.forEach((item, idx) => {
    // BUG-001: Line total allows negative result
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;

    rowsHtml += `
      <tr>
        <td style="font-weight:600;">${item.name}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>
          <input type="number" class="qty-input" value="${item.quantity}" 
                 onchange="ShopPulse.updateQuantity(${idx}, this.value)" />
          <div style="font-size:0.75rem; color:#64748b;">Stock: ${item.stock}</div>
        </td>
        <td style="font-weight:700;">$${lineTotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="ShopPulse.removeFromCart(${idx})">Remove</button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = rowsHtml;
  updateSummary(subtotal);
}

// Update Cart Totals Summary
function updateSummary(subtotal) {
  const subtotalEl = document.getElementById("summary-subtotal");
  const shippingEl = document.getElementById("summary-shipping");
  const discountEl = document.getElementById("summary-discount");
  const totalEl = document.getElementById("summary-total");

  if (!subtotalEl) return;

  // BUG-004: Banner claims Free Shipping over $50, but logic checks subtotal >= 100
  let shipping = 0;
  if (subtotal > 0) {
    shipping = subtotal >= 100 ? 0 : 10.00;
  }

  // BUG-002: Stacking discount logic
  let discountAmount = subtotal * appliedDiscountRate;
  let grandTotal = subtotal + shipping - discountAmount;

  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  shippingEl.textContent = shipping === 0 ? "FREE ($0.00)" : `$${shipping.toFixed(2)}`;
  
  if (discountEl) {
    discountEl.textContent = `-$${discountAmount.toFixed(2)}`;
  }
  
  if (totalEl) {
    totalEl.textContent = `$${grandTotal.toFixed(2)}`;
  }
}

// Apply Coupon Logic
function applyCoupon() {
  const codeInput = document.getElementById("coupon-input");
  if (!codeInput) return;
  const code = codeInput.value.trim().toUpperCase();

  if (code === "SAVE20") {
    // BUG-002: Stacks infinite times on each click!
    appliedDiscountRate += 0.20;
    showToast(`Coupon SAVE20 applied! 20% discount deducted.`, "success");
    renderCartView();
  } else {
    showToast("Invalid coupon code.", "error");
  }
}

// Search Logic
function initSearch() {
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  if (!searchInput || !searchBtn) return;

  function doSearch() {
    const query = searchInput.value;
    
    // BUG-009: Special characters trigger 500 error modal crash
    if (query.includes("%") || query.includes("?") || query.includes("'")) {
      show500ErrorModal("Unhandled SQLError: Syntax error near unexpected character token: " + query);
      return;
    }

    // Filter products
    filterCatalog();
  }

  searchBtn.addEventListener("click", doSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doSearch();
  });
}

function show500ErrorModal(debugMessage) {
  const modal = document.getElementById("error-500-modal");
  const msgEl = document.getElementById("error-500-msg");
  if (modal && msgEl) {
    msgEl.textContent = debugMessage;
    modal.classList.add("active");
  }
}

// Filter Logic
function initFilters() {
  const applyBtn = document.getElementById("apply-filter-btn");
  const clearBtn = document.getElementById("clear-filter-btn");

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      // BUG-010: Min price > Max price accepted without validation
      filterCatalog();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // BUG-016: Clears search input, but leaves category checkboxes checked!
      const searchInput = document.getElementById("search-input");
      if (searchInput) searchInput.value = "";
      
      const minPrice = document.getElementById("min-price");
      const maxPrice = document.getElementById("max-price");
      if (minPrice) minPrice.value = "";
      if (maxPrice) maxPrice.value = "";

      // Notice: document.querySelectorAll('.cat-checkbox') is deliberately NOT unchecked here!
      filterCatalog();
      showToast("Search filters cleared.", "info");
    });
  }
}

function filterCatalog() {
  const searchInput = document.getElementById("search-input");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const minPriceEl = document.getElementById("min-price");
  const maxPriceEl = document.getElementById("max-price");
  const minVal = minPriceEl && minPriceEl.value ? parseFloat(minPriceEl.value) : 0;
  const maxVal = maxPriceEl && maxPriceEl.value ? parseFloat(maxPriceEl.value) : Infinity;

  // Selected categories
  const checkedBoxes = Array.from(document.querySelectorAll(".cat-checkbox:checked")).map(cb => cb.value);

  const cards = document.querySelectorAll(".product-card");
  let visibleCount = 0;

  cards.forEach(card => {
    const name = card.dataset.name.toLowerCase();
    const cat = card.dataset.category;
    const price = parseFloat(card.dataset.price);

    const matchQuery = !query || name.includes(query);
    const matchCat = checkedBoxes.length === 0 || checkedBoxes.includes(cat);
    
    // BUG-010: If minVal > maxVal, condition (price >= minVal && price <= maxVal) yields empty results without helpful warning
    const matchPrice = price >= minVal && price <= maxVal;

    if (matchQuery && matchCat && matchPrice) {
      card.style.display = "flex";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  const emptyMsg = document.getElementById("empty-catalog-msg");
  if (emptyMsg) {
    emptyMsg.style.display = visibleCount === 0 ? "block" : "none";
  }
}

// Modal handling
function initModals() {
  const termsBtn = document.getElementById("open-terms-btn");
  const termsModal = document.getElementById("terms-modal");
  const closeTermsBtn = document.getElementById("close-terms-btn");

  if (termsBtn && termsModal) {
    termsBtn.addEventListener("click", () => {
      termsModal.classList.add("active");
    });
  }

  if (closeTermsBtn && termsModal) {
    closeTermsBtn.addEventListener("click", () => {
      termsModal.classList.remove("active");
    });
  }

  // BUG-017: Does NOT listen to 'Escape' key for closing terms modal!
  // Window event for Escape is intentionally omitted.
}

// Checkout & Place Order Logic
let isSubmittingOrder = false; // Intentionally NOT used in placeOrder to enable BUG-003!

function placeOrder() {
  const nameInput = document.getElementById("shipping-name");
  const cardInput = document.getElementById("card-number");
  const expiryInput = document.getElementById("card-expiry");
  const termsInput = document.getElementById("agree-terms");

  if (!nameInput || !cardInput || !expiryInput) return;

  const nameVal = nameInput.value.trim();
  const expiryVal = expiryInput.value.trim();

  // BUG-007: Regex only allows alphanumeric characters, rejecting O'Connor or Mary-Jane
  const nameRegex = /^[a-zA-Z0-9 ]+$/;
  if (!nameRegex.test(nameVal)) {
    showToast("Validation Error: Full name must only contain alphanumeric characters without punctuation.", "error");
    return;
  }

  // BUG-012: Credit card expiry '12/30' treated as expired
  if (expiryVal === "12/30" || expiryVal === "12/31") {
    // Defective parser: splits and compares against 26
    const parts = expiryVal.split("/");
    const yy = parseInt(parts[1], 10);
    if (yy >= 30) {
      showToast("Card Error: Your card has expired. Please enter a valid card.", "error");
      return;
    }
  }

  if (termsInput && !termsInput.checked) {
    showToast("Please agree to the Terms & Conditions before placing your order.", "error");
    return;
  }

  if (cart.length === 0) {
    showToast("Your cart is empty.", "error");
    return;
  }

  // BUG-003: Button is not disabled, so rapid double click fires duplicate orders!
  const randomOrderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  
  // Submit order to API or render confirmation
  fetch("/api/orders/place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: randomOrderId,
      name: nameVal,
      cart: cart,
      total: document.getElementById("summary-total")?.textContent || "$0"
    })
  }).then(res => res.json()).then(data => {
    // Show order success screen
    showOrderConfirmation(randomOrderId);
  }).catch(() => {
    showOrderConfirmation(randomOrderId);
  });
}

function showOrderConfirmation(orderId) {
  const checkoutSection = document.getElementById("checkout-section");
  const confirmationSection = document.getElementById("confirmation-section");
  const orderIdSpan = document.getElementById("confirmed-order-id");

  if (checkoutSection && confirmationSection) {
    checkoutSection.style.display = "none";
    confirmationSection.style.display = "block";
    if (orderIdSpan) orderIdSpan.textContent = orderId;
    
    // BUG-019: Navigation anomaly — if user presses browser Back button, 
    // the previous populated checkout form reappears without resetting.
  }
}

// Review submission
function submitReview(productId) {
  const authorInput = document.getElementById("review-author");
  const textInput = document.getElementById("review-comment");
  const container = document.getElementById("reviews-list");

  if (!authorInput || !textInput || !container) return;

  const author = authorInput.value.trim() || "Anonymous";
  const comment = textInput.value.trim();

  if (!comment) {
    showToast("Please write a review comment.", "error");
    return;
  }

  const reviewDiv = document.createElement("div");
  reviewDiv.className = "review-item";
  
  // BUG-018: Raw unescaped innerHTML injection (XSS flaw)
  reviewDiv.innerHTML = `
    <div style="font-weight:600; font-size:0.9rem;">${author} <span style="color:#f59e0b;">★★★★★</span></div>
    <div style="color:#475569; font-size:0.85rem; margin-top:4px;">${comment}</div>
  `;

  container.prepend(reviewDiv);
  textInput.value = "";
  showToast("Review submitted successfully!", "success");
}

