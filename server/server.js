/**
 * Express / Node.js MERN Backend Server
 * Connects MongoDB document engine, exposes REST APIs, and serves the React Single Page App.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const Candidate = require('./models/Candidate');
const BugReport = require('./models/BugReport');
const { Product, Order } = require('./models/Product');
const { collections } = require('./db/mongo');
const { PRODUCTS, REVIEWS, SEEDED_BUGS } = require('./db/seedData');
const { matchCandidateReport } = require('./utils/bugMatcher');

const PORT = process.env.PORT || 8000;
const CLIENT_DIR = path.join(__dirname, '..', 'client', 'public');

// Initialize database with default products if empty
async function initDatabase() {
  const count = await collections.products.countDocuments();
  if (count === 0) {
    for (const p of PRODUCTS) {
      await collections.products.create(p);
    }
  }

  // Ensure demo candidate exists
  const demoCand = await Candidate.findOne({ token: 'demo-qa-alex' });
  if (!demoCand) {
    const cand = await Candidate.create({
      fullName: 'Alex Chen',
      email: 'alex.chen.qa@example.com',
      token: 'demo-qa-alex'
    });

    const sampleReports = [
      {
        title: 'Cart allows negative item quantity, reducing the total payable amount',
        category: 'Business Logic',
        severity: 'Blocker',
        steps: '1. Add item to cart\n2. In quantity box type -2\n3. Notice subtotal is reduced',
        expected: 'Cart should only accept positive integers.',
        actual: 'Line total becomes negative and reduces the order total.'
      },
      {
        title: 'Coupon code SAVE20 can be stacked multiple times indefinitely',
        category: 'Business Logic',
        severity: 'Blocker',
        steps: '1. Enter SAVE20 and click Apply\n2. Click Apply again\n3. Discount compounds',
        expected: 'Coupon should apply once per transaction.',
        actual: 'Each click deducts an additional 20% discount.'
      },
      {
        title: 'Banner claims free shipping over $50 but cart charges $10 shipping',
        category: 'Business Logic',
        severity: 'Major',
        steps: '1. Add $79 earbuds to cart\n2. Check shipping\n3. Charged $10',
        expected: 'Shipping should be $0.00 for orders over $50.',
        actual: 'System charges $10 shipping.'
      },
      {
        title: 'Mechanical keyboard has a broken image link',
        category: 'UI & Visual',
        severity: 'Minor',
        steps: '1. Look at product #6 on catalog\n2. Image fails to load',
        expected: 'Product image should load properly.',
        actual: 'Broken image 404 response.'
      }
    ];

    for (const r of sampleReports) {
      const match = matchCandidateReport(r.title, r.steps, r.actual);
      await BugReport.create({
        candidateId: cand._id,
        title: r.title,
        category: r.category,
        severity: r.severity,
        stepsToReproduce: r.steps,
        expectedResult: r.expected,
        actualResult: r.actual,
        environmentInfo: 'Viewport: 1440x900 | Chrome 124',
        matchedBugId: match.matchedBug ? match.matchedBug.id : null,
        matchConfidence: match.confidence
      });
    }

    await Candidate.finalizeSubmission(cand._id);
  }
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.jsx': 'text/babel',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };
  return map[ext] || 'application/octet-stream';
}

function serveStatic(req, res, filePath) {
  // BUG-014: Broken image intentionally returns 404
  if (filePath.includes('keyboard_broken.png')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found: Image asset missing');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Single Page App fallback: serve index.html for non-API client routes
    const indexPath = path.join(CLIENT_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- REST API ENDPOINTS ---

  // 1. Candidate Session Start: POST /api/candidate/start
  if (pathname === '/api/candidate/start' && method === 'POST') {
    const body = await parseJsonBody(req);
    const fullName = (body.fullName || '').trim() || 'Candidate';
    const email = (body.email || '').trim() || 'candidate@example.com';
    const token = 'cand-' + crypto.randomBytes(4).toString('hex');

    const candidate = await Candidate.create({ fullName, email, token });
    return sendJson(res, 201, { success: true, token, candidate });
  }

  // 2. Candidate Session Lookup: GET /api/candidate/session
  if (pathname === '/api/candidate/session' && method === 'GET') {
    const token = parsedUrl.query.token;
    if (!token) return sendJson(res, 400, { error: 'Token is required' });
    const candidate = await Candidate.findOne({ token });
    if (!candidate) return sendJson(res, 404, { error: 'Candidate session not found' });
    return sendJson(res, 200, { candidate });
  }

  // 3. Candidate Submit Bug Report: POST /api/candidate/report
  if (pathname === '/api/candidate/report' && method === 'POST') {
    const body = await parseJsonBody(req);
    const token = body.token;
    const candidate = await Candidate.findOne({ token });
    if (!candidate) return sendJson(res, 401, { error: 'Unauthorized or invalid session token' });

    // Server-side ground-truth matching
    const match = matchCandidateReport(body.title, body.stepsToReproduce, body.actualResult);
    const matchedBugId = match.matchedBug ? match.matchedBug.id : null;

    const report = await BugReport.create({
      candidateId: candidate._id,
      title: body.title,
      category: body.category,
      severity: body.severity,
      stepsToReproduce: body.stepsToReproduce,
      expectedResult: body.expectedResult,
      actualResult: body.actualResult,
      environmentInfo: body.environmentInfo || '',
      matchedBugId: matchedBugId,
      matchConfidence: match.confidence
    });

    // STRICT BLACK-BOX EVALUATION: Never return matchedBugId or score to candidate
    return sendJson(res, 201, {
      success: true,
      message: 'Bug report recorded in candidate assessment ledger.'
    });
  }

  // 4. Candidate My Reports: GET /api/candidate/my-reports
  if (pathname === '/api/candidate/my-reports' && method === 'GET') {
    const token = parsedUrl.query.token;
    const candidate = await Candidate.findOne({ token });
    if (!candidate) return sendJson(res, 401, { error: 'Invalid token' });

    // Returns reports with ground truth redacted
    const reports = await BugReport.findByCandidateId(candidate._id, true);
    return sendJson(res, 200, { reports });
  }

  // 5. Candidate Finalize Assessment: POST /api/candidate/finalize
  if (pathname === '/api/candidate/finalize' && method === 'POST') {
    const body = await parseJsonBody(req);
    const candidate = await Candidate.findOne({ token: body.token });
    if (!candidate) return sendJson(res, 401, { error: 'Invalid token' });

    await Candidate.finalizeSubmission(candidate._id);
    return sendJson(res, 200, { success: true });
  }

  // 6. Products Catalog: GET /api/products
  if (pathname === '/api/products' && method === 'GET') {
    const search = (parsedUrl.query.search || '').trim();

    // BUG-009: Special characters crash search with 500 error
    if (search.includes('%') || search.includes('?') || search.includes("'")) {
      return sendJson(res, 500, {
        error: 'Unhandled SQLError: Syntax error near unexpected character token: ' + search
      });
    }

    const products = await Product.find({});
    return sendJson(res, 200, { products });
  }

  // 7. Single Product & Reviews: GET /api/products/:id
  if (pathname.startsWith('/api/products/') && method === 'GET') {
    const id = pathname.split('/')[3];
    const product = await Product.findById(id);
    if (!product) return sendJson(res, 404, { error: 'Product not found' });
    const reviews = REVIEWS[product.id] || [];
    return sendJson(res, 200, { product, reviews });
  }

  // 8. Place Order API: POST /api/orders
  if (pathname === '/api/orders' && method === 'POST') {
    const body = await parseJsonBody(req);
    // BUG-003: No debounce/lock on place order
    const order = await Order.create({
      orderId: body.orderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000)),
      candidateToken: body.candidateToken || null,
      items: body.items || [],
      subtotal: body.subtotal,
      shipping: body.shipping,
      discount: body.discount,
      total: body.total
    });
    return sendJson(res, 201, { success: true, orderId: order.orderId });
  }

  // 9. Admin Candidates List: GET /api/admin/candidates
  if (pathname === '/api/admin/candidates' && method === 'GET') {
    const candidates = await Candidate.find({});
    const reports = await collections.bugReports.find({});

    const formatted = candidates.map(c => {
      const cReports = reports.filter(r => r.candidateId === c._id);
      return {
        ...c,
        reportCount: cReports.length
      };
    });

    formatted.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return sendJson(res, 200, { candidates: formatted });
  }

  // 10. Admin Candidate Detail: GET /api/admin/candidates/:id
  if (pathname.startsWith('/api/admin/candidates/') && !pathname.endsWith('/grade') && method === 'GET') {
    const id = pathname.split('/')[4];
    const candidate = await Candidate.findById(id);
    if (!candidate) return sendJson(res, 404, { error: 'Candidate not found' });

    const reports = await BugReport.findByCandidateId(candidate._id, false);
    const foundBugIds = [...new Set(reports.map(r => r.matchedBugId).filter(Boolean))];

    const totalPoints = SEEDED_BUGS.reduce((sum, b) => sum + b.points, 0);
    const earnedPoints = SEEDED_BUGS.filter(b => foundBugIds.includes(b.id)).reduce((sum, b) => sum + b.points, 0);
    const suggestedScore = Math.round((earnedPoints / totalPoints) * 100);

    return sendJson(res, 200, {
      candidate,
      reports,
      foundBugIds,
      matchedCount: foundBugIds.length,
      suggestedScore,
      seededBugs: SEEDED_BUGS
    });
  }

  // 11. Admin Submit Grade: POST /api/admin/candidates/:id/grade
  if (pathname.startsWith('/api/admin/candidates/') && pathname.endsWith('/grade') && method === 'POST') {
    const id = pathname.split('/')[4];
    const body = await parseJsonBody(req);
    await Candidate.updateReview(id, {
      score: body.score,
      decision: body.decision,
      notes: body.notes
    });
    return sendJson(res, 200, { success: true });
  }

  // 12. Admin Bug Catalog: GET /api/admin/bug-catalog
  if (pathname === '/api/admin/bug-catalog' && method === 'GET') {
    return sendJson(res, 200, { seededBugs: SEEDED_BUGS });
  }

  // --- STATIC CLIENT SERVING ---
  const filePath = path.join(CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);
  serveStatic(req, res, filePath);
});

initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================`);
    console.log(` 🚀 MERN QA Assessment Platform Server Running`);
    console.log(` MongoDB Engine: collections in /data`);
    console.log(` Express REST API & React SPA on: http://localhost:${PORT}`);
    console.log(`========================================================`);
  });
});
