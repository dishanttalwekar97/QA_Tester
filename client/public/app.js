/**
 * ShopPulse MERN Single Page Application (React Frontend)
 * Implements candidate exploratory testing, docked blind bug reporter,
 * and hiring evaluator dashboard with all 40 seeded bugs.
 */

// Virtual Element helper for standalone React execution
const { useState, useEffect, useRef, createElement: h } = React;

function App() {
  // Navigation & Session State
  const [route, setRoute] = useState('brief'); // 'brief', 'store', 'cart', 'profile', 'orders', 'support', 'wishlist', 'completed', 'admin', 'admin_detail'
  const [candidate, setCandidate] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // BUG-011: in-memory only, lost on F5
  const [couponRate, setCouponRate] = useState(0); // BUG-002: stacks infinitely
  const [myReports, setMyReports] = useState([]);

  // --- Profile Page State (BUG-021 to BUG-025) ---
  const [profileData, setProfileData] = useState({
    fullName: "Alex Morgan",
    email: "alex.morgan@shoppulse.io",
    phone: "+1 (555) 019-2834",
    address: "742 Evergreen Terrace, Springfield, OR"
  });
  // BUG-023: Notification settings revert on reload/navigation
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    smsAlerts: false,
    promoDeals: true
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPass: '',
    newPass: '',
    confirmPass: ''
  });

  // --- Orders Page State (BUG-026 to BUG-030) ---
  const [ordersList, setOrdersList] = useState([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null);

  // --- Support Page State (BUG-031 to BUG-035) ---
  const [supportTicket, setSupportTicket] = useState({
    name: 'Alex Morgan',
    email: 'alex.morgan@shoppulse.io',
    subject: '',
    message: '',
    priority: 'Normal', // 'Low', 'Normal', 'Urgent'
    attachmentName: ''
  });
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [faqsList, setFaqsList] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am PulseBot, your automated customer care agent. How may I assist you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatCrashed, setChatCrashed] = useState(false);

  // --- Wishlist Page State (BUG-036 to BUG-040) ---
  const initialWishlistItems = [
    { id: 1, name: 'Aura Wireless Earbuds', price: 79.99, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80', stock: 24, category: 'Audio' },
    { id: 3, name: 'Smart Fitness Watch Ultra', price: 129.99, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', stock: 8, category: 'Wearables' },
    { id: 8, name: 'Fast Charging Pad Duo', price: 29.99, image: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&auto=format&fit=crop&q=80', stock: 15, category: 'Accessories' },
    { id: 4, name: 'Noise-Cancelling Headphones Pro', price: 149.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', stock: 0, category: 'Audio' }
  ];
  const [wishlist, setWishlist] = useState(initialWishlistItems);
  const [wishlistSort, setWishlistSort] = useState('default');
  
  // UI & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [error500Modal, setError500Modal] = useState(null);
  const [toast, setToast] = useState(null);
  const [orderConfirmedId, setOrderConfirmedId] = useState(null);

  // Bug Reporter Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('new'); // 'new' | 'my'
  const [bugForm, setBugForm] = useState({
    title: '',
    category: 'Business Logic',
    severity: 'Medium',
    steps: '',
    expected: '',
    actual: ''
  });

  // Admin & Evaluator Auth States
  const [adminCandidates, setAdminCandidates] = useState([]);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState(null);
  const [adminGrading, setAdminGrading] = useState({ score: 0, decision: 'Pending', notes: '' });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    () => sessionStorage.getItem('evaluator_auth') === 'true'
  );
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminSortKey, setAdminSortKey] = useState('reports'); // 'reports', 'score', 'date', 'name'
  const [adminSortOrder, setAdminSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);
  const [showCompletedReports, setShowCompletedReports] = useState(false);

  // Helper flag for submitted assessment
  const isSubmitted = Boolean(candidate && (candidate.status === 'submitted' || candidate.status === 'reviewed'));

  // Route Protection: Prevent submitted candidates from navigating back to store, cart or testing views
  const candidateTestingRoutes = ['store', 'cart', 'profile', 'orders', 'support', 'wishlist'];
  useEffect(() => {
    if (isSubmitted && candidateTestingRoutes.includes(route)) {
      showToast('Assessment already submitted. Store access is concluded.', 'info');
      setRoute('completed');
    }
  }, [route, isSubmitted]);

  // Route listener for BUG-040 (Wishlist item resurrection) & BUG-023 (Notification preference reset)
  useEffect(() => {
    if (route === 'wishlist') {
      // BUG-040: Removed wishlist item reappears after navigating to Store and returning to Wishlist!
      setWishlist(initialWishlistItems);
    }
    if (route === 'profile') {
      // BUG-023: Notification settings revert to default
      setNotificationSettings({ emailAlerts: true, smsAlerts: false, promoDeals: true });
    }
  }, [route]);

  const heroSlides = [
    {
      tag: 'EXCLUSIVE OFFER',
      title: 'MIN. 30% OFF',
      subtitle: 'Extra 10% off your next dress haul & tech essentials',
      badge: 'USE CODE: SAVE20',
      btnText: 'SHOP NOW',
      bgImg: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80'
    },
    {
      tag: 'SPRING EDIT 2026',
      title: 'CURATED DROPS',
      subtitle: 'Next-Gen Gear For Creators & Professionals',
      badge: 'FREE SHIPPING OVER $50',
      btnText: 'EXPLORE DROP',
      bgImg: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&auto=format&fit=crop&q=80'
    },
    {
      tag: 'STUDIO EDITION',
      title: 'PRECISION GEAR',
      subtitle: 'Studio-Grade Sound & Ergonomic Workstation Essentials',
      badge: 'LIMITED EDITION',
      btnText: 'VIEW PRODUCTS',
      bgImg: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80'
    }
  ];

  // Load Initial Session & Products
  useEffect(() => {
    // Check URL parameters or stored session
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || sessionStorage.getItem('qa_candidate_token');
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
      setRoute('admin');
      if (sessionStorage.getItem('evaluator_auth') === 'true') {
        loadAdminCandidates();
      }
    } else if (token) {
      fetchCandidate(token);
    }

    loadProducts();
    loadOrders();
    loadFaqs();
  }, []);

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCandidate = (token) => {
    fetch(`/api/candidate/session?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.candidate) {
          sessionStorage.setItem('qa_candidate_token', data.candidate.token);
          setCandidate(data.candidate);
          setProfileData(prev => ({
            ...prev,
            fullName: data.candidate.fullName || prev.fullName,
            email: data.candidate.email || prev.email
          }));
          if (data.candidate.status === 'submitted' || data.candidate.status === 'reviewed') {
            setRoute('completed');
            showToast('This assessment has already been submitted.', 'info');
          } else {
            setRoute('store');
          }
          loadMyReports(token);
        } else {
          sessionStorage.removeItem('qa_candidate_token');
        }
      })
      .catch(() => {});
  };

  const loadProducts = () => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(() => {});
  };

  const loadOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) setOrdersList(data.orders);
      })
      .catch(() => {});
  };

  const loadFaqs = () => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => {
        if (data && data.faqs) setFaqsList(data.faqs);
      })
      .catch(() => {});
  };

  const loadMyReports = (token) => {
    const t = token || (candidate && candidate.token);
    if (!t) return;
    fetch(`/api/candidate/my-reports?token=${t}`)
      .then(res => res.json())
      .then(data => {
        if (data.reports) setMyReports(data.reports);
      })
      .catch(() => {});
  };

  const loadAdminCandidates = (tokenOverride) => {
    const token = tokenOverride || sessionStorage.getItem('qa_admin_token');
    if (!token) {
      setIsAdminAuthenticated(false);
      return;
    }

    fetch('/api/admin/candidates', {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token
      }
    })
      .then(res => {
        if (res.status === 401) {
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('evaluator_auth');
          sessionStorage.removeItem('qa_admin_token');
          setAdminAuthError('Session expired or unauthorized. Please re-enter Admin Security PIN.');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.candidates) {
          setAdminCandidates(data.candidates);
          setIsAdminAuthenticated(true);
        }
      })
      .catch(() => {});
  };

  const loadCandidateDetail = (id) => {
    const token = sessionStorage.getItem('qa_admin_token');
    if (!token) {
      setIsAdminAuthenticated(false);
      setRoute('admin');
      return;
    }

    fetch(`/api/admin/candidates/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token
      }
    })
      .then(res => {
        if (res.status === 401) {
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('evaluator_auth');
          sessionStorage.removeItem('qa_admin_token');
          setRoute('admin');
          setAdminAuthError('Session expired. Please log in.');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.candidate) {
          setSelectedCandidateDetail(data);
          setAdminGrading({
            score: data.candidate.overallScore || data.suggestedScore || 0,
            decision: data.candidate.reviewerDecision || 'Pending',
            notes: data.candidate.reviewerNotes || ''
          });
          setRoute('admin_detail');
        }
      })
      .catch(() => {});
  };

  const handleDeleteCandidate = (id, fullName) => {
    const token = sessionStorage.getItem('qa_admin_token');
    if (!token) {
      setIsAdminAuthenticated(false);
      setRoute('admin');
      return;
    }

    const confirmed = confirm(`Are you sure you want to permanently delete candidate "${fullName}" and all their bug reports?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    fetch(`/api/admin/candidates/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token
      }
    })
      .then(res => {
        if (res.status === 401) {
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('evaluator_auth');
          sessionStorage.removeItem('qa_admin_token');
          setRoute('admin');
          setAdminAuthError('Session expired. Please log in.');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          showToast(`Candidate "${fullName}" deleted successfully.`, 'success');
          if (selectedCandidateDetail && selectedCandidateDetail.candidate && (selectedCandidateDetail.candidate._id === id || selectedCandidateDetail.candidate.id === id)) {
            setSelectedCandidateDetail(null);
            setRoute('admin');
          }
          loadAdminCandidates();
        } else if (data && data.error) {
          showToast(`Delete failed: ${data.error}`, 'error');
        }
      })
      .catch(() => {
        showToast('Error communicating with server during deletion.', 'error');
      });
  };

  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    const pin = adminPasswordInput.trim();
    if (!pin) {
      setAdminAuthError('Please enter the Admin Security PIN.');
      return;
    }

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.adminToken) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('evaluator_auth', 'true');
        sessionStorage.setItem('qa_admin_token', data.adminToken);
        setAdminAuthError('');
        loadAdminCandidates(data.adminToken);
        showToast('Evaluator portal unlocked successfully.', 'success');
      } else {
        setAdminAuthError(data.error || 'Access Denied: Incorrect Security PIN.');
      }
    })
    .catch(() => {
      setAdminAuthError('Error communicating with authentication server.');
    });
  };

  const handleAdminLogout = () => {
    const token = sessionStorage.getItem('qa_admin_token');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: token })
      }).catch(() => {});
    }
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('evaluator_auth');
    sessionStorage.removeItem('qa_admin_token');
    setRoute(isSubmitted ? 'completed' : 'store');
    showToast('Evaluator portal locked.', 'info');
  };

  const handleExitCandidateSession = () => {
    sessionStorage.removeItem('qa_candidate_token');
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setCandidate(null);
    setCart([]);
    setMyReports([]);
    setShowCompletedReports(false);
    setRoute('brief');
    showToast('Candidate session concluded. Ready for next applicant.', 'info');
  };

  // --- STORE ACTIONS & SEEDED BUGS ---

  const handleAddToCart = (product) => {
    // BUG-006: Product #4 displays In Stock on UI, but throws Out of stock error here
    if (product.id === 4) {
      showToast('Error: Item is out of stock in warehouse inventory.', 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // BUG-008: Check stock on normal click, but manual typing in cart bypasses this
        if (existing.quantity >= product.stock) {
          showToast(`Cannot add more than available stock (${product.stock}).`, 'error');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, stock: product.stock, quantity: 1 }];
    });

    showToast(`Added "${product.name}" to cart.`, 'success');
  };

  const handleUpdateQuantity = (index, val) => {
    const qty = parseInt(val, 10);
    if (isNaN(qty)) return;

    setCart(prev => {
      const copy = [...prev];
      // BUG-001: Allows negative quantity!
      // BUG-005: Allows 0 quantity to stay!
      // BUG-008: Allows exceeding max inventory without check!
      if (copy[index]) {
        copy[index] = { ...copy[index], quantity: qty };
      }
      return copy;
    });
  };

  const handleRemoveFromCart = (index) => {
    setCart(prev => {
      const copy = [...prev];
      // BUG-020: Off-by-one bug! If index > 0, deletes index - 1!
      if (copy.length > 1 && index > 0) {
        const removedName = copy[index - 1].name;
        copy.splice(index - 1, 1);
        showToast(`Removed "${removedName}" from cart.`, 'info');
      } else {
        const removedName = copy[index].name;
        copy.splice(index, 1);
        showToast(`Removed "${removedName}" from cart.`, 'info');
      }
      return copy;
    });
  };

  const handleApplyCoupon = (code) => {
    // Subtle QA Defect: Strictly case-sensitive and does not trim whitespace (rejects 'save20' or 'SAVE20 ')
    if (code === 'SAVE20') {
      // BUG-002: Stacks infinite times on each click!
      setCouponRate(prev => prev + 0.20);
      showToast('Coupon SAVE20 applied! 20% discount deducted.', 'success');
    } else {
      showToast('Invalid coupon code.', 'error');
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (isSubmitted) {
      showToast('Assessment submitted. Storefront is locked.', 'info');
      setRoute('completed');
      return;
    }
    // BUG-009: Special characters trigger 500 error modal crash
    if (searchQuery.includes('%') || searchQuery.includes('?') || searchQuery.includes("'")) {
      setError500Modal(`Unhandled SQLError: Syntax error near unexpected character token: ${searchQuery}`);
      return;
    }
  };

  const handleClearFilters = () => {
    // BUG-016: Clears search text and price, but deliberately forgets category checkboxes!
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    showToast('Filters cleared.', 'info');
  };

  const handlePlaceOrder = (formData) => {
    // BUG-007: Regex only allows alphanumeric characters, rejecting O'Connor or Mary-Jane
    const nameRegex = /^[a-zA-Z0-9 ]+$/;
    if (!nameRegex.test(formData.fullName.trim())) {
      showToast('Validation Error: Full name must only contain alphanumeric characters without punctuation.', 'error');
      return;
    }

    // BUG-012: Credit card expiry '12/30' treated as expired
    if (formData.expiry === '12/30' || formData.expiry === '12/31') {
      showToast('Card Error: Your card has expired. Please enter a valid card.', 'error');
      return;
    }

    if (!formData.agreeTerms) {
      showToast('Please agree to Terms & Conditions before placing your order.', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Your cart is empty.', 'error');
      return;
    }

    // BUG-003: Button has no debounce/disable, double clicks fire duplicate orders!
    const newOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: newOrderId,
        candidateToken: candidate ? candidate.token : null,
        items: cart,
        total: calculateTotals().grandTotal
      })
    })
    .then(res => res.json())
    .then(data => {
      setOrderConfirmedId(data.orderId || newOrderId);
    })
    .catch(() => {
      setOrderConfirmedId(newOrderId);
    });
  };

  const handlePostReview = (author, comment) => {
    if (!comment.trim()) {
      showToast('Please enter a review comment.', 'error');
      return;
    }

    if (activeProduct) {
      // BUG-018: Raw HTML injection in review list
      const newReview = { author: author.trim() || 'Anonymous', comment, rawHtml: true };
      setActiveProduct(prev => ({
        ...prev,
        reviews: [newReview, ...(prev.reviews || [])]
      }));
      showToast('Review posted successfully!', 'success');
    }
  };

  // --- Profile Page Handlers (BUG-021, BUG-022, BUG-023, BUG-024, BUG-025) ---
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    const form = e.target;
    const phoneVal = form.phone.value;
    const emailVal = form.email.value;

    // BUG-024: Accepts invalid email format without domain (e.g. 'student@' or 'alex')
    // BUG-022: Accepts arbitrary letters and symbols in phone number without numeric check!
    setProfileData({
      fullName: form.fullName.value,
      email: emailVal,
      phone: phoneVal,
      address: form.address.value
    });
    showToast('Profile information saved successfully!', 'success');
  };

  const handleSaveNotificationSettings = () => {
    // BUG-023: Silently fails to persist to storage, reverting on page reload or re-visiting profile
    showToast('Notification preferences updated successfully!', 'success');
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    const { newPass } = passwordForm;
    // BUG-021: Allows 1-character password and ignores confirmation mismatch completely!
    if (!newPass || newPass.length < 1) {
      showToast('Please enter a new password.', 'error');
      return;
    }
    setPasswordForm({ currentPass: '', newPass: '', confirmPass: '' });
    showToast('Password updated successfully! (Security verified)', 'success');
  };

  const handleDeleteAccountImmediately = () => {
    // BUG-025: Danger Delete Account executes instantly with NO confirmation dialog or warning modal!
    sessionStorage.clear();
    setCandidate(null);
    setCart([]);
    setRoute('brief');
    showToast('Your account and candidate session have been deleted immediately.', 'error');
  };

  // --- Orders Page Handlers (BUG-026, BUG-027, BUG-028, BUG-029, BUG-030) ---
  const handleReorderItems = (order) => {
    order.items.forEach(item => {
      setCart(prev => {
        const existing = prev.find(p => p.id === item.id);
        if (existing) {
          // BUG-029: Price set to 0.00!
          return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + item.quantity, price: 0.00 } : p);
        }
        // BUG-029: Price set to 0.00!
        return [...prev, { id: item.id, name: item.name, price: 0.00, stock: 99, quantity: item.quantity }];
      });
    });
    showToast(`Order ${order.id} items re-added to Bag at $0.00 each!`, 'success');
  };

  // --- Support Page Handlers (BUG-031, BUG-032, BUG-033, BUG-034, BUG-035) ---
  const handleSupportTicketSubmit = (e) => {
    e.preventDefault();
    // BUG-031: Allows submitting ticket even when subject and message are completely empty strings!
    fetch('/api/support/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supportTicket)
    })
      .then(res => res.json())
      .then(data => {
        showToast(`Support Ticket #${data.ticketId || 'TKT-1082'} submitted successfully!`, 'success');
        setSupportTicket({ name: profileData.fullName, email: profileData.email, subject: '', message: '', priority: 'Normal', attachmentName: '' });
      })
      .catch(() => {
        showToast('Support Ticket submitted successfully!', 'success');
      });
  };

  const handleSupportFileAttachment = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // BUG-032: No accept check; permits .exe, .sh, .bat files
      setSupportTicket(prev => ({ ...prev, attachmentName: file.name }));
      showToast(`File "${file.name}" attached without restriction.`, 'info');
    }
  };

  const handleSendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    // BUG-034: Message > 100 characters triggers recursion / stack overflow crash!
    if (chatInput.length > 100) {
      setChatCrashed(true);
      return;
    }

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Thank you for reaching out! Our support team has logged your inquiry: "' + userText.slice(0, 32) + '..."'
      }]);
    }, 600);
  };

  // --- Wishlist Page Handlers (BUG-036, BUG-037, BUG-038, BUG-039, BUG-040) ---
  const handleAddToWishlist = (product) => {
    setWishlist(prev => {
      if (prev.some(item => item.id === product.id)) {
        showToast(`"${product.name}" is already in your Wishlist.`, 'info');
        return prev;
      }
      showToast(`Added "${product.name}" to Wishlist. (Notice navbar counter remains 0)`, 'success');
      return [...prev, product];
    });
  };

  const handleMoveWishlistItemToCart = (product) => {
    // BUG-037: Bypasses stock check completely, successfully adding Product #4 (stock 0) to cart!
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, stock: product.stock, quantity: 1 }];
    });
    setWishlist(prev => prev.filter(item => item.id !== product.id));
    showToast(`Moved "${product.name}" to Shopping Bag!`, 'success');
  };

  const handleMoveAllWishlistToCart = () => {
    wishlist.forEach(p => {
      setCart(prev => {
        const existing = prev.find(item => item.id === p.id);
        if (existing) {
          return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { id: p.id, name: p.name, price: p.price, stock: p.stock, quantity: 1 }];
      });
    });
    // BUG-036: Deliberately fails to clear wishlist, duplicating items!
    showToast(`All ${wishlist.length} items moved to your Shopping Bag!`, 'success');
  };

  const handleRemoveFromWishlist = (id) => {
    // BUG-040: Removed item is filtered here, but reappears upon navigating to Store and back to Wishlist
    setWishlist(prev => prev.filter(item => item.id !== id));
    showToast('Item removed from Wishlist.', 'info');
  };

  // Cart Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    cart.forEach(item => {
      // BUG-001: allows negative line total
      subtotal += item.price * item.quantity;
    });

    // BUG-004: Banner claims Free Shipping over $50, but logic checks subtotal >= 100
    let shipping = 0;
    if (subtotal > 0) {
      shipping = subtotal >= 100 ? 0 : 10.00;
    }

    // BUG-002: Compounding coupon
    let discount = subtotal * couponRate;
    let grandTotal = subtotal + shipping - discount;

    return { subtotal, shipping, discount, grandTotal };
  };

  // Bug Report Submission
  const handleBugReportSubmit = (e) => {
    e.preventDefault();
    if (!candidate) {
      alert('No active candidate session.');
      return;
    }
    if (isSubmitted) {
      showToast('Assessment already submitted. New bug reports cannot be logged.', 'error');
      return;
    }

    const vp = `${window.innerWidth}x${window.innerHeight}`;
    const envInfo = `Viewport: ${vp} | UserAgent: ${navigator.userAgent}`;

    fetch('/api/candidate/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: candidate.token,
        title: bugForm.title,
        category: bugForm.category,
        severity: bugForm.severity,
        stepsToReproduce: bugForm.steps,
        expectedResult: bugForm.expected,
        actualResult: bugForm.actual,
        environmentInfo: envInfo
      })
    })
    .then(res => {
      if (res.status === 403) {
        showToast('Assessment is concluded. Bug submissions are locked.', 'error');
        setRoute('completed');
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (data && data.success) {
        setBugForm({
          title: '',
          category: 'Business Logic',
          severity: 'Medium',
          steps: '',
          expected: '',
          actual: ''
        });
        loadMyReports(candidate.token);
        setDrawerTab('my');
        showToast('Bug report saved to your assessment log.', 'success');
      }
    });
  };

  const handleFinalizeAssessment = () => {
    if (isSubmitted) {
      showToast('Assessment has already been finalized and submitted.', 'info');
      setRoute('completed');
      return;
    }

    const count = myReports.length;
    const confirmed = confirm(
      `Are you sure you want to finalize your assessment?\n\n` +
      `You have logged ${count} issue(s).\n` +
      `Once submitted, your session will conclude and your reports will be sent for grading.`
    );

    if (confirmed && candidate) {
      fetch('/api/candidate/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: candidate.token })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const updatedCandidate = data.candidate || { ...candidate, status: 'submitted' };
          setCandidate(updatedCandidate);
          setDrawerOpen(false);
          setRoute('completed');
          showToast('Assessment submitted and finalized successfully.', 'success');
        } else {
          showToast(data.error || 'Failed to finalize assessment.', 'error');
        }
      })
      .catch(err => {
        showToast('Network error during finalization: ' + err.message, 'error');
      });
    }
  };

  // Filter Catalog
  const filteredProducts = products.filter(p => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    
    const minVal = minPrice !== '' ? parseFloat(minPrice) : 0;
    const maxVal = maxPrice !== '' ? parseFloat(maxPrice) : Infinity;
    // BUG-010: If minVal > maxVal, silently returns empty without warning
    const matchPrice = p.price >= minVal && p.price <= maxVal;

    return matchSearch && matchCat && matchPrice;
  });

  // Subtle QA Defect: Header badge displays count of distinct line items (cart.length) instead of total units
  const totalCartCount = cart.length;

  // --- RENDER SECTIONS ---

  return h('div', null,
    // Luxury Utility Strip
    h('div', { className: 'cliq-topbar' },
      h('div', { className: 'cliq-topbar-left' },
        h('span', {
          className: 'cliq-topbar-luxury-tag',
          onClick: () => {
            if (isSubmitted) {
              setRoute('completed');
            } else {
              setRoute('store');
            }
          }
        }, '💎 ShopPulse Luxury'),
        candidate && h('span', { style: { color: '#888894', fontSize: '0.74rem' } },
          `Candidate: ${candidate.fullName} • `,
          h('code', { style: { color: '#ccc' } }, candidate.token)
        )
      ),
      h('div', { className: 'cliq-topbar-right' },
        candidate && !isSubmitted && h('button', {
          className: 'cliq-topbar-link',
          onClick: () => { setDrawerOpen(true); setDrawerTab('guide'); }
        }, '🎯 8 Student Missions Checklist'),
        h('button', {
          className: 'cliq-topbar-link',
          onClick: () => setRoute('brief')
        }, 'PRD Specifications'),
        candidate && !isSubmitted && h('button', {
          className: `cliq-topbar-link ${route === 'store' ? 'active' : ''}`,
          onClick: () => setRoute('store')
        }, '🛍️ Store'),
        candidate && !isSubmitted && h('button', {
          className: `cliq-topbar-link ${route === 'wishlist' ? 'active' : ''}`,
          onClick: () => setRoute('wishlist')
        }, '🤍 Wishlist'),
        candidate && !isSubmitted && h('button', {
          className: `cliq-topbar-link ${route === 'orders' ? 'active' : ''}`,
          onClick: () => setRoute('orders')
        }, '📦 Orders'),
        candidate && !isSubmitted && h('button', {
          className: `cliq-topbar-link ${route === 'profile' ? 'active' : ''}`,
          onClick: () => setRoute('profile')
        }, '👤 Profile'),
        candidate && !isSubmitted && h('button', {
          className: `cliq-topbar-link ${route === 'support' ? 'active' : ''}`,
          onClick: () => setRoute('support')
        }, '🎧 Support'),
        !candidate ? h('button', {
          className: 'cliq-topbar-link',
          onClick: () => {
            setRoute('admin');
            if (isAdminAuthenticated) loadAdminCandidates();
          }
        }, '🔒 Evaluator Portal') : (
          isSubmitted ? (
            h('span', { style: { color: '#4ade80', fontSize: '0.74rem', fontWeight: 600 } }, '● Submitted')
          ) : (
            h('span', { style: { color: '#facc15', fontSize: '0.74rem', fontWeight: 600 } }, '● Active Session')
          )
        )
      )
    ),

    // Candidate Session Watermark Bar
    candidate && route !== 'admin' && route !== 'admin_detail' && h('div', { className: 'candidate-bar', style: isSubmitted ? { background: '#1e293b' } : {} },
      h('div', null,
        h('span', { style: { opacity: 0.8 } }, 'QA Candidate Session: '),
        h('strong', null, candidate.fullName),
        h('span', { style: { opacity: 0.6, marginLeft: 8 } }, `(${candidate.token})`)
      ),
      h('div', { style: { display: 'flex', gap: 14, alignItems: 'center' } },
        !isSubmitted && h('button', {
          onClick: () => { setDrawerOpen(true); setDrawerTab('guide'); },
          style: { background: '#da1c5c', border: 'none', color: 'white', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }
        }, '🎯 8 Student Missions Checklist'),
        h('button', {
          onClick: () => setRoute('brief'),
          style: { background: 'none', border: 'none', color: '#93c5fd', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }
        }, 'View PRD Specifications'),
        isSubmitted ? (
          h('span', { style: { color: '#4ade80', fontWeight: 700 } }, '● Status: Submitted (Concluded)')
        ) : (
          h('span', { style: { color: '#facc15', fontWeight: 600 } }, 'Status: In Progress')
        )
      )
    ),

    // Announcement Header (BUG-004 trigger: Free shipping over $50)
    h('div', { className: 'announcement-bar' },
      h('span', null, '🚚 FLASH OFFER: Free Shipping on all orders over $50.00! Use code SAVE20 for 20% off.')
    ),

    // Main Navbar (Luxury Dark Styling)
    h('header', { className: 'navbar' },
      h('div', { className: 'nav-container' },
        // Logo
        h('div', {
          className: 'cliq-logo-wrap',
          onClick: () => {
            if (isSubmitted) {
              showToast('Assessment submitted. Storefront is locked.', 'info');
              setRoute('completed');
            } else {
              setRoute('store');
            }
          }
        },
          h('div', { className: 'cliq-logo-pulse' },
            h('span', { className: 'logo-white' }, 'SHOP'),
            h('span', { className: 'logo-accent' }, 'PULSE')
          )
        ),

        // Dropdown Menu Links
        h('div', { className: 'cliq-nav-categories' },
          h('button', {
            className: 'cliq-dropdown-pill',
            onClick: () => {
              if (isSubmitted) {
                showToast('Assessment submitted. Storefront is locked.', 'info');
                setRoute('completed');
                return;
              }
              setRoute('store');
              const el = document.getElementById('shop-drop-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 'Categories', h('span', { className: 'arrow' }, '▼')),
          h('button', {
            className: 'cliq-dropdown-pill',
            onClick: () => {
              if (isSubmitted) {
                showToast('Assessment submitted. Storefront is locked.', 'info');
                setRoute('completed');
                return;
              }
              setRoute('store');
              const el = document.getElementById('shop-drop-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 'Brands', h('span', { className: 'arrow' }, '▼'))
        ),

        // Header Integrated Search Form (BUG-009 triggers on %, ?, ')
        h('form', { className: 'cliq-search-form', onSubmit: handleSearchSubmit },
          h('div', { className: 'cliq-search-box' },
            h('span', { className: 'cliq-search-icon' }, '🔍'),
            h('input', {
              type: 'text',
              className: 'cliq-search-input',
              placeholder: 'Search for Categories, Products & Brands...',
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value)
            }),
            h('span', {
              className: 'cliq-mic-icon',
              title: 'Voice Search',
              onClick: () => showToast('Voice search listening...', 'info')
            }, '🎙️')
          )
        ),

        // Right Nav Actions
        h('div', { className: 'cliq-nav-actions' },
          h('button', {
            className: 'cliq-action-icon-btn',
            title: 'Notifications',
            onClick: () => showToast('No new notifications.', 'info')
          }, '🔔'),
          h('button', {
            className: 'cliq-action-icon-btn',
            title: 'Wishlist (Saved Items)',
            onClick: () => {
              if (isSubmitted) {
                showToast('Assessment submitted. Storefront is locked.', 'info');
                setRoute('completed');
              } else {
                setRoute('wishlist');
              }
            }
          },
            '🤍',
            // BUG-038: Navbar Wishlist badge counter remains permanently stuck at 0!
            h('span', { className: 'cart-badge' }, 0)
          ),
          h('button', {
            onClick: () => {
              if (candidate && (candidate.status === 'submitted' || candidate.status === 'reviewed')) {
                showToast('Assessment already submitted.', 'error');
                setRoute('completed');
              } else {
                setRoute('cart');
              }
            },
            className: 'cart-btn'
          },
            h('span', { className: 'cart-icon-symbol' }, '🛍️'),
            h('span', null, 'Bag'),
            h('span', { className: 'cart-badge' }, totalCartCount)
          )
        )
      )
    ),

    // Luxury Quick Navigation Strip
    candidate && !isSubmitted && route !== 'admin' && route !== 'admin_detail' && h('nav', {
      style: {
        background: '#161619',
        borderBottom: '1px solid #282830',
        padding: '6px 32px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    },
      h('span', { style: { color: '#888894', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 1, fontWeight: 700 } }, 'Explore Portal:'),
      [
        { id: 'store', label: '🛍️ Storefront' },
        { id: 'wishlist', label: '🤍 Wishlist' },
        { id: 'orders', label: '📦 Orders & Tracking' },
        { id: 'profile', label: '👤 Account Profile' },
        { id: 'support', label: '🎧 Customer Support' },
        { id: 'cart', label: `🛍️ Bag (${totalCartCount})` }
      ].map(tab =>
        h('button', {
          key: tab.id,
          onClick: () => setRoute(tab.id),
          style: {
            background: route === tab.id ? '#da1c5c' : '#222228',
            color: route === tab.id ? '#ffffff' : '#d4d4dc',
            border: route === tab.id ? '1px solid #da1c5c' : '1px solid #33333e',
            borderRadius: 4,
            padding: '4px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }
        }, tab.label)
      )
    ),

    // Main Content Switcher
    route === 'brief' && renderBriefView(),
    route === 'store' && renderStoreView(),
    route === 'cart' && renderCartView(),
    route === 'profile' && renderProfileView(),
    route === 'orders' && renderOrdersView(),
    route === 'support' && renderSupportView(),
    route === 'wishlist' && renderWishlistView(),
    route === 'completed' && renderCompletedView(),
    route === 'admin' && renderAdminDashboard(),
    route === 'admin_detail' && renderAdminCandidateDetail(),

    // Product Detail Modal
    activeProduct && renderProductModal(),

    // Invoice Modal (BUG-028)
    viewingInvoice && renderInvoiceModal(),

    // Tracking Modal (BUG-026)
    activeTrackingOrder && renderTrackingModal(),

    // Terms of Service Modal (BUG-017: ignores Esc, no aria-label on close)
    termsModalOpen && h('div', { className: 'modal-overlay' },
      h('div', { className: 'modal-dialog' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('h3', { style: { fontSize: '1.15rem', fontWeight: 700 } }, 'Terms & Conditions'),
          h('button', {
            onClick: () => setTermsModalOpen(false),
            style: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }
            // BUG-017: Missing aria-label
          }, '✕')
        ),
        h('div', { style: { fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 } },
          h('p', null, 'By placing an order on ShopPulse, you confirm you are 18+ and agree to standard delivery and return policies.'),
          h('p', { style: { marginTop: 10 } }, 'Promotional coupons are single-use per customer. Shipping charges apply to orders under specified thresholds.')
        )
      )
    ),

    // 500 Error Modal (BUG-009)
    error500Modal && h('div', { className: 'modal-overlay' },
      h('div', { className: 'modal-dialog', style: { borderTop: '4px solid #dc2626' } },
        h('h3', { style: { color: '#dc2626', fontWeight: 700, marginBottom: 8 } }, '⚠️ 500 Internal Server Error'),
        h('p', { style: { fontSize: '0.9rem', color: '#334155', marginBottom: 12 } }, 'The server encountered an unhandled exception while executing your query:'),
        h('pre', { style: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflowX: 'auto' } }, error500Modal),
        h('div', { style: { marginTop: 20, textAlign: 'right' } },
          h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setError500Modal(null) }, 'Dismiss')
        )
      )
    ),

    // Toast
    toast && h('div', { className: `toast-box ${toast.type === 'error' ? 'toast-error' : toast.type === 'success' ? 'toast-success' : ''}` }, toast.message),

    // CANDIDATE FLOATING BUG REPORT DRAWER (STRICT BLACK-BOX)
    candidate && !isSubmitted && route !== 'admin' && route !== 'admin_detail' && h('div', null,
      h('button', {
        className: 'bug-fab-btn',
        onClick: () => setDrawerOpen(true),
        title: 'Report a Bug'
      },
        h('span', null, '🐞'),
        h('span', null, 'Report Bug')
      ),

      drawerOpen && h('div', null,
        h('div', { className: 'bug-drawer-overlay', onClick: () => setDrawerOpen(false) }),
        h('aside', { className: 'bug-drawer' },
          h('div', { className: 'drawer-header' },
            h('div', { style: { fontWeight: 700, fontSize: '1.15rem', display: 'flex', gap: 8, alignItems: 'center' } },
              h('span', null, '🐞'),
              h('span', null, 'Candidate Bug Reporter')
            ),
            h('button', {
              onClick: () => setDrawerOpen(false),
              style: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }
            }, '✕')
          ),

          // Drawer Tabs
          h('div', { className: 'drawer-tabs' },
            h('button', {
              className: `drawer-tab ${drawerTab === 'new' ? 'active' : ''}`,
              onClick: () => setDrawerTab('new')
            }, 'Log Issue'),
            h('button', {
              className: `drawer-tab ${drawerTab === 'guide' ? 'active' : ''}`,
              onClick: () => setDrawerTab('guide'),
              style: { color: drawerTab === 'guide' ? '#4f46e5' : '#475569', fontWeight: 700 }
            }, '🎯 Missions Guide'),
            h('button', {
              className: `drawer-tab ${drawerTab === 'my' ? 'active' : ''}`,
              onClick: () => setDrawerTab('my')
            }, `My Reports (${myReports.length})`)
          ),

          // Drawer Body
          drawerTab === 'new' && renderNewReportForm(),
          drawerTab === 'guide' && renderMissionsTab(),
          drawerTab === 'my' && renderMyReportsTab(),

          !isSubmitted && h('div', { style: { padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' } },
            h('button', {
              className: 'btn btn-primary btn-sm',
              style: { background: '#059669' },
              onClick: handleFinalizeAssessment
            }, 'Finish & Submit Assessment')
          )
        )
      )
    ),

    // Footer (Subtle QA Defect: Copyright year 2018 contradicts 'SPRING COLLECTION 2026' banner)
    h('footer', { style: { borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '24px 0', marginTop: 48, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' } },
      h('div', { className: 'container' },
        h('p', null, '© 2018 ShopPulse, Inc. All rights reserved.'),
        h('p', { style: { fontSize: '0.75rem', marginTop: 4, color: '#94a3b8' } }, 'ShopPulse Assessment Storefront v2.0.4')
      )
    )
  );

  // --- SUB-VIEWS ---

  function renderBriefView() {
    return h('div', { className: 'container', style: { maxWidth: 860 } },
      h('div', { style: { textAlign: 'center', marginBottom: 32 } },
        h('div', { style: { width: 56, height: 56, background: '#4f46e5', color: 'white', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', marginBottom: 12 } }, 'QA'),
        h('h1', { style: { fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' } }, 'Quality Assurance Practical Assessment'),
        h('p', { style: { color: '#64748b', fontSize: '1.05rem', marginTop: 6 } }, 'Hands-On Exploratory & Functional Web Testing (MERN Platform)')
      ),

      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 36, marginBottom: 24, borderLeft: '6px solid #4f46e5' } },
        h('h2', { style: { fontSize: '1.35rem', fontWeight: 700, color: '#1e1b4b', marginBottom: 12 } }, 'Candidate Onboarding'),
        candidate ? (
          h('div', { style: { background: candidate.status === 'submitted' || candidate.status === 'reviewed' ? '#fef2f2' : '#eef2ff', border: '1px solid ' + (candidate.status === 'submitted' || candidate.status === 'reviewed' ? '#fecaca' : '#c7d2fe'), borderRadius: 10, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('div', null,
              h('div', { style: { fontSize: '0.8rem', color: candidate.status === 'submitted' || candidate.status === 'reviewed' ? '#b91c1c' : '#4338ca', textTransform: 'uppercase', fontWeight: 700 } },
                candidate.status === 'submitted' || candidate.status === 'reviewed' ? 'Submitted Candidate Session' : 'Active Candidate Session'
              ),
              h('div', { style: { fontSize: '1.15rem', fontWeight: 800, color: '#1e1b4b' } }, `${candidate.fullName} (${candidate.email})`),
              h('div', { style: { fontSize: '0.8rem', color: '#64748b', marginTop: 4 } }, `Status: ${candidate.status === 'submitted' || candidate.status === 'reviewed' ? 'Completed & Submitted' : 'In Progress'} • Token: ${candidate.token}`)
            ),
            h('div', { style: { display: 'flex', gap: 10 } },
              h('button', {
                className: 'btn btn-primary',
                style: isSubmitted ? { background: '#dc2626' } : {},
                onClick: () => {
                  if (isSubmitted) {
                    setRoute('completed');
                  } else {
                    setRoute('store');
                  }
                }
              }, isSubmitted ? 'View Submitted Debrief ➔' : 'Resume Assessment Store ➔'),
              isSubmitted && h('button', {
                className: 'btn btn-secondary',
                onClick: handleExitCandidateSession
              }, 'Start New Session')
            )
          )
        ) : (
          h('form', {
            onSubmit: (e) => {
              e.preventDefault();
              const fullName = e.target.fullName.value;
              const email = e.target.email.value;
              fetch('/api/candidate/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email })
              })
              .then(res => res.json())
              .then(data => {
                if (!data.success) {
                  if (data.alreadyRegistered && data.candidate && data.candidate.status === 'in_progress') {
                    const resume = confirm(
                      `You already have an active assessment session in progress.\n\n` +
                      `Applicant: ${data.candidate.fullName}\n` +
                      `Email: ${data.candidate.email}\n\n` +
                      `Would you like to resume your session now?`
                    );
                    if (resume) {
                      sessionStorage.setItem('qa_candidate_token', data.candidate.token);
                      window.history.replaceState(null, '', '?token=' + data.candidate.token);
                      setCandidate(data.candidate);
                      loadMyReports(data.candidate.token);
                      setRoute('store');
                      showToast('Resumed your active assessment session.', 'success');
                      return;
                    }
                  }
                  alert(
                    `⚠️ Registration Blocked:\n\n` +
                    `${data.error || 'Each applicant must use a unique email address.'}`
                  );
                  showToast(data.error || 'This email is already in use.', 'error');
                  return;
                }

                if (data.candidate) {
                  sessionStorage.setItem('qa_candidate_token', data.candidate.token);
                  window.history.replaceState(null, '', '?token=' + data.candidate.token);
                  setCandidate(data.candidate);
                  loadMyReports(data.candidate.token);
                  setRoute('store');
                  showToast('Assessment session initialized!', 'success');
                }
              })
              .catch(err => {
                showToast('Network error during registration: ' + err.message, 'error');
              });
            },
            style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24 }
          },
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
              h('div', null,
                h('label', { className: 'form-label' }, 'Full Name *'),
                h('input', { name: 'fullName', className: 'form-control', placeholder: 'e.g. Jane Doe', required: true })
              ),
              h('div', null,
                h('label', { className: 'form-label' }, 'Email Address *'),
                h('input', { type: 'email', name: 'email', className: 'form-control', placeholder: 'jane@example.com', required: true })
              )
            ),
            h('button', { type: 'submit', className: 'btn btn-primary' }, '🚀 Start Assessment Session')
          )
        )
      ),

      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 36 } },
        h('h3', { style: { fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 } }, 'Assessment Protocol & Guidelines'),
        h('div', { style: { background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '14px 18px', borderRadius: 6, marginBottom: 20 } },
          h('strong', { style: { color: '#92400e' } }, '⚠️ Strict Black-Box Testing Notice:'),
          h('p', { style: { fontSize: '0.88rem', color: '#78350f', marginTop: 4 } },
            'You will not be shown how many defects exist, nor will you receive completion percentages or hints. You must explore the application and identify defects independently based on product requirements.'
          )
        ),
        h('h4', { style: { fontSize: '1rem', fontWeight: 700, marginBottom: 8 } }, 'Product Requirements (PRD):'),
        h('ul', { style: { paddingLeft: 20, color: '#475569', fontSize: '0.9rem', lineHeight: 1.8 } },
          h('li', null, 'Quantities in cart must be positive integers >= 1 and not exceed available inventory.'),
          h('li', null, 'Promotional discounts (SAVE20) apply strictly once per transaction.'),
          h('li', null, 'Orders over $50.00 must receive free shipping ($0.00).'),
          h('li', null, 'Checkout must validate valid names (including apostrophes/hyphens) and future credit cards.'),
          h('li', null, 'Order placement must be debounced to prevent duplicate submissions.')
        ),
        h('div', { style: { marginTop: 24, marginBottom: 24 } },
          h('h4', { style: { fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginBottom: 12 } }, '🎯 Your 8 Guided Student Testing Missions:'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 } },
            [
              {
                icon: '🔍',
                title: 'Mission 1: Store & Search Exploration',
                desc: 'Search for products like "Mouse" or "Earbuds". Test category checkboxes and try clicking "Clear All Filters". Check if all product photos load.'
              },
              {
                icon: '🛒',
                title: 'Mission 2: Cart, Quantities & Discounts',
                desc: 'Add items to cart. Test entering quantity 0 or negative numbers. Try promo code SAVE20. Check if orders over $50 get free shipping.'
              },
              {
                icon: '📝',
                title: 'Mission 3: Checkout & Form Validation',
                desc: 'Test checkout inputs. What happens if you leave address blank? What if you enter an apostrophe in your name? Does card expiry accept future dates?'
              },
              {
                icon: '⭐',
                title: 'Mission 4: Product Popups & Reviews',
                desc: 'Click products to view full specs. Check if price shows the $ symbol. Try opening Terms of Service and closing it with Esc key. Test HTML tags in reviews.'
              },
              {
                icon: '👤',
                title: 'Mission 5: User Profile & Security',
                desc: 'Update account details. Test password change with 1 character or mismatched confirmation. Test letters in the phone field, notification toggles, and instant account deletion.'
              },
              {
                icon: '📦',
                title: 'Mission 6: Orders, Tracking & Invoices',
                desc: 'Check Order History. Inspect tracking timestamp on ORD-8821. Test lowercase tracking search. Check invoice tax calculation and Re-Order button prices.'
              },
              {
                icon: '🎧',
                title: 'Mission 7: Customer Support & Live Chat',
                desc: 'Submit support tickets with blank text or .exe/.sh attachments. Test keyboard Enter/Space on FAQ accordions. Send a chat message longer than 100 characters.'
              },
              {
                icon: '🤍',
                title: 'Mission 8: Wishlist & Collections',
                desc: 'Test Wishlist Move All to Bag, moving out-of-stock headphones to cart, navbar heart badge counter, alphabetical price sorting, and item removal persistence.'
              }
            ].map((m, idx) =>
              h('div', { key: idx, style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 } },
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, color: '#1e293b', marginBottom: 4 } },
                  h('span', { style: { fontSize: '1.2rem' } }, m.icon),
                  h('span', null, m.title)
                ),
                h('p', { style: { fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 } }, m.desc)
              )
            )
          )
        ),
        candidate && h('div', { style: { marginTop: 24, textAlign: 'right' } },
          isSubmitted ? (
            h('button', { className: 'btn btn-secondary', onClick: () => setRoute('completed') }, 'View Submitted Debrief ➔')
          ) : (
            h('button', { className: 'btn btn-primary', onClick: () => setRoute('store') }, 'Go to Store Playground ➔')
          )
        )
      )
    );
  }

  function renderStoreView() {
    return h('div', { className: 'container' },
      // Wide Hero Carousel
      h('div', { className: 'cliq-hero-wrapper' },
        h('div', { className: 'cliq-hero-stage' },
          // Left Preview Card
          h('div', { className: 'cliq-hero-preview-left' },
            h('img', {
              src: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
              alt: 'Fashion Preview'
            })
          ),

          // Main Center Banner
          h('div', { className: 'cliq-hero-main' },
            h('img', {
              className: 'cliq-hero-bg-img',
              src: heroSlides[heroSlide].bgImg,
              alt: 'Hero Banner'
            }),
            h('div', { className: 'cliq-hero-overlay' }),
            h('div', { className: 'cliq-hero-content' },
              h('div', { className: 'cliq-hero-tag' }, heroSlides[heroSlide].tag),
              h('h1', { className: 'cliq-hero-title' }, heroSlides[heroSlide].title),
              h('p', { className: 'cliq-hero-subtitle' }, heroSlides[heroSlide].subtitle),
              h('button', {
                className: 'cliq-hero-btn',
                onClick: () => {
                  const el = document.getElementById('shop-drop-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }, heroSlides[heroSlide].btnText)
            ),

            // Navigation Arrows
            h('button', {
              className: 'cliq-hero-arrow prev',
              title: 'Previous Slide',
              onClick: () => setHeroSlide((heroSlide - 1 + heroSlides.length) % heroSlides.length)
            }, '‹'),
            h('button', {
              className: 'cliq-hero-arrow next',
              title: 'Next Slide',
              onClick: () => setHeroSlide((heroSlide + 1) % heroSlides.length)
            }, '›'),

            // Carousel Dots
            h('div', { className: 'cliq-hero-dots' },
              heroSlides.map((_, idx) =>
                h('div', {
                  key: idx,
                  className: `cliq-hero-dot ${idx === heroSlide ? 'active' : ''}`,
                  onClick: () => setHeroSlide(idx)
                })
              )
            )
          ),

          // Right Preview Card
          h('div', { className: 'cliq-hero-preview-right' },
            h('img', {
              src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80',
              alt: 'Fashion Preview'
            })
          )
        )
      ),

      // Section Header: "Shop Drop" like attached screenshot
      h('div', { id: 'shop-drop-section', className: 'cliq-section-header' },
        h('h2', { className: 'cliq-section-title' }, 'Shop Drop'),
        h('p', { className: 'cliq-section-sub' }, 'Curated High-Performance Gear & Tech Essentials')
      ),

      // Catalog Search / Filter Sub-bar
      h('form', { onSubmit: handleSearchSubmit, style: { display: 'flex', gap: 12, marginBottom: 28, maxWidth: 540, margin: '0 auto 28px auto' } },
        h('input', {
          type: 'text',
          className: 'filter-input',
          placeholder: 'Filter collection (e.g. Earbuds, Mouse, Keyboard)...',
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          style: { padding: '10px 16px', fontSize: '0.9rem', borderRadius: 6 }
        }),
        h('button', { type: 'submit', className: 'btn btn-primary', style: { padding: '10px 20px', borderRadius: 6 } }, 'Search')
      ),

      // Main Grid Layout
      h('div', { className: 'catalog-layout' },
        // Sidebar Filters
        h('aside', null,
          h('div', { className: 'filter-card' },
            h('div', { className: 'filter-header-row' },
              h('h3', { className: 'filter-title' }, 'Filters'),
              h('span', { style: { fontSize: '0.75rem', color: '#888', fontWeight: 600 } }, `${filteredProducts.length} items`)
            ),
            h('div', { className: 'filter-group' },
              h('label', { className: 'filter-label' }, 'Categories'),
              // Subtle QA Defect: Typo 'Accesssories' (3 s's) causes 0 products to match
              ['Audio', 'Accesssories', 'Wearables', 'Video', 'Charging'].map(cat =>
                h('label', { key: cat, className: 'checkbox-item' },
                  h('input', {
                    type: 'checkbox',
                    checked: selectedCategories.includes(cat),
                    onChange: (e) => {
                      if (e.target.checked) setSelectedCategories([...selectedCategories, cat]);
                      else setSelectedCategories(selectedCategories.filter(c => c !== cat));
                    }
                  }),
                  h('span', null, cat)
                )
              )
            ),

            // Price Range (BUG-010 allows inverted range)
            h('div', { className: 'filter-group' },
              h('label', { className: 'filter-label' }, 'Price Range ($)'),
              h('div', { className: 'price-inputs' },
                h('input', { type: 'number', className: 'filter-input', placeholder: 'Min', value: minPrice, onChange: e => setMinPrice(e.target.value) }),
                h('span', null, '—'),
                h('input', { type: 'number', className: 'filter-input', placeholder: 'Max', value: maxPrice, onChange: e => setMaxPrice(e.target.value) })
              )
            ),

            h('button', { className: 'btn btn-secondary btn-block btn-sm', onClick: handleClearFilters }, 'Clear All Filters')
          )
        ),

        // Product Cards
        h('div', null,
          h('div', { className: 'product-grid' },
            filteredProducts.map(p =>
              h('div', { key: p.id, className: 'product-card' },
                h('div', { className: 'product-img-wrap', onClick: () => setActiveProduct(p) },
                  h('button', {
                    onClick: (e) => {
                      e.stopPropagation();
                      handleAddToWishlist(p);
                    },
                    title: 'Add to Wishlist',
                    style: {
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(255,255,255,0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 30,
                      height: 30,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                    }
                  }, '🤍'),
                  h('span', { className: 'badge-tag', style: { left: 46 } }, p.category),
                  // BUG-006: Product #4 displays In Stock badge despite 0 stock
                  p.displayStockOverride ? (
                    h('span', { className: 'stock-tag-ok' }, p.displayStockOverride)
                  ) : p.stock > 0 ? (
                    h('span', { className: 'stock-tag-ok' }, `In Stock (${p.stock} left)`)
                  ) : (
                    h('span', { style: { position: 'absolute', top: 12, right: 12, background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 } }, 'Out of Stock')
                  ),
                  // BUG-014: Product #6 has broken image
                  h('img', { src: p.image, alt: p.name, className: 'product-img' })
                ),

                h('div', { className: 'product-body' },
                  h('div', { className: 'product-brand-tag' }, `PULSE • ${p.category.toUpperCase()}`),
                  h('div', { className: 'product-name', onClick: () => setActiveProduct(p) }, p.name),
                  h('p', { className: 'product-desc' }, p.description),
                  h('div', { className: 'product-rating-row' },
                    h('span', { className: 'rating-badge' },
                      h('span', { className: 'rating-star' }, '★'),
                      h('span', null, p.rating)
                    ),
                    h('span', { className: 'rating-count' }, `(${p.reviewsCount} reviews)`)
                  ),
                  h('div', { className: 'product-footer' },
                    h('div', { className: 'price-container' },
                      h('span', { className: 'product-price' }, `$${p.price.toFixed(2)}`),
                      h('span', { className: 'product-mrp-price' }, `$${(p.price * 1.25).toFixed(2)}`),
                      h('span', { className: 'product-discount-tag' }, '20% off')
                    ),
                    h('button', {
                      className: 'btn-add-bag',
                      onClick: () => handleAddToCart(p)
                    }, '+ Add to Bag')
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  function renderProductModal() {
    const p = activeProduct;
    return h('div', { className: 'modal-overlay' },
      h('div', { className: 'detail-modal-box' },
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 } },
          h('button', { onClick: () => setActiveProduct(null), style: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' } }, '✕')
        ),
        h('div', { className: 'detail-layout' },
          h('div', { style: { height: 320, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9' } },
            h('img', { src: p.image, alt: p.name, style: { width: '100%', height: '100%', objectFit: 'cover' } })
          ),
          h('div', null,
            h('span', { style: { background: '#e0e7ff', color: '#4338ca', fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6 } }, p.category),
            h('h2', { style: { fontSize: '1.8rem', fontWeight: 800, margin: '10px 0' } }, p.name),
            // BUG-015: Missing currency symbol on detail modal!
            h('div', { style: { fontSize: '2rem', fontWeight: 800, color: '#1e1b4b', marginBottom: 12 } }, p.price.toFixed(2)),
            h('p', { style: { color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 } }, p.description),
            h('button', {
              className: 'btn btn-primary',
              style: { padding: '12px 24px' },
              onClick: () => { handleAddToCart(p); setActiveProduct(null); }
            }, '🛒 Add to Cart')
          )
        ),

        // Reviews with BUG-018 (XSS raw HTML injection)
        h('div', { style: { marginTop: 32, borderTop: '1px solid #e2e8f0', paddingTop: 20 } },
          h('h4', { style: { fontWeight: 700, marginBottom: 12 } }, 'Verified Reviews'),
          h('form', {
            onSubmit: (e) => {
              e.preventDefault();
              handlePostReview(e.target.author.value, e.target.comment.value);
              e.target.comment.value = '';
            },
            style: { display: 'grid', gridTemplateColumns: '180px 1fr 100px', gap: 10, marginBottom: 16 }
          },
            h('input', { name: 'author', className: 'form-control', placeholder: 'Your Name' }),
            h('input', { name: 'comment', className: 'form-control', placeholder: 'Write a review...' }),
            h('button', { type: 'submit', className: 'btn btn-secondary btn-sm' }, 'Post')
          ),

          (p.reviews || []).map((rev, i) =>
            h('div', { key: i, style: { padding: '8px 0', borderBottom: '1px solid #f1f5f9' } },
              h('div', { style: { fontWeight: 600, fontSize: '0.85rem' } }, `${rev.author} ★★★★★`),
              // BUG-018: dangerouslySetInnerHTML
              h('div', {
                style: { color: '#475569', fontSize: '0.85rem' },
                dangerouslySetInnerHTML: { __html: rev.comment }
              })
            )
          )
        )
      )
    );
  }

  function renderCartView() {
    const totals = calculateTotals();

    if (orderConfirmedId) {
      return h('div', { className: 'container', style: { maxWidth: 600, textAlign: 'center', background: 'white', padding: 48, borderRadius: 16, border: '1px solid #e2e8f0' } },
        h('div', { style: { fontSize: '4rem', marginBottom: 16 } }, '🎉'),
        h('h2', { style: { fontSize: '1.8rem', fontWeight: 800, color: '#1e1b4b', marginBottom: 8 } }, 'Order Successfully Placed!'),
        h('p', { style: { color: '#64748b', marginBottom: 24 } }, 'Your transaction has been processed in MongoDB.'),
        h('div', { style: { background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 24 } },
          h('span', { style: { fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' } }, 'Confirmation ID: '),
          h('strong', { style: { color: '#4338ca', fontSize: '1.3rem' } }, orderConfirmedId)
        ),
        h('button', { className: 'btn btn-primary', onClick: () => { setOrderConfirmedId(null); setRoute('store'); } }, 'Return to Store Homepage')
      );
    }

    return h('div', { className: 'container' },
      h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, marginBottom: 24 } }, 'Your Shopping Cart'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }, className: 'catalog-layout' },
        h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 } },
          h('table', { className: 'cart-table' },
            h('thead', null,
              h('tr', null,
                h('th', null, 'Item'),
                h('th', null, 'Price'),
                h('th', null, 'Qty'),
                h('th', null, 'Total'),
                h('th', null, 'Action')
              )
            ),
            h('tbody', null,
              cart.length === 0 ? (
                h('tr', null, h('td', { colSpan: 5, style: { textAlign: 'center', padding: 30, color: '#64748b' } }, 'Your cart is empty.'))
              ) : cart.map((item, idx) =>
                h('tr', { key: idx },
                  h('td', { style: { fontWeight: 600 } }, item.name),
                  h('td', null, `$${item.price.toFixed(2)}`),
                  h('td', null,
                    h('input', {
                      type: 'number',
                      className: 'qty-input',
                      value: item.quantity,
                      onChange: e => handleUpdateQuantity(idx, e.target.value)
                    }),
                    h('div', { style: { fontSize: '0.75rem', color: '#64748b' } }, `Stock: ${item.stock}`)
                  ),
                  // BUG-001: multiplies negative number
                  h('td', { style: { fontWeight: 700 } }, `$${(item.price * item.quantity).toFixed(2)}`),
                  h('td', null,
                    h('button', { className: 'btn btn-sm btn-danger', onClick: () => handleRemoveFromCart(idx) }, 'Remove')
                  )
                )
              )
            )
          ),

          // Coupon Box
          h('div', { style: { background: '#f8fafc', padding: 16, borderRadius: 8, marginTop: 16 } },
            h('label', { style: { fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: 6 } }, 'Have a Promo Code? (Try SAVE20)'),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', { id: 'react-coupon-input', className: 'form-control', placeholder: 'SAVE20' }),
              h('button', {
                className: 'btn btn-secondary',
                onClick: () => {
                  const val = document.getElementById('react-coupon-input').value;
                  handleApplyCoupon(val);
                }
              }, 'Apply')
            )
          ),

          // Shipping & Card Form
          h('div', { style: { marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 20 } },
            h('h3', { style: { fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 } }, 'Shipping & Card Payment'),
            h('form', {
              id: 'react-checkout-form',
              onSubmit: (e) => {
                e.preventDefault();
                handlePlaceOrder({
                  fullName: e.target.fullName.value,
                  address: e.target.address.value,
                  card: e.target.card.value,
                  expiry: e.target.expiry.value,
                  agreeTerms: e.target.agreeTerms.checked
                });
              }
            },
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Full Name *'),
                h('input', { name: 'fullName', className: 'form-control', defaultValue: "Liam O'Connor", required: true }),
                h('span', { style: { fontSize: '0.75rem', color: '#64748b' } }, 'Must match delivery identity.')
              ),
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Street Address *'),
                h('input', { name: 'address', className: 'form-control', defaultValue: '123 Innovation Drive', required: true })
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }, className: 'form-group' },
                h('div', null,
                  h('label', { className: 'form-label' }, 'Card Number *'),
                  h('input', { name: 'card', className: 'form-control', defaultValue: '4532 0150 2819 4012', required: true })
                ),
                h('div', null,
                  h('label', { className: 'form-label' }, 'Expiry (MM/YY) *'),
                  h('input', { name: 'expiry', className: 'form-control', defaultValue: '12/30', required: true })
                ),
                h('div', null,
                  h('label', { className: 'form-label' }, 'CVV *'),
                  h('input', { name: 'cvv', className: 'form-control', defaultValue: '882', required: true })
                )
              ),

              // BUG-013: Overlapped on mobile viewport < 450px
              h('div', { className: 'form-group', style: { marginTop: 16 } },
                h('label', { className: 'checkbox-item', style: { fontSize: '0.85rem' } },
                  h('input', { type: 'checkbox', name: 'agreeTerms', defaultChecked: true }),
                  h('span', null,
                    'I agree to the ',
                    h('a', { href: 'javascript:void(0)', onClick: () => setTermsModalOpen(true) }, 'Terms of Service'),
                    ' and billing terms.'
                  )
                )
              )
            )
          )
        ),

        // Order Summary Card
        h('aside', null,
          h('div', { className: 'cart-summary-card' },
            h('h3', { style: { fontSize: '1.15rem', fontWeight: 700, marginBottom: 20 } }, 'Order Summary'),
            h('div', { className: 'summary-row' },
              h('span', { style: { color: '#64748b' } }, 'Subtotal'),
              h('span', { style: { fontWeight: 600 } }, `$${totals.subtotal.toFixed(2)}`)
            ),
            h('div', { className: 'summary-row' },
              h('span', { style: { color: '#64748b' } }, 'Shipping'),
              h('span', { style: { fontWeight: 600 } }, totals.shipping === 0 ? 'FREE ($0.00)' : `$${totals.shipping.toFixed(2)}`)
            ),
            h('div', { className: 'summary-row' },
              h('span', { style: { color: '#64748b' } }, 'Discount (SAVE20)'),
              h('span', { style: { color: '#16a34a', fontWeight: 600 } }, `-$${totals.discount.toFixed(2)}`)
            ),
            h('div', { className: 'summary-row summary-total' },
              h('span', null, 'Estimated Total'),
              h('span', { style: { color: '#4338ca' } }, `$${totals.grandTotal.toFixed(2)}`)
            ),

            // BUG-013: Sticky Bar on mobile
            h('div', { className: 'checkout-sticky-bar', style: { marginTop: 24 } },
              // BUG-003: Double-click fires duplicate orders
              h('button', {
                type: 'submit',
                form: 'react-checkout-form',
                className: 'btn btn-primary btn-block',
                style: { padding: 14 }
              }, 'Place Order Now ➔')
            )
          )
        )
      )
    );
  }

  // =========================================================================
  // VIEW: USER PROFILE & SETTINGS (Hosts BUG-021 to BUG-025)
  // =========================================================================
  function renderProfileView() {
    return h('div', { className: 'container', style: { maxWidth: 880 } },
      h('div', { style: { marginBottom: 24 } },
        h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' } }, '👤 Account Profile & Security Settings'),
        h('p', { style: { color: '#64748b', fontSize: '0.95rem', marginTop: 4 } },
          'Manage your personal contact details, security credentials, and communication preferences.'
        )
      ),

      // Section 1: Personal Information Card (BUG-022 & BUG-024)
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 } },
        h('h2', { style: { fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, color: '#1e293b' } }, 'Personal Information'),
        h('form', { onSubmit: handleUpdateProfile },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } },
            h('div', null,
              h('label', { className: 'form-label' }, 'Full Name *'),
              h('input', { name: 'fullName', className: 'form-control', defaultValue: profileData.fullName, required: true })
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'Email Address *'),
              // BUG-024: Accepts invalid email format without domain (e.g. 'student@')
              h('input', { name: 'email', className: 'form-control', defaultValue: profileData.email, required: true }),
              h('span', { style: { fontSize: '0.74rem', color: '#64748b' } }, 'Used for order receipts & login.')
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'Phone Number *'),
              // BUG-022: Accepts letters and special characters without numeric validation!
              h('input', { name: 'phone', className: 'form-control', defaultValue: profileData.phone, required: true }),
              h('span', { style: { fontSize: '0.74rem', color: '#64748b' } }, 'Standard phone format (e.g. +1 555-019-2834).')
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'Shipping Address *'),
              h('input', { name: 'address', className: 'form-control', defaultValue: profileData.address, required: true })
            )
          ),
          h('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Profile Changes')
        )
      ),

      // Section 2: Change Password Card (BUG-021)
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 } },
        h('h2', { style: { fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#1e293b' } }, 'Change Password'),
        h('p', { style: { fontSize: '0.85rem', color: '#64748b', marginBottom: 16 } },
          'Passwords must enforce a minimum of 8 characters and require matching confirmation.'
        ),
        h('form', { onSubmit: handleUpdatePassword },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 } },
            h('div', null,
              h('label', { className: 'form-label' }, 'Current Password *'),
              h('input', {
                type: 'password',
                className: 'form-control',
                value: passwordForm.currentPass,
                onChange: e => setPasswordForm({ ...passwordForm, currentPass: e.target.value }),
                placeholder: '••••••••',
                required: true
              })
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'New Password *'),
              // BUG-021: Allows 1-character password
              h('input', {
                type: 'password',
                className: 'form-control',
                value: passwordForm.newPass,
                onChange: e => setPasswordForm({ ...passwordForm, newPass: e.target.value }),
                placeholder: 'e.g. Secret@123',
                required: true
              })
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'Confirm New Password *'),
              // BUG-021: Disregards mismatch with newPass
              h('input', {
                type: 'password',
                className: 'form-control',
                value: passwordForm.confirmPass,
                onChange: e => setPasswordForm({ ...passwordForm, confirmPass: e.target.value }),
                placeholder: '••••••••',
                required: true
              })
            )
          ),
          h('button', { type: 'submit', className: 'btn btn-primary' }, 'Update Password')
        )
      ),

      // Section 3: Notification Preferences (BUG-023)
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 } },
        h('h2', { style: { fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#1e293b' } }, 'Notification Preferences'),
        h('p', { style: { fontSize: '0.85rem', color: '#64748b', marginBottom: 14 } },
          'Choose how you would like to receive shipment updates and marketing alerts.'
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 } },
          h('label', { className: 'checkbox-item', style: { fontSize: '0.9rem' } },
            h('input', {
              type: 'checkbox',
              checked: notificationSettings.emailAlerts,
              onChange: e => setNotificationSettings({ ...notificationSettings, emailAlerts: e.target.checked })
            }),
            h('span', null, 'Email Notifications: Order confirmations, tracking updates, and account activity.')
          ),
          h('label', { className: 'checkbox-item', style: { fontSize: '0.9rem' } },
            h('input', {
              type: 'checkbox',
              checked: notificationSettings.smsAlerts,
              onChange: e => setNotificationSettings({ ...notificationSettings, smsAlerts: e.target.checked })
            }),
            h('span', null, 'SMS Order Alerts: Instant text alerts when orders are dispatched.')
          ),
          h('label', { className: 'checkbox-item', style: { fontSize: '0.9rem' } },
            h('input', {
              type: 'checkbox',
              checked: notificationSettings.promoDeals,
              onChange: e => setNotificationSettings({ ...notificationSettings, promoDeals: e.target.checked })
            }),
            h('span', null, 'Promotional Deals: Exclusive discounts, weekly drops, and flash clearance coupons.')
          )
        ),
        // BUG-023: Shows success toast, but values silently revert on page refresh or navigation
        h('button', {
          type: 'button',
          className: 'btn btn-secondary',
          onClick: handleSaveNotificationSettings
        }, 'Save Notification Preferences')
      ),

      // Section 4: Danger Zone (BUG-025)
      h('div', { style: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24 } },
        h('h2', { style: { fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', marginBottom: 6 } }, '⚠️ Danger Zone'),
        h('p', { style: { fontSize: '0.85rem', color: '#7f1d1d', marginBottom: 16 } },
          'Deleting your account will permanently wipe your session and candidate test records. This action cannot be reversed.'
        ),
        // BUG-025: Wipes account immediately on single click with NO confirmation dialog!
        h('button', {
          type: 'button',
          className: 'btn btn-danger',
          onClick: handleDeleteAccountImmediately
        }, 'Delete Account Immediately')
      )
    );
  }

  // =========================================================================
  // VIEW: ORDER HISTORY & TRACKING (Hosts BUG-026 to BUG-030)
  // =========================================================================
  function renderOrdersView() {
    const ordersPerPage = 2;
    // BUG-027: Strictly case-sensitive search filter!
    const filtered = ordersList.filter(o => {
      if (!orderSearchQuery.trim()) return true;
      return o.id.includes(orderSearchQuery.trim());
    });

    const totalPages = Math.ceil(filtered.length / ordersPerPage) || 1;
    // BUG-030: Slicing with orderPage when out-of-bounds yields []
    const paged = filtered.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

    return h('div', { className: 'container', style: { maxWidth: 960 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 } },
        h('div', null,
          h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' } }, '📦 Order History & Real-Time Tracking'),
          h('p', { style: { color: '#64748b', fontSize: '0.95rem', marginTop: 4 } },
            'Review past purchases, check real-time courier tracking, view tax invoices, or re-order past items.'
          )
        ),
        h('div', { style: { width: 300 } },
          // BUG-027: Strictly case-sensitive search
          h('input', {
            className: 'form-control',
            placeholder: 'Search Order ID (e.g. ORD-9942)...',
            value: orderSearchQuery,
            onChange: e => { setOrderSearchQuery(e.target.value); setOrderPage(1); }
          })
        )
      ),

      // Orders Table Card
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 } },
        h('table', { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' } },
          h('thead', { style: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' } },
            h('tr', null,
              h('th', { style: { padding: '14px 18px', fontWeight: 700, color: '#475569' } }, 'Order ID'),
              h('th', { style: { padding: '14px 18px', fontWeight: 700, color: '#475569' } }, 'Date'),
              h('th', { style: { padding: '14px 18px', fontWeight: 700, color: '#475569' } }, 'Items'),
              h('th', { style: { padding: '14px 18px', fontWeight: 700, color: '#475569' } }, 'Total'),
              h('th', { style: { padding: '14px 18px', fontWeight: 700, color: '#475569' } }, 'Status'),
              h('th', { style: { padding: '14px 18px', fontWeight: 700, color: '#475569', textAlign: 'right' } }, 'Actions')
            )
          ),
          h('tbody', null,
            paged.length === 0 ? (
              h('tr', null,
                h('td', { colSpan: 6, style: { padding: 40, textAlign: 'center', color: '#94a3b8' } },
                  orderSearchQuery ? `No orders found matching "${orderSearchQuery}". (Check exact case)` : 'No orders on this page.'
                )
              )
            ) : (
              paged.map(ord =>
                h('tr', { key: ord.id, style: { borderBottom: '1px solid #f1f5f9' } },
                  h('td', { style: { padding: '16px 18px', fontWeight: 700, color: '#1e1b4b' } }, ord.id),
                  h('td', { style: { padding: '16px 18px', color: '#64748b' } }, ord.date),
                  h('td', { style: { padding: '16px 18px' } },
                    h('div', { style: { fontWeight: 600 } }, `${ord.items.length} Product(s)`),
                    h('div', { style: { fontSize: '0.78rem', color: '#64748b' } },
                      ord.items.map(it => `${it.name} (x${it.quantity})`).join(', ')
                    )
                  ),
                  h('td', { style: { padding: '16px 18px', fontWeight: 700, color: '#0f172a' } }, `$${ord.total.toFixed(2)}`),
                  h('td', { style: { padding: '16px 18px' } },
                    h('span', {
                      style: {
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background: ord.status === 'Delivered' ? '#dcfce7' : ord.status === 'In Transit' ? '#e0e7ff' : '#fef3c7',
                        color: ord.status === 'Delivered' ? '#15803d' : ord.status === 'In Transit' ? '#4338ca' : '#b45309'
                      }
                    }, ord.status),
                    // BUG-026 hint in tracking
                    ord.status === 'Delivered' && h('div', { style: { fontSize: '0.72rem', color: '#16a34a', marginTop: 2 } },
                      `Delivered: ${ord.deliveryDate}`
                    )
                  ),
                  h('td', { style: { padding: '16px 18px', textAlign: 'right' } },
                    h('div', { style: { display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' } },
                      h('button', {
                        className: 'btn btn-secondary btn-sm',
                        style: { padding: '4px 8px', fontSize: '0.75rem' },
                        onClick: () => setActiveTrackingOrder(ord)
                      }, '📍 Track'),
                      h('button', {
                        className: 'btn btn-secondary btn-sm',
                        style: { padding: '4px 8px', fontSize: '0.75rem' },
                        onClick: () => setViewingInvoice(ord)
                      }, '📄 Invoice'),
                      // BUG-029: Re-order items adds items with $0.00 price
                      h('button', {
                        className: 'btn btn-primary btn-sm',
                        style: { padding: '4px 8px', fontSize: '0.75rem' },
                        onClick: () => handleReorderItems(ord)
                      }, '🔁 Re-Order')
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Pagination Controls (BUG-030)
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' } },
        h('button', {
          className: 'btn btn-secondary btn-sm',
          disabled: orderPage <= 1,
          onClick: () => setOrderPage(p => Math.max(1, p - 1))
        }, '◀ Previous Page'),
        h('span', { style: { fontSize: '0.88rem', fontWeight: 600, color: '#475569' } },
          `Page ${orderPage} of ${totalPages}`
        ),
        // BUG-030: Next button is NEVER disabled, incrementing past totalPages into blank screen!
        h('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: () => setOrderPage(p => p + 1)
        }, 'Next Page ▶')
      )
    );
  }

  // =========================================================================
  // MODAL: INVOICE DOWNLOAD & RECEIPT (Hosts BUG-028: Double Tax Calculation)
  // =========================================================================
  function renderInvoiceModal() {
    if (!viewingInvoice) return null;
    const inv = viewingInvoice;
    // BUG-028: Invoice compounds tax twice!
    const doubleTaxTotal = inv.subtotal + (inv.tax * 2) + inv.shipping;

    return h('div', { className: 'modal-overlay' },
      h('div', { className: 'modal-dialog', style: { width: 560 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('h3', { style: { fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' } }, `Official Tax Invoice #${inv.id}`),
          h('button', {
            onClick: () => setViewingInvoice(null),
            style: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }
          }, '✕')
        ),

        h('div', { style: { fontSize: '0.85rem', color: '#475569', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 } },
          h('div', null, h('strong', null, 'Billed To: '), profileData.fullName),
          h('div', null, h('strong', null, 'Order Date: '), inv.date),
          h('div', null, h('strong', null, 'Payment Status: '), 'Paid in Full (Card)')
        ),

        // Items Breakdown
        h('table', { style: { width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', marginBottom: 16 } },
          h('thead', { style: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' } },
            h('tr', null,
              h('th', { style: { padding: 6, textAlign: 'left' } }, 'Description'),
              h('th', { style: { padding: 6, textAlign: 'center' } }, 'Qty'),
              h('th', { style: { padding: 6, textAlign: 'right' } }, 'Unit Price'),
              h('th', { style: { padding: 6, textAlign: 'right' } }, 'Total')
            )
          ),
          h('tbody', null,
            inv.items.map((it, idx) =>
              h('tr', { key: idx, style: { borderBottom: '1px solid #f1f5f9' } },
                h('td', { style: { padding: 6 } }, it.name),
                h('td', { style: { padding: 6, textAlign: 'center' } }, it.quantity),
                h('td', { style: { padding: 6, textAlign: 'right' } }, `$${it.price.toFixed(2)}`),
                h('td', { style: { padding: 6, textAlign: 'right', fontWeight: 600 } }, `$${(it.price * it.quantity).toFixed(2)}`)
              )
            )
          )
        ),

        // Cost Calculation Box (BUG-028)
        h('div', { style: { background: '#f8fafc', borderRadius: 8, padding: 14, fontSize: '0.85rem' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
            h('span', null, 'Subtotal:'),
            h('span', { fontWeight: 600 }, `$${inv.subtotal.toFixed(2)}`)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
            h('span', null, 'Standard Sales Tax (10%):'),
            h('span', null, `$${inv.tax.toFixed(2)}`)
          ),
          // BUG-028: Tax added a second time as "Regional Processing Surcharge"
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#dc2626' } },
            h('span', null, 'Regional Processing Tax (10% - Double Counted):'),
            h('span', null, `$${inv.tax.toFixed(2)}`)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
            h('span', null, 'Shipping & Handling:'),
            h('span', null, `$${inv.shipping.toFixed(2)}`)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: 8, fontWeight: 800, fontSize: '0.98rem', color: '#1e1b4b' } },
            h('span', null, 'Invoice Grand Total:'),
            h('span', null, `$${doubleTaxTotal.toFixed(2)}`)
          )
        ),

        h('div', { style: { marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' } },
          h('button', {
            className: 'btn btn-primary btn-sm',
            onClick: () => showToast(`Invoice #${inv.id} downloaded successfully!`, 'success')
          }, '⬇ Download PDF Receipt'),
          h('button', {
            className: 'btn btn-secondary btn-sm',
            onClick: () => setViewingInvoice(null)
          }, 'Close')
        )
      )
    );
  }

  // =========================================================================
  // MODAL: SHIPMENT TRACKING (Hosts BUG-026: Impossible Year 2099 Delivery)
  // =========================================================================
  function renderTrackingModal() {
    if (!activeTrackingOrder) return null;
    const ord = activeTrackingOrder;

    return h('div', { className: 'modal-overlay' },
      h('div', { className: 'modal-dialog', style: { width: 500 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('h3', { style: { fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' } }, `Shipment Tracking: #${ord.id}`),
          h('button', {
            onClick: () => setActiveTrackingOrder(null),
            style: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }
          }, '✕')
        ),

        // Courier Details
        h('div', { style: { background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 18, fontSize: '0.85rem' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
            h('span', { color: '#64748b' }, 'Carrier:'),
            h('strong', null, 'ShopPulse Express Courier')
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
            h('span', { color: '#64748b' }, 'Current Status:'),
            h('span', { style: { fontWeight: 700, color: '#16a34a' } }, ord.status)
          ),
          // BUG-026: Order #ORD-8821 tracking shows "Delivered on December 31, 2099"
          h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 } },
            h('span', null, 'Delivery Timestamp:'),
            h('span', null, ord.deliveryDate)
          )
        ),

        // Tracking Stepper
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, margin: '20px 10px' } },
          [
            { title: 'Order Confirmed', time: 'March 28, 2026', done: true },
            { title: 'Package Packed & Dispatched', time: 'March 29, 2026', done: true },
            { title: 'In Transit - Local Hub', time: 'March 30, 2026', done: true },
            { title: `Delivered (${ord.deliveryDate})`, time: ord.deliveryDate, done: ord.status === 'Delivered', active: true }
          ].map((st, i) =>
            h('div', { key: i, style: { display: 'flex', gap: 12, alignItems: 'center' } },
              h('div', {
                style: {
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: st.done ? '#16a34a' : '#cbd5e1',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }
              }, st.done ? '✓' : i + 1),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: '0.85rem', color: st.active ? '#16a34a' : '#1e293b' } }, st.title),
                h('div', { style: { fontSize: '0.74rem', color: '#64748b' } }, st.time)
              )
            )
          )
        ),

        h('div', { style: { marginTop: 24, textAlign: 'right' } },
          h('button', {
            className: 'btn btn-secondary btn-sm',
            onClick: () => setActiveTrackingOrder(null)
          }, 'Close')
        )
      )
    );
  }

  // =========================================================================
  // VIEW: CUSTOMER SUPPORT & HELP CENTER (Hosts BUG-031 to BUG-035)
  // =========================================================================
  function renderSupportView() {
    return h('div', { className: 'container', style: { maxWidth: 1040 } },
      h('div', { style: { marginBottom: 24 } },
        h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' } }, '🎧 Customer Support & Live Help Center'),
        h('p', { style: { color: '#64748b', fontSize: '0.95rem', marginTop: 4 } },
          'Open a support ticket, chat with our automated support bot, or browse frequent questions.'
        )
      ),

      h('div', { style: { display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' } },
        // Left Column: Submit Ticket Form
        h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 } },
          h('h2', { style: { fontSize: '1.2rem', fontWeight: 700, marginBottom: 14, color: '#1e293b' } }, 'Submit an Inquiry Ticket'),
          h('form', { onSubmit: handleSupportTicketSubmit },
            // Priority Badges (BUG-035: Inverted Colors - Urgent is Green, Low is Red)
            h('div', { style: { marginBottom: 16 } },
              h('label', { className: 'form-label', style: { marginBottom: 8 } }, 'Ticket Priority Level *'),
              h('div', { style: { display: 'flex', gap: 10 } },
                ['Low', 'Normal', 'Urgent'].map(p => {
                  let color = '#3b82f6';
                  // BUG-035: Inverted color semantics!
                  if (p === 'Urgent') color = '#22c55e'; // Green for Urgent!
                  if (p === 'Low') color = '#ef4444'; // Red for Low!
                  const isSel = supportTicket.priority === p;
                  return h('button', {
                    key: p,
                    type: 'button',
                    onClick: () => setSupportTicket({ ...supportTicket, priority: p }),
                    style: {
                      background: isSel ? color : '#f8fafc',
                      color: isSel ? 'white' : color,
                      border: `2px solid ${color}`,
                      borderRadius: 20,
                      padding: '5px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }
                  }, `${p} Priority`);
                })
              )
            ),

            // Subject (BUG-031: Allows blank)
            h('div', { className: 'form-group', style: { marginBottom: 14 } },
              h('label', { className: 'form-label' }, 'Subject *'),
              h('input', {
                name: 'subject',
                className: 'form-control',
                placeholder: 'e.g. Order #ORD-8821 tracking question...',
                value: supportTicket.subject,
                onChange: e => setSupportTicket({ ...supportTicket, subject: e.target.value })
              })
            ),

            // Message (BUG-031: Allows blank)
            h('div', { className: 'form-group', style: { marginBottom: 14 } },
              h('label', { className: 'form-label' }, 'Message Description *'),
              h('textarea', {
                name: 'message',
                className: 'form-control',
                rows: 4,
                placeholder: 'Please provide full details of your question or issue...',
                value: supportTicket.message,
                onChange: e => setSupportTicket({ ...supportTicket, message: e.target.value })
              })
            ),

            // File Attachment (BUG-032: No accept attribute, allows dangerous .exe, .sh)
            h('div', { className: 'form-group', style: { marginBottom: 18 } },
              h('label', { className: 'form-label' }, 'Attach Diagnostic Log / Screenshot (Optional)'),
              h('input', {
                type: 'file',
                className: 'form-control',
                onChange: handleSupportFileAttachment
                // BUG-032: Missing accept="image/*,application/pdf"
              }),
              supportTicket.attachmentName && h('div', { style: { fontSize: '0.78rem', color: '#16a34a', marginTop: 4, fontWeight: 600 } },
                `✓ Attached file: ${supportTicket.attachmentName}`
              )
            ),

            h('button', { type: 'submit', className: 'btn btn-primary btn-block' }, '🚀 Submit Support Ticket')
          )
        ),

        // Right Column: Live Chat & FAQ
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20 } },
          // Live Chat Widget (BUG-034: >100 characters triggers crash)
          h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' } },
            h('div', { style: { background: '#0e0e10', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('div', { style: { fontWeight: 700, fontSize: '0.9rem' } }, '💬 PulseBot Live Support'),
              h('span', { style: { fontSize: '0.72rem', background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: 10, fontWeight: 700 } }, '● Online')
            ),

            chatCrashed ? (
              // BUG-034: Simulated crash box
              h('div', { style: { padding: 18, background: '#fee2e2', color: '#991b1b' } },
                h('div', { style: { fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 } }, '⚠️ Uncaught RangeError: Maximum call stack size exceeded'),
                h('pre', { style: { fontSize: '0.72rem', background: '#fecaca', padding: 8, borderRadius: 4, overflowX: 'auto' } },
                  'at renderChatStream (app.js:1420)\nat Object.dispatch (react.development.js:1630)\nat handleSendChatMessage (app.js:612)'
                ),
                h('p', { style: { fontSize: '0.78rem', marginTop: 8 } }, 'The live chat worker thread crashed due to unbounded recursion on messages > 100 characters.'),
                h('button', {
                  className: 'btn btn-secondary btn-sm',
                  style: { marginTop: 10 },
                  onClick: () => { setChatCrashed(false); setChatInput(''); }
                }, 'Reboot Chat Session')
              )
            ) : (
              h('div', null,
                h('div', { style: { height: 180, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' } },
                  chatMessages.map((m, idx) =>
                    h('div', {
                      key: idx,
                      style: {
                        alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: m.sender === 'user' ? '#da1c5c' : '#ffffff',
                        color: m.sender === 'user' ? '#ffffff' : '#1e293b',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0'
                      }
                    }, m.text)
                  )
                ),
                h('form', { onSubmit: handleSendChatMessage, style: { display: 'flex', borderTop: '1px solid #e2e8f0' } },
                  h('input', {
                    style: { flex: 1, border: 'none', padding: '10px 14px', fontSize: '0.82rem', outline: 'none' },
                    placeholder: 'Type message... (Max 100 chars)',
                    value: chatInput,
                    onChange: e => setChatInput(e.target.value)
                  }),
                  h('button', {
                    type: 'submit',
                    style: { background: '#da1c5c', color: 'white', border: 'none', padding: '0 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }
                  }, 'Send')
                )
              )
            )
          ),

          // FAQ Accordion (BUG-033: Cannot toggle via keyboard, lacks aria-expanded)
          h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 } },
            h('h3', { style: { fontSize: '1.05rem', fontWeight: 700, marginBottom: 12, color: '#1e293b' } }, 'Frequently Asked Questions'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              faqsList.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return h('div', { key: faq.id || idx, style: { border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' } },
                  // BUG-033: Clickable div without keyboard listener or aria-expanded
                  h('div', {
                    onClick: () => setOpenFaqIndex(isOpen ? null : idx),
                    style: { padding: '10px 14px', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }
                  },
                    h('span', null, faq.q),
                    h('span', { style: { fontSize: '0.75rem', color: '#64748b' } }, isOpen ? '▲' : '▼')
                  ),
                  isOpen && h('div', { style: { padding: '10px 14px', fontSize: '0.82rem', color: '#475569', background: 'white', borderTop: '1px solid #f1f5f9', lineHeight: 1.5 } },
                    faq.a
                  )
                );
              })
            )
          )
        )
      )
    );
  }

  // =========================================================================
  // VIEW: WISHLIST & SAVED PICKS (Hosts BUG-036 to BUG-040)
  // =========================================================================
  function renderWishlistView() {
    // BUG-039: Sorts by price as text string for 'price-asc'
    const sorted = [...wishlist].sort((a, b) => {
      if (wishlistSort === 'price-asc') {
        // BUG-039: Lexicographical string sort on '$' + price!
        return ('$' + a.price).localeCompare('$' + b.price);
      }
      if (wishlistSort === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });

    return h('div', { className: 'container', style: { maxWidth: 1040 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 } },
        h('div', null,
          h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' } }, '🤍 Wishlist & Saved Collections'),
          h('p', { style: { color: '#64748b', fontSize: '0.95rem', marginTop: 4 } },
            `Saved Items (${wishlist.length} products). Items saved for future orders.`
          )
        ),
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
          // BUG-039: Sort dropdown
          h('select', {
            className: 'form-control',
            value: wishlistSort,
            onChange: e => setWishlistSort(e.target.value),
            style: { width: 220, fontSize: '0.85rem' }
          },
            h('option', { value: 'default' }, 'Sort by: Default'),
            h('option', { value: 'price-asc' }, 'Sort by Price: Low to High'),
            h('option', { value: 'price-desc' }, 'Sort by Price: High to Low')
          ),
          // BUG-036: Move all to cart leaves items in wishlist!
          h('button', {
            className: 'btn btn-primary',
            onClick: handleMoveAllWishlistToCart,
            disabled: wishlist.length === 0
          }, '🛍️ Move All to Bag')
        )
      ),

      wishlist.length === 0 ? (
        h('div', { style: { textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' } },
          h('div', { style: { fontSize: '2.5rem', marginBottom: 10 } }, '🤍'),
          h('h3', { style: { fontSize: '1.2rem', fontWeight: 700 } }, 'Your Wishlist is Empty'),
          h('p', { style: { color: '#64748b', fontSize: '0.88rem', marginTop: 4 } }, 'Explore our catalog and click the heart icon to save products.'),
          h('button', { className: 'btn btn-secondary', style: { marginTop: 16 }, onClick: () => setRoute('store') }, 'Browse Store ➔')
        )
      ) : (
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 } },
          sorted.map(item =>
            h('div', {
              key: item.id,
              style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            },
              h('div', { style: { height: 180, position: 'relative', background: '#f8fafc', overflow: 'hidden' } },
                h('img', { src: item.image, alt: item.name, style: { width: '100%', height: '100%', objectFit: 'cover' } }),
                item.stock === 0 ? (
                  h('span', { style: { position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 } }, 'Out of Stock')
                ) : (
                  h('span', { style: { position: 'absolute', top: 10, right: 10, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 } }, `In Stock (${item.stock})`)
                )
              ),
              h('div', { style: { padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } },
                h('div', null,
                  h('div', { style: { fontSize: '0.72rem', color: '#da1c5c', fontWeight: 700, textTransform: 'uppercase' } }, item.category),
                  h('div', { style: { fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', margin: '4px 0 6px 0' } }, item.name),
                  h('div', { style: { fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b' } }, `$${item.price.toFixed(2)}`)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
                  // BUG-037: Move to Cart bypasses inventory check for Product #4 (0 stock)
                  h('button', {
                    className: 'btn btn-primary btn-sm',
                    style: { flex: 1, fontSize: '0.78rem' },
                    onClick: () => handleMoveWishlistItemToCart(item)
                  }, '+ Move to Bag'),
                  // BUG-040: Removed item resurrects on route navigation
                  h('button', {
                    className: 'btn btn-secondary btn-sm',
                    style: { fontSize: '0.78rem' },
                    onClick: () => handleRemoveFromWishlist(item.id)
                  }, 'Remove')
                )
              )
            )
          )
        )
      )
    );
  }

  function renderCompletedView() {
    if (!candidate) return renderBriefView();

    return h('div', { className: 'container', style: { maxWidth: 620, textAlign: 'center', background: 'white', padding: '40px 32px', borderRadius: 20, border: '1px solid #e2e8f0', marginTop: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' } },
      h('div', { style: { width: 72, height: 72, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', margin: '0 auto 16px auto' } }, '✓'),
      h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: '#0f172a' } }, 'Assessment Concluded & Submitted'),
      h('p', { style: { color: '#64748b', marginBottom: 20, fontSize: '0.95rem' } }, `Thank you, ${candidate.fullName}. Your reports have been safely recorded in MongoDB for evaluation.`),

      // Concluded Session Security Notice
      h('div', { style: { background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: '#92400e', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center' } },
        h('span', { style: { fontSize: '1.3rem' } }, '🔒'),
        h('div', null,
          h('strong', null, 'Testing Session Closed: '),
          'Your assessment has been officially submitted for grading. Storefront access and bug reporting have been locked to preserve evaluation integrity.'
        )
      ),

      h('div', { style: { background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'left', border: '1px solid #e2e8f0' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
          h('span', { style: { color: '#64748b' } }, 'Applicant:'),
          h('strong', null, candidate.fullName)
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
          h('span', { style: { color: '#64748b' } }, 'Registered Email:'),
          h('span', { style: { color: '#1e293b', fontWeight: 600 } }, candidate.email)
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
          h('span', { style: { color: '#64748b' } }, 'Session Token:'),
          h('code', { style: { color: '#4338ca', fontWeight: 700 } }, candidate.token)
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
          h('span', { style: { color: '#64748b' } }, 'Issues Logged:'),
          h('strong', { style: { color: '#4338ca' } }, `${myReports.length} Issues`)
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
          h('span', { style: { color: '#64748b' } }, 'Session Status:'),
          h('span', { style: { background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 } }, 'Submitted & Locked')
        )
      ),

      // Concluded Navigation Actions (Return to Store is removed)
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
        h('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: () => setShowCompletedReports(!showCompletedReports)
        }, showCompletedReports ? '▲ Hide Submitted Reports' : `📋 View Submitted Reports (${myReports.length})`),
        h('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: () => setRoute('brief')
        }, '📄 Review PRD Specs'),
        h('button', {
          className: 'btn btn-sm',
          style: { background: '#ef4444', color: '#ffffff', border: 'none' },
          onClick: handleExitCandidateSession
        }, '🚪 Conclude & Exit Session')
      ),

      // Expandable read-only summary of candidate's own reports (blind preserved)
      showCompletedReports && h('div', { style: { marginTop: 24, textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: 20 } },
        h('h3', { style: { fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, color: '#1e293b' } }, `Your Logged Reports (${myReports.length})`),
        myReports.length === 0 ? (
          h('p', { style: { color: '#94a3b8', fontSize: '0.88rem' } }, 'No bug reports were recorded during this session.')
        ) : (
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' } },
            myReports.map((rep, idx) =>
              h('div', {
                key: rep._id || idx,
                style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }
              },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                  h('strong', { style: { fontSize: '0.88rem', color: '#0f172a' } }, `#${rep.reportNumber || (idx + 1)} ${rep.title}`),
                  h('span', { style: { fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#4338ca' } }, rep.severity || 'Medium')
                ),
                h('div', { style: { fontSize: '0.78rem', color: '#64748b' } }, `Category: ${rep.category}`)
              )
            )
          )
        )
      )
    );
  }

  function renderNewReportForm() {
    return h('div', { className: 'drawer-body' },
      // Quick Sample Helper Card
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 8 } },
        h('span', { style: { fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 } }, '💡 First time reporting a bug?'),
        h('button', {
          type: 'button',
          onClick: () => {
            setBugForm({
              title: 'Free shipping over $50 banner not working in cart',
              category: 'Business Logic',
              severity: 'Major',
              steps: '1. Add $79 earbuds to cart\n2. View cart shipping calculation',
              expected: 'Shipping should be free ($0.00)',
              actual: 'Cart still charged $10.00 shipping fee'
            });
          },
          style: { background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }
        }, 'Load Sample Template')
      ),

      h('form', { onSubmit: handleBugReportSubmit },
        h('div', { className: 'form-group', style: { marginBottom: 10 } },
          h('label', { className: 'form-label', style: { fontSize: '0.83rem', fontWeight: 700 } }, 'What is the bug? (Short Title) *'),
          h('input', {
            className: 'form-control',
            placeholder: 'e.g. Coupon SAVE20 applies multiple times',
            value: bugForm.title,
            onChange: e => setBugForm({ ...bugForm, title: e.target.value }),
            required: true,
            style: { padding: '8px 12px', fontSize: '0.88rem' }
          })
        ),

        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
          h('div', null,
            h('label', { className: 'form-label', style: { fontSize: '0.8rem', fontWeight: 700 } }, 'Feature Area *'),
            h('select', {
              className: 'form-control',
              value: bugForm.category,
              onChange: e => setBugForm({ ...bugForm, category: e.target.value }),
              style: { padding: '7px 10px', fontSize: '0.82rem' }
            },
              [
                { label: '🛒 Cart & Pricing', val: 'Business Logic' },
                { label: '⚙️ Features & Buttons', val: 'Functional' },
                { label: '🎨 Visual & Display', val: 'UI & Visual' },
                { label: '📝 Forms & Inputs', val: 'Input Validation' },
                { label: '🔍 Search & Filters', val: 'Filter Validation' },
                { label: 'Other', val: 'Other' }
              ].map(c => h('option', { key: c.val, value: c.val }, c.label))
            )
          ),
          h('div', null,
            h('label', { className: 'form-label', style: { fontSize: '0.8rem', fontWeight: 700 } }, 'Impact Level *'),
            h('select', {
              className: 'form-control',
              value: bugForm.severity,
              onChange: e => setBugForm({ ...bugForm, severity: e.target.value }),
              style: { padding: '7px 10px', fontSize: '0.82rem' }
            },
              [
                { label: '🔴 Critical (Breaks store/payment)', val: 'Blocker' },
                { label: '🟠 Major (Feature not working)', val: 'Major' },
                { label: '🟡 Medium (Unexpected behavior)', val: 'Medium' },
                { label: '🟢 Minor (Visual glitch / typo)', val: 'Minor' }
              ].map(s => h('option', { key: s.val, value: s.val }, s.label))
            )
          )
        ),

        h('div', { className: 'form-group', style: { marginBottom: 10 } },
          h('label', { className: 'form-label', style: { fontSize: '0.83rem', fontWeight: 700 } }, 'Steps to See the Bug *'),
          h('textarea', {
            className: 'form-control',
            rows: 2,
            placeholder: '1. Add item to cart\n2. Change quantity to -1',
            value: bugForm.steps,
            onChange: e => setBugForm({ ...bugForm, steps: e.target.value }),
            required: true,
            style: { padding: '8px 12px', fontSize: '0.85rem' }
          })
        ),

        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 } },
          h('div', null,
            h('label', { className: 'form-label', style: { fontSize: '0.8rem', fontWeight: 700, color: '#166534' } }, 'Expected Behavior'),
            h('textarea', {
              className: 'form-control',
              rows: 2,
              placeholder: 'What should have happened? (optional)',
              value: bugForm.expected,
              onChange: e => setBugForm({ ...bugForm, expected: e.target.value }),
              style: { padding: '6px 10px', fontSize: '0.83rem' }
            })
          ),
          h('div', null,
            h('label', { className: 'form-label', style: { fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' } }, 'Actual Problem'),
            h('textarea', {
              className: 'form-control',
              rows: 2,
              placeholder: 'What actually went wrong? (optional)',
              value: bugForm.actual,
              onChange: e => setBugForm({ ...bugForm, actual: e.target.value }),
              style: { padding: '6px 10px', fontSize: '0.83rem' }
            })
          )
        ),

        h('button', {
          type: 'submit',
          className: 'btn btn-primary btn-block',
          style: { padding: '10px', fontWeight: 700, fontSize: '0.95rem' }
        }, '✓ Save Bug Report')
      )
    );
  }

  function renderMissionsTab() {
    const missions = [
      {
        title: 'Mission 1: Store & Search Exploration',
        icon: '🔍',
        desc: 'Browse product cards, test search bar with common terms, select category checkboxes, and test "Clear All Filters".',
        tips: 'Are all product images loading properly? Does clicking "Clear All Filters" uncheck every checkbox?'
      },
      {
        title: 'Mission 2: Cart, Stock & Discounts',
        icon: '🛒',
        desc: 'Add items to your cart, test promo coupon SAVE20, and try changing quantities in the cart.',
        tips: 'What happens if you type 0 or a negative number in the quantity box? Does the banner promise free shipping over $50 match the cart math?'
      },
      {
        title: 'Mission 3: Checkout & Form Rules',
        icon: '📝',
        desc: 'Proceed to checkout and test input fields, payment data, and order placement.',
        tips: 'Try placing an order with blank name or address. Does the card expiry accept future years like 12/30?'
      },
      {
        title: 'Mission 4: Product Popups & Reviews',
        icon: '⭐',
        desc: 'Click on product cards to open the detail modal, check pricing display, and submit a customer review.',
        tips: 'Does the price inside the product popup include a $ dollar sign? Can you close the Terms popup using the Esc key? What happens with HTML tags in reviews?'
      },
      {
        title: 'Mission 5: User Profile & Security Settings',
        icon: '👤',
        desc: 'Update account details on the Profile page. Test password updates, phone numbers, and notification toggles.',
        tips: 'Does Change Password accept a 1-character password and mismatch? Does phone number accept letters? Does Delete Account wipe immediately without warning?'
      },
      {
        title: 'Mission 6: Order History & Real-Time Tracking',
        icon: '📦',
        desc: 'Inspect past orders on the Orders page. Test tracking statuses, order search, tax invoices, and re-ordering.',
        tips: 'What delivery date is shown on Order #ORD-8821? Does order search work with lowercase ord-9942? Does invoice tax add up correctly, or is it double counted? What price do re-ordered items have in your bag?'
      },
      {
        title: 'Mission 7: Customer Support & Live Help',
        icon: '🎧',
        desc: 'Visit Customer Support. Test ticket submission, file attachment types, live chat messages, and FAQ accordions.',
        tips: 'Can you submit a ticket with empty subject and message? Does file attachment block dangerous .exe or .sh scripts? What happens if you send a chat message longer than 100 characters? Are priority badge colors inverted?'
      },
      {
        title: 'Mission 8: Wishlist & Saved Collections',
        icon: '🤍',
        desc: 'Manage saved products in Wishlist. Try moving all items to bag, test sorting by price, and remove an item before navigating back to store.',
        tips: 'Does Move All to Bag remove items from your wishlist? Can you move out-of-stock headphones to your bag? Does the navbar heart badge update? Does price sorting sort numerically or alphabetically? Does a removed item stay removed after returning to the store?'
      }
    ];

    return h('div', { className: 'drawer-body' },
      h('div', { style: { marginBottom: 14 } },
        h('h3', { style: { fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b' } }, '🎯 8 Student Testing Missions'),
        h('p', { style: { fontSize: '0.84rem', color: '#64748b', marginTop: 2 } },
          'Follow these 8 guided missions across all sections of the platform. Whenever you discover an anomaly, switch back to "Log Issue" to report it.'
        )
      ),
      missions.map((m, i) =>
        h('div', {
          key: i,
          style: {
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }
        },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: 4 } },
            h('span', { style: { fontSize: '1.1rem' } }, m.icon),
            h('span', null, m.title)
          ),
          h('p', { style: { fontSize: '0.82rem', color: '#475569', marginBottom: 6, lineHeight: 1.4 } }, m.desc),
          h('div', { style: { background: '#f8fafc', padding: '6px 10px', borderRadius: 6, fontSize: '0.78rem', color: '#4338ca', borderLeft: '3px solid #6366f1' } },
            h('strong', null, 'What to look for: '), m.tips
          )
        )
      ),
      h('div', { style: { textAlign: 'center', marginTop: 14 } },
        h('button', {
          className: 'btn btn-primary btn-block',
          onClick: () => setDrawerTab('new'),
          style: { padding: 10, fontWeight: 700 }
        }, 'Found something? Click to Log a Bug ➔')
      )
    );
  }

  function renderMyReportsTab() {
    return h('div', { className: 'drawer-body' },
      myReports.length === 0 ? (
        h('div', { style: { textAlign: 'center', padding: '40px 20px', color: '#64748b' } },
          h('div', { style: { fontSize: '2rem', marginBottom: 8 } }, '📋'),
          h('p', { style: { fontWeight: 600 } }, 'No reports logged yet'),
          h('p', { style: { fontSize: '0.85rem' } }, 'Test the app and click "Log New Issue" to record defects.')
        )
      ) : myReports.map(rep =>
        h('div', { key: rep._id, style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 12 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
            h('strong', null, `#${rep.reportNumber} ${rep.title}`),
            h('span', { style: { fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'white', border: '1px solid #cbd5e1' } }, rep.severity)
          ),
          h('div', { style: { fontSize: '0.8rem', color: '#64748b' } }, `Category: ${rep.category}`),
          h('pre', { style: { whiteSpace: 'pre-wrap', fontSmooth: 'always', fontSize: '0.8rem', background: 'white', padding: 6, borderRadius: 4, margin: '6px 0', border: '1px solid #e2e8f0' } }, rep.stepsToReproduce),
          h('div', { style: { fontSize: '0.8rem' } },
            h('div', { style: { color: '#166534' } }, `Expected: ${rep.expectedResult}`),
            h('div', { style: { color: '#991b1b' } }, `Actual: ${rep.actualResult}`)
          )
        )
      )
    );
  }

  function renderAdminLoginView() {
    return h('div', { className: 'container', style: { maxWidth: 480, margin: '60px auto' } },
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)', textAlign: 'center' } },
        h('div', { style: { width: 68, height: 68, background: '#eef2ff', color: '#4f46e5', borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: 20 } }, '🔐'),
        h('h2', { style: { fontSize: '1.55rem', fontWeight: 800, color: '#1e1b4b', marginBottom: 8 } }, 'Evaluator Portal Protected'),
        h('p', { style: { color: '#64748b', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 } },
          'Restricted area for exam reviewers. Enter the evaluator password to view candidate grading, master rubrics, and the 20-defect coverage matrix.'
        ),
        adminAuthError && h('div', { style: { background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, fontWeight: 600, textAlign: 'left' } },
          `⚠️ ${adminAuthError}`
        ),
        h('form', { onSubmit: handleAdminLogin },
          h('div', { style: { marginBottom: 18, textAlign: 'left' } },
            h('label', { className: 'form-label', style: { fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, display: 'block' } }, 'Evaluator Password'),
            h('input', {
              type: 'password',
              className: 'form-control',
              placeholder: 'Enter password...',
              value: adminPasswordInput,
              onChange: (e) => setAdminPasswordInput(e.target.value),
              autoFocus: true,
              style: { padding: '12px 14px', fontSize: '1rem', borderRadius: 8 }
            })
          ),
          h('button', {
            type: 'submit',
            className: 'btn btn-primary btn-block',
            style: { padding: 14, fontSize: '0.95rem', fontWeight: 700, borderRadius: 8 }
          }, 'Unlock Evaluator Dashboard ➔'),
          h('div', { style: { marginTop: 18 } },
            h('button', {
              type: 'button',
              onClick: () => setRoute('store'),
              style: { background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }
            }, '← Cancel and return to store')
          )
        )
      )
    );
  }

  function renderAdminDashboard() {
    if (!isAdminAuthenticated) {
      return renderAdminLoginView();
    }

    // Filter candidates by search term
    const filteredCandidates = adminCandidates.filter(c => {
      if (!adminSearchTerm) return true;
      const q = adminSearchTerm.toLowerCase();
      return (c.fullName || '').toLowerCase().includes(q) ||
             (c.email || '').toLowerCase().includes(q) ||
             (c.token || '').toLowerCase().includes(q);
    });

    // Sort candidates: default is most reported bugs at top (reports desc)
    const sortedCandidates = [...filteredCandidates].sort((a, b) => {
      let comparison = 0;
      if (adminSortKey === 'reports') {
        comparison = (b.reportCount || 0) - (a.reportCount || 0);
      } else if (adminSortKey === 'score') {
        comparison = (b.overallScore || 0) - (a.overallScore || 0);
      } else if (adminSortKey === 'date') {
        comparison = new Date(b.startedAt || 0) - new Date(a.startedAt || 0);
      } else if (adminSortKey === 'name') {
        comparison = (a.fullName || '').localeCompare(b.fullName || '');
      }

      if (adminSortOrder === 'asc') {
        comparison = -comparison;
      }

      // Tiebreaker: secondary sort by session time
      if (comparison === 0) {
        return new Date(b.startedAt || 0) - new Date(a.startedAt || 0);
      }
      return comparison;
    });

    const toggleSort = (key) => {
      if (adminSortKey === key) {
        setAdminSortOrder(adminSortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setAdminSortKey(key);
        setAdminSortOrder('desc'); // default to descending
      }
    };

    return h('div', { className: 'container' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
        h('h1', { style: { fontSize: '1.8rem', fontWeight: 800 } }, 'Evaluator Dashboard (MERN)'),
        h('div', { style: { display: 'flex', gap: 10 } },
          h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setRoute('store') }, 'Back to Store'),
          h('button', { className: 'btn btn-sm btn-danger', onClick: handleAdminLogout }, '🔒 Log Out')
        )
      ),

      // Sorting & Search Toolbar
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' } }, 'Applicant Leaderboard'),
          h('span', { style: { background: '#e0e7ff', color: '#4338ca', fontSize: '0.8rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 } },
            `${sortedCandidates.length} Candidates`
          )
        ),

        h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
          // Quick Search Filter
          h('input', {
            type: 'text',
            placeholder: 'Search applicant name/email...',
            value: adminSearchTerm,
            onChange: e => setAdminSearchTerm(e.target.value),
            style: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', width: 220 }
          }),

          // Sorting Selector Dropdown
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            h('span', { style: { fontSize: '0.83rem', color: '#64748b', fontWeight: 600 } }, 'Sort:'),
            h('select', {
              value: `${adminSortKey}_${adminSortOrder}`,
              onChange: (e) => {
                const [k, o] = e.target.value.split('_');
                setAdminSortKey(k);
                setAdminSortOrder(o);
              },
              style: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', background: 'white', fontWeight: 600, color: '#1e293b' }
            },
              h('option', { value: 'reports_desc' }, '🔥 Most Bugs Reported (Top First)'),
              h('option', { value: 'reports_asc' }, '📉 Fewest Bugs Reported (Bottom First)'),
              h('option', { value: 'score_desc' }, '⭐ Highest Score First'),
              h('option', { value: 'date_desc' }, '🕒 Most Recent Assessment'),
              h('option', { value: 'name_asc' }, '🔤 Applicant Name (A-Z)')
            )
          )
        )
      ),

      // Leaderboard Table
      h('div', { style: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' } },
        sortedCandidates.length === 0 ? (
          h('div', { style: { textAlign: 'center', padding: '40px 20px', color: '#64748b' } },
            h('p', { style: { fontWeight: 600 } }, 'No candidate assessments found matching your filter.')
          )
        ) : (
          h('table', { className: 'cart-table' },
            h('thead', null,
              h('tr', null,
                h('th', { style: { width: 65, textAlign: 'center' } }, 'Rank'),
                h('th', { style: { cursor: 'pointer' }, onClick: () => toggleSort('name') },
                  'Applicant ', adminSortKey === 'name' ? (adminSortOrder === 'desc' ? '▼' : '▲') : ''
                ),
                h('th', null, 'Email'),
                h('th', { style: { cursor: 'pointer', color: '#4338ca', fontWeight: 800 }, onClick: () => toggleSort('reports') },
                  'Bugs Reported ', adminSortKey === 'reports' ? (adminSortOrder === 'desc' ? '▼ (Most First)' : '▲') : '↕'
                ),
                h('th', null, 'Status'),
                h('th', { style: { cursor: 'pointer' }, onClick: () => toggleSort('score') },
                  'Score ', adminSortKey === 'score' ? (adminSortOrder === 'desc' ? '▼' : '▲') : ''
                ),
                h('th', null, 'Decision'),
                h('th', null, 'Action')
              )
            ),
            h('tbody', null,
              sortedCandidates.map((c, idx) => {
                const isTopCandidate = idx === 0 && (c.reportCount || 0) > 0 && adminSortKey === 'reports' && adminSortOrder === 'desc';
                return h('tr', {
                  key: c._id,
                  style: isTopCandidate ? { background: '#fdfcfe' } : {}
                },
                  // Rank Column
                  h('td', { style: { textAlign: 'center' } },
                    idx === 0 && (c.reportCount || 0) > 0 ? (
                      h('span', { style: { background: '#fef9c3', color: '#854d0e', fontWeight: 800, padding: '3px 8px', borderRadius: 12, fontSize: '0.8rem', border: '1px solid #fde047' } }, '🥇 #1')
                    ) : idx === 1 && (c.reportCount || 0) > 0 ? (
                      h('span', { style: { background: '#f1f5f9', color: '#475569', fontWeight: 800, padding: '3px 8px', borderRadius: 12, fontSize: '0.8rem', border: '1px solid #cbd5e1' } }, '🥈 #2')
                    ) : idx === 2 && (c.reportCount || 0) > 0 ? (
                      h('span', { style: { background: '#ffedd5', color: '#9a3412', fontWeight: 800, padding: '3px 8px', borderRadius: 12, fontSize: '0.8rem', border: '1px solid #fdba74' } }, '🥉 #3')
                    ) : (
                      h('span', { style: { color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem' } }, `#${idx + 1}`)
                    )
                  ),

                  // Applicant Name
                  h('td', null,
                    h('strong', { style: { fontSize: '0.95rem', color: '#0f172a' } }, c.fullName),
                    h('div', { style: { fontSize: '0.75rem', color: '#94a3b8' } }, c.token)
                  ),

                  // Email
                  h('td', { style: { fontSize: '0.88rem', color: '#475569' } }, c.email),

                  // Bugs Reported
                  h('td', null,
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { background: (c.reportCount || 0) > 0 ? '#e0e7ff' : '#f1f5f9', color: (c.reportCount || 0) > 0 ? '#4338ca' : '#64748b', fontWeight: 800, padding: '4px 10px', borderRadius: 6, fontSize: '0.88rem' } },
                        `${c.reportCount || 0} Bugs`
                      ),
                      isTopCandidate && h('span', { style: { fontSize: '0.72rem', fontWeight: 700, color: '#ca8a04', background: '#fef9c3', padding: '2px 6px', borderRadius: 4, border: '1px solid #fde047' } }, '★ Most Reported')
                    )
                  ),

                  // Status
                  h('td', null,
                    h('span', { style: { background: c.status === 'submitted' || c.status === 'reviewed' ? '#dcfce7' : '#fef9c3', color: c.status === 'submitted' || c.status === 'reviewed' ? '#166534' : '#854d0e', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 } },
                      c.status === 'submitted' ? 'Submitted' : (c.status === 'reviewed' ? 'Graded' : 'In Progress')
                    )
                  ),

                  // Score
                  h('td', { style: { fontWeight: 700, fontSize: '0.95rem', color: (c.overallScore || 0) >= 70 ? '#16a34a' : '#1e293b' } },
                    `${c.overallScore || 0}%`
                  ),

                  // Reviewer Decision
                  h('td', null,
                    h('span', { style: { padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, background: c.reviewerDecision === 'Pass' || c.reviewerDecision === 'Strong Pass' ? '#dcfce7' : '#f1f5f9', color: c.reviewerDecision === 'Pass' || c.reviewerDecision === 'Strong Pass' ? '#166534' : '#475569' } },
                      c.reviewerDecision || 'Pending'
                    )
                  ),

                  // Action
                  h('td', null,
                    h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                      h('button', { className: 'btn btn-primary btn-sm', onClick: () => loadCandidateDetail(c._id) }, 'Review & Grade ➔'),
                      h('button', {
                        className: 'btn btn-danger btn-sm',
                        onClick: () => handleDeleteCandidate(c._id, c.fullName),
                        style: { background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }
                      }, '🗑️ Delete')
                    )
                  )
                );
              })
            )
          )
        )
      )
    );
  }

  function renderAdminCandidateDetail() {
    if (!isAdminAuthenticated) {
      return renderAdminLoginView();
    }
    const d = selectedCandidateDetail;
    if (!d) return null;

    return h('div', { className: 'container' },
      h('div', { style: { marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setRoute('admin') }, '← Back to All Candidates'),
        h('button', {
          className: 'btn btn-danger btn-sm',
          onClick: () => handleDeleteCandidate(d.candidate._id || d.candidate.id, d.candidate.fullName),
          style: { background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }
        }, '🗑️ Delete Candidate')
      ),

      h('div', { style: { background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 } },
        h('div', null,
          h('h1', { style: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' } }, `Candidate Assessment: ${d.candidate.fullName}`),
          h('p', { style: { color: '#64748b', fontSize: '0.9rem', marginTop: 4 } },
            `${d.candidate.email} • Token: `,
            h('code', { style: { background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#334155' } }, d.candidate.token)
          )
        ),
        h('div', { style: { display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { textAlign: 'right' } },
            h('div', { style: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 } }, 'Total Issues Logged'),
            h('div', { style: { fontSize: '1.6rem', fontWeight: 800, color: '#4338ca' } }, `${(d.reports || []).length} Reports`)
          ),
          h('div', { style: { textAlign: 'right' } },
            h('div', { style: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 } }, 'Session Status'),
            h('div', { style: { marginTop: 4 } },
              h('span', { style: { background: d.candidate.status === 'submitted' || d.candidate.status === 'reviewed' ? '#dcfce7' : '#fef9c3', color: d.candidate.status === 'submitted' || d.candidate.status === 'reviewed' ? '#166534' : '#854d0e', padding: '4px 10px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700 } },
                d.candidate.status === 'submitted' ? 'Submitted' : (d.candidate.status === 'reviewed' ? 'Graded' : 'In Progress')
              )
            )
          )
        )
      ),

      // Candidate Submitted Bug Reports Section
      h('div', { style: { background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 } },
        h('div', { style: { marginBottom: 20 } },
          h('h2', { style: { fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' } },
            `Candidate Submitted Bug Reports (${(d.reports || []).length})`
          ),
          h('p', { style: { color: '#64748b', fontSize: '0.88rem', marginTop: 4 } },
            'Review the candidate’s actual defect reports, reproduction steps, expected vs. actual outcomes, and testing methodology.'
          )
        ),

        (!d.reports || d.reports.length === 0) ? (
          h('div', { style: { textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' } },
            h('div', { style: { fontSize: '2.5rem', marginBottom: 12 } }, '📋'),
            h('h4', { style: { fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' } }, 'No Bug Reports Submitted'),
            h('p', { style: { color: '#64748b', fontSize: '0.88rem', marginTop: 4 } }, 'This applicant has not logged any defect reports during their session.')
          )
        ) : (
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
            d.reports.map((rep, idx) => {
              const sev = (rep.severity || 'Medium').toLowerCase();
              let sevBg = '#fef3c7', sevColor = '#92400e', sevBorder = '#fde68a';
              if (sev === 'blocker') {
                sevBg = '#fee2e2'; sevColor = '#991b1b'; sevBorder = '#fca5a5';
              } else if (sev === 'major') {
                sevBg = '#ffedd5'; sevColor = '#9a3412'; sevBorder = '#fdba74';
              } else if (sev === 'minor') {
                sevBg = '#f1f5f9'; sevColor = '#475569'; sevBorder = '#cbd5e1';
              }

              return h('div', {
                key: rep._id || idx,
                style: {
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 20
                }
              },
                // Report Header
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                    h('span', { style: { background: '#4338ca', color: 'white', fontWeight: 800, fontSize: '0.8rem', padding: '3px 8px', borderRadius: 4 } },
                      `Issue #${rep.reportNumber || (idx + 1)}`
                    ),
                    h('h3', { style: { fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 } },
                      rep.title
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                    h('span', { style: { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4 } },
                      rep.category
                    ),
                    h('span', { style: { background: sevBg, color: sevColor, border: `1px solid ${sevBorder}`, fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4 } },
                      rep.severity
                    ),
                    rep.matchedBugId ? (
                      h('span', { style: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4 } },
                        `Matched ${rep.matchedBugId} (${rep.matchConfidence || 0}%)`
                      )
                    ) : (
                      h('span', { style: { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px', borderRadius: 4 } },
                        'Exploratory / Unmatched'
                      )
                    )
                  )
                ),

                // Steps to Reproduce
                h('div', { style: { marginBottom: 14 } },
                  h('div', { style: { fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 } }, 'Steps to Reproduce:'),
                  h('pre', {
                    style: {
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 14px',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      color: '#1e293b',
                      lineHeight: 1.5
                    }
                  }, rep.stepsToReproduce || 'None provided')
                ),

                // Expected vs Actual Result (Two Columns)
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 12 } },
                  h('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' } },
                    h('div', { style: { color: '#166534', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '✓ Expected Behavior:'),
                    h('div', { style: { fontSize: '0.88rem', color: '#14532d', lineHeight: 1.45 } }, rep.expectedResult || 'None specified')
                  ),
                  h('div', { style: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px' } },
                    h('div', { style: { color: '#991b1b', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '✗ Observed Defect / Actual Result:'),
                    h('div', { style: { fontSize: '0.88rem', color: '#7f1d1d', lineHeight: 1.45 } }, rep.actualResult || 'None specified')
                  )
                ),

                // Environment & Capture Metadata
                rep.environmentInfo && h('div', { style: { fontSize: '0.8rem', color: '#64748b', marginTop: 10, borderTop: '1px dashed #e2e8f0', paddingTop: 8 } },
                  h('span', { style: { fontWeight: 700 } }, 'Captured Environment: '),
                  rep.environmentInfo
                )
              );
            })
          )
        )
      ),

      // Collapsible Seeded Defect Master Catalog Reference
      h('details', { style: { background: 'white', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 } },
        h('summary', { style: { cursor: 'pointer', fontWeight: 700, color: '#475569', fontSize: '0.95rem' } },
          `🔍 Seeded Defect Answer Key Reference (Click to Expand - ${(d.foundBugIds || []).length} / ${(d.seededBugs || []).length || 40} Matched)`
        ),
        h('p', { style: { fontSize: '0.85rem', color: '#64748b', margin: '10px 0 14px 0' } },
          `Master list of all ${(d.seededBugs || []).length || 40} seeded test defects for evaluator reference.`
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 } },
          (d.seededBugs || []).map(b => {
            const found = (d.foundBugIds || []).includes(b.id);
            return h('div', {
              key: b.id,
              style: {
                padding: 10,
                borderRadius: 8,
                border: '1px solid',
                background: found ? '#f0fdf4' : '#f8fafc',
                borderColor: found ? '#86efac' : '#e2e8f0',
                color: found ? '#166534' : '#94a3b8'
              }
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.8rem' } },
                h('span', null, b.id),
                h('span', null, found ? '✓ FOUND' : '✗ MISSED')
              ),
              h('div', { style: { fontWeight: 600, fontSize: '0.8rem', marginTop: 2 } }, b.title),
              h('div', { style: { fontSize: '0.72rem', marginTop: 2 } }, `${b.category} • ${b.severity}`)
            );
          })
        )
      ),

      // Grading Form
      h('div', { style: { background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' } },
        h('h3', { style: { fontWeight: 700, marginBottom: 16 } }, 'Evaluator Scorecard & Hiring Recommendation'),
        h('form', {
          onSubmit: (e) => {
            e.preventDefault();
            const token = sessionStorage.getItem('qa_admin_token') || '';
            fetch(`/api/admin/candidates/${d.candidate._id}/grade`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': token
              },
              body: JSON.stringify(adminGrading)
            })
            .then(res => {
              if (res.status === 401) {
                setIsAdminAuthenticated(false);
                sessionStorage.removeItem('evaluator_auth');
                sessionStorage.removeItem('qa_admin_token');
                setRoute('admin');
                setAdminAuthError('Session expired. Please log in.');
                return null;
              }
              return res.json();
            })
            .then(data => {
              if (data && data.success) {
                showToast('Evaluation saved successfully!', 'success');
                setRoute('admin');
                loadAdminCandidates();
              }
            });
          }
        },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 } },
            h('div', null,
              h('label', { className: 'form-label' }, 'Overall Score (0–100)'),
              h('input', {
                type: 'number',
                className: 'form-control',
                value: adminGrading.score,
                onChange: e => setAdminGrading({ ...adminGrading, score: e.target.value }),
                required: true
              })
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'Hiring Decision'),
              h('select', {
                className: 'form-control',
                value: adminGrading.decision,
                onChange: e => setAdminGrading({ ...adminGrading, decision: e.target.value })
              },
                ['Strong Pass', 'Pass', 'Consider', 'Reject', 'Pending'].map(dec =>
                  h('option', { key: dec, value: dec }, dec)
                )
              )
            )
          ),
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Reviewer Notes for Hiring Committee'),
            h('textarea', {
              className: 'form-control',
              rows: 3,
              value: adminGrading.notes,
              onChange: e => setAdminGrading({ ...adminGrading, notes: e.target.value }),
              placeholder: 'Detail comments on repro steps clarity and edge case curiosity...'
            })
          ),
          h('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Evaluation Scorecard')
        )
      )
    );
  }
}

// Mount React Root
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(h(App));

