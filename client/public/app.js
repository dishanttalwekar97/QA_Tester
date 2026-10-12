/**
 * ShopPulse MERN Single Page Application (React Frontend)
 * Implements candidate exploratory testing, docked blind bug reporter,
 * and hiring evaluator dashboard with all 20 seeded bugs.
 */

// Virtual Element helper for standalone React execution
const { useState, useEffect, useRef, createElement: h } = React;

function App() {
  // Navigation & Session State
  const [route, setRoute] = useState('brief'); // 'brief', 'store', 'cart', 'completed', 'admin', 'admin_detail'
  const [candidate, setCandidate] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // BUG-011: in-memory only, lost on F5
  const [couponRate, setCouponRate] = useState(0); // BUG-002: stacks infinitely
  const [myReports, setMyReports] = useState([]);
  
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
    setRoute('store');
    showToast('Evaluator portal locked.', 'info');
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
    .then(res => res.json())
    .then(data => {
      if (data.success) {
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
          setDrawerOpen(false);
          setRoute('completed');
        }
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
    // Candidate Session Watermark Bar
    candidate && route !== 'admin' && route !== 'admin_detail' && h('div', { className: 'candidate-bar' },
      h('div', null,
        h('span', { style: { opacity: 0.8 } }, 'QA Candidate Session: '),
        h('strong', null, candidate.fullName),
        h('span', { style: { opacity: 0.6, marginLeft: 8 } }, `(${candidate.token})`)
      ),
      h('div', { style: { display: 'flex', gap: 14, alignItems: 'center' } },
        h('button', {
          onClick: () => { setDrawerOpen(true); setDrawerTab('guide'); },
          style: { background: '#4f46e5', border: 'none', color: 'white', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }
        }, '🎯 4 Student Missions Checklist'),
        h('button', {
          onClick: () => setRoute('brief'),
          style: { background: 'none', border: 'none', color: '#93c5fd', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }
        }, 'View PRD Specifications'),
        h('span', { style: { color: '#facc15', fontWeight: 600 } }, 'Status: In Progress')
      )
    ),

    // Announcement Header (BUG-004 trigger: Free shipping over $50)
    h('div', { className: 'announcement-bar' },
      h('span', null, '🚚 FLASH OFFER: Free Shipping on all orders over $50.00! Use code SAVE20 for 20% off.')
    ),

    // Navbar
    h('header', { className: 'navbar' },
      h('div', { className: 'nav-container' },
        h('div', { className: 'brand', onClick: () => setRoute('store') },
          h('div', { className: 'brand-icon' }, 'SP'),
          h('span', null, 'ShopPulse')
        ),
        h('div', { className: 'nav-links' },
          h('button', {
            onClick: () => {
              if (candidate && (candidate.status === 'submitted' || candidate.status === 'reviewed')) {
                showToast('Assessment already submitted. You cannot re-enter the testing store.', 'error');
                setRoute('completed');
              } else {
                setRoute('store');
              }
            },
            className: 'btn btn-secondary btn-sm',
            style: { background: 'none', border: 'none', color: '#475569', fontWeight: 600 }
          }, 'Catalog'),
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
            h('span', null, '🛒 Cart'),
            h('span', { className: 'cart-badge' }, totalCartCount)
          ),
          !candidate && h('button', {
            onClick: () => {
              setRoute('admin');
              if (isAdminAuthenticated) loadAdminCandidates();
            },
            style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer' }
          }, '🔒 Evaluator Portal')
        )
      )
    ),

    // Main Content Switcher
    route === 'brief' && renderBriefView(),
    route === 'store' && renderStoreView(),
    route === 'cart' && renderCartView(),
    route === 'completed' && renderCompletedView(),
    route === 'admin' && renderAdminDashboard(),
    route === 'admin_detail' && renderAdminCandidateDetail(),

    // Product Detail Modal
    activeProduct && renderProductModal(),

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
    candidate && route !== 'admin' && route !== 'admin_detail' && h('div', null,
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

          h('div', { style: { padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' } },
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
            h('button', {
              className: 'btn btn-primary',
              style: candidate.status === 'submitted' || candidate.status === 'reviewed' ? { background: '#dc2626' } : {},
              onClick: () => {
                if (candidate.status === 'submitted' || candidate.status === 'reviewed') {
                  setRoute('completed');
                } else {
                  setRoute('store');
                }
              }
            }, candidate.status === 'submitted' || candidate.status === 'reviewed' ? 'View Submitted Debrief ➔' : 'Resume Assessment Store ➔')
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
          h('h4', { style: { fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginBottom: 12 } }, '🎯 Your 4 Guided Student Testing Missions:'),
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
                desc: 'Test checkout inputs. What happens if you leave address blank? What if you enter an invalid email? Does card expiry accept future dates?'
              },
              {
                icon: '⭐',
                title: 'Mission 4: Product Popups & Reviews',
                desc: 'Click products to view full specs. Check if price shows the $ symbol. Try opening Terms of Service and closing it with Esc key.'
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
          h('button', { className: 'btn btn-primary', onClick: () => setRoute('store') }, 'Go to Store Playground ➔')
        )
      )
    );
  }

  function renderStoreView() {
    return h('div', { className: 'container' },
      // Hero Banner
      h('div', { style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'white', padding: '36px 32px', borderRadius: 16, marginBottom: 32 } },
        h('span', { style: { background: 'rgba(255,255,255,0.15)', fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 10 } }, 'SPRING COLLECTION 2026'),
        h('h1', { style: { fontSize: '2.2rem', fontWeight: 800 } }, 'Next-Gen Gear For Creators & Professionals'),
        h('p', { style: { opacity: 0.85, marginTop: 8 } }, 'Explore noise-canceling audio, ergonomic workstations, and high-precision productivity accessories.')
      ),

      // Search Bar
      h('form', { onSubmit: handleSearchSubmit, style: { display: 'flex', gap: 12, marginBottom: 28 } },
        h('input', {
          type: 'text',
          className: 'filter-input',
          placeholder: 'Search products by title (e.g. Earbuds, Mouse, Keyboard)...',
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          style: { padding: '12px 16px', fontSize: '1rem', borderRadius: 10 }
        }),
        h('button', { type: 'submit', className: 'btn btn-primary', style: { padding: '12px 24px' } }, 'Search')
      ),

      // Main Grid Layout
      h('div', { className: 'catalog-layout' },
        // Sidebar Filters
        h('aside', null,
          h('div', { className: 'filter-card' },
            h('h3', { className: 'filter-title' }, 'Filter Products'),
            h('div', { className: 'filter-group' },
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
                  h('span', { className: 'badge-tag' }, p.category),
                  // BUG-006: Product #4 displays In Stock badge despite 0 stock
                  p.displayStockOverride ? (
                    h('span', { className: 'stock-tag-ok' }, p.displayStockOverride)
                  ) : p.stock > 0 ? (
                    h('span', { className: 'stock-tag-ok' }, `In Stock (${p.stock} left)`)
                  ) : (
                    h('span', { style: { position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600 } }, 'Out of Stock')
                  ),
                  // BUG-014: Product #6 has broken image
                  h('img', { src: p.image, alt: p.name, className: 'product-img' })
                ),

                h('div', { className: 'product-body' },
                  h('div', { className: 'product-name', onClick: () => setActiveProduct(p) }, p.name),
                  h('p', { className: 'product-desc' }, p.description),
                  h('div', { style: { fontSize: '0.8rem', color: '#f59e0b', marginBottom: 8 } },
                    `★ ${p.rating} `,
                    h('span', { style: { color: '#94a3b8' } }, `(${p.reviewsCount} reviews)`)
                  ),
                  h('div', { className: 'product-footer' },
                    h('span', { className: 'product-price' }, `$${p.price.toFixed(2)}`),
                    h('button', { className: 'btn btn-primary btn-sm', onClick: () => handleAddToCart(p) }, '+ Add to Cart')
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

  function renderCompletedView() {
    return h('div', { className: 'container', style: { maxWidth: 580, textAlign: 'center', background: 'white', padding: 48, borderRadius: 20, border: '1px solid #e2e8f0', marginTop: 40 } },
      h('div', { style: { width: 72, height: 72, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', margin: '0 auto 20px auto' } }, '✓'),
      h('h1', { style: { fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 } }, 'Assessment Completed'),
      h('p', { style: { color: '#64748b', marginBottom: 24 } }, `Thank you, ${candidate.fullName}. Your reports have been safely recorded in MongoDB for evaluation.`),
      h('div', { style: { background: '#f1f5f9', borderRadius: 12, padding: 20, marginBottom: 28, textAlign: 'left' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
          h('span', { style: { color: '#64748b' } }, 'Candidate:'),
          h('strong', null, candidate.fullName)
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
          h('span', { style: { color: '#64748b' } }, 'Issues Logged:'),
          h('strong', { style: { color: '#4338ca' } }, `${myReports.length} Issues`)
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
          h('span', { style: { color: '#64748b' } }, 'Session Status:'),
          h('span', { style: { background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 } }, 'Submitted')
        )
      ),
      h('div', { style: { display: 'flex', gap: 12, justifyContent: 'center' } },
        h('button', { className: 'btn btn-secondary btn-sm', onClick: () => setRoute('store') }, 'Return to Store')
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
        tips: 'Does the price inside the product popup include a $ dollar sign? Can you close the Terms popup using the Esc key?'
      }
    ];

    return h('div', { className: 'drawer-body' },
      h('div', { style: { marginBottom: 14 } },
        h('h3', { style: { fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b' } }, '🎯 4 Student Testing Missions'),
        h('p', { style: { fontSize: '0.84rem', color: '#64748b', marginTop: 2 } },
          'Follow these 4 missions to guide your testing. Whenever you notice something wrong, switch back to "Log Issue" to report it.'
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
          `🔍 Seeded Defect Answer Key Reference (Click to Expand - ${(d.foundBugIds || []).length} / 20 Matched)`
        ),
        h('p', { style: { fontSize: '0.85rem', color: '#64748b', margin: '10px 0 14px 0' } },
          'Master list of all 20 seeded test defects for evaluator reference.'
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

