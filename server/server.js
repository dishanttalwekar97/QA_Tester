/**
 * Express / Node.js MERN Backend Server
 * Connects MongoDB document engine, exposes REST APIs, and serves the React Single Page App.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const os = require('os');

const Candidate = require('./models/Candidate');
const BugReport = require('./models/BugReport');
const { Product, Order } = require('./models/Product');
const { collections } = require('./db/mongo');
const { PRODUCTS, REVIEWS, SEEDED_BUGS } = require('./db/seedData');
const { matchCandidateReport } = require('./utils/bugMatcher');

const PORT = process.env.PORT || 8000;
const CLIENT_DIR = path.join(__dirname, '..', 'client', 'public');
const ADMIN_PIN = process.env.ADMIN_PIN || 'Sanket625';
const activeAdminTokens = new Set();

function verifyAdminAuth(req, parsedUrl) {
  const token = req.headers['x-admin-token'] || parsedUrl.query.adminToken;
  return Boolean(token && activeAdminTokens.has(token));
}

// Initialize database with default products if empty
async function initDatabase() {
  const count = await collections.products.countDocuments();
  if (count === 0) {
    for (const p of PRODUCTS) {
      await collections.products.create(p);
    }
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
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'
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

const staticCache = new Map();

function serveStatic(req, res, filePath) {
  // BUG-014: Broken image intentionally returns 404
  if (filePath.includes('keyboard_broken.png')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found: Image asset missing');
  }

  let targetPath = filePath;
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    // Single Page App fallback: serve index.html for non-API client routes
    targetPath = path.join(CLIENT_DIR, 'index.html');
  }

  if (fs.existsSync(targetPath)) {
    const mime = getMimeType(targetPath);
    let cached = staticCache.get(targetPath);
    if (!cached) {
      cached = fs.readFileSync(targetPath);
      staticCache.set(targetPath, cached);
    }
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': cached.length,
      'Cache-Control': 'public, max-age=600'
    });
    return res.end(cached);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'
    });
    return res.end();
  }

  // --- REST API ENDPOINTS ---

  // 1. Candidate Session Start & Strict Unique Email/Gmail Check: POST /api/candidate/start
  if (pathname === '/api/candidate/start' && method === 'POST') {
    const body = await parseJsonBody(req);
    const fullName = (body.fullName || '').trim() || 'Candidate';
    const email = (body.email || '').trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return sendJson(res, 400, {
        success: false,
        error: 'Please provide a valid email/Gmail address (e.g. yourname@gmail.com).'
      });
    }

    // Strict Unique Email Constraint: Check if email/gmail is already registered
    const existing = await Candidate.findByEmail(email);

    if (existing) {
      if (existing.status === 'submitted' || existing.status === 'reviewed') {
        return sendJson(res, 409, {
          success: false,
          alreadySubmitted: true,
          error: `The email address '${existing.email}' has already completed and submitted this assessment. Each candidate must use a unique email.`,
          token: existing.token,
          candidate: existing
        });
      }

      // If in progress, block duplicate registration and inform the candidate
      return sendJson(res, 409, {
        success: false,
        alreadyRegistered: true,
        error: `The email address '${existing.email}' is already registered with an active assessment session. Each candidate must use a unique email.`,
        token: existing.token,
        candidate: existing
      });
    }

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

    // Lockdown: Prevent logging bugs after assessment has been submitted
    if (candidate.status === 'submitted' || candidate.status === 'reviewed') {
      return sendJson(res, 403, {
        error: 'Assessment has already been submitted and concluded. Further bug reports are locked.'
      });
    }

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

    if (candidate.status === 'submitted' || candidate.status === 'reviewed') {
      return sendJson(res, 200, {
        success: true,
        alreadySubmitted: true,
        message: 'Assessment already finalized.',
        candidate
      });
    }

    const updated = await Candidate.finalizeSubmission(candidate._id);
    return sendJson(res, 200, { success: true, candidate: updated });
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

  // 9. Admin Login Authentication: POST /api/admin/login
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseJsonBody(req);
    const pin = (body.pin || body.password || '').trim();

    if (pin === ADMIN_PIN) {
      const adminToken = 'adm-' + crypto.randomBytes(16).toString('hex');
      activeAdminTokens.add(adminToken);
      return sendJson(res, 200, {
        success: true,
        adminToken,
        message: 'Admin access authorized.'
      });
    }

    return sendJson(res, 401, {
      success: false,
      error: 'Invalid Admin Security PIN. Access denied.'
    });
  }

  // 10. Admin Logout: POST /api/admin/logout
  if (pathname === '/api/admin/logout' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body.adminToken) activeAdminTokens.delete(body.adminToken);
    return sendJson(res, 200, { success: true });
  }

  // 11. Admin Candidates List: GET /api/admin/candidates
  if (pathname === '/api/admin/candidates' && method === 'GET') {
    if (!verifyAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication required.' });
    }

    const candidates = await Candidate.find({});
    const reports = await collections.bugReports.find({});

    const formatted = candidates.map(c => {
      const cReports = reports.filter(r => r.candidateId === c._id);
      return {
        ...c,
        reportCount: cReports.length
      };
    });

    // Primary sort: candidate with most reported bugs at top, then by recent session
    formatted.sort((a, b) => {
      const diff = (b.reportCount || 0) - (a.reportCount || 0);
      if (diff !== 0) return diff;
      return new Date(b.startedAt || 0) - new Date(a.startedAt || 0);
    });
    return sendJson(res, 200, { candidates: formatted });
  }

  // 12. Admin Candidate Detail: GET /api/admin/candidates/:id
  if (pathname.startsWith('/api/admin/candidates/') && !pathname.endsWith('/grade') && method === 'GET') {
    if (!verifyAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication required.' });
    }

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

  // 13. Admin Submit Grade: POST /api/admin/candidates/:id/grade
  if (pathname.startsWith('/api/admin/candidates/') && pathname.endsWith('/grade') && method === 'POST') {
    if (!verifyAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication required.' });
    }

    const id = pathname.split('/')[4];
    const body = await parseJsonBody(req);
    await Candidate.updateReview(id, {
      score: body.score,
      decision: body.decision,
      notes: body.notes
    });
    return sendJson(res, 200, { success: true });
  }

  // 14. Admin Delete Candidate: DELETE /api/admin/candidates/:id
  if (pathname.startsWith('/api/admin/candidates/') && method === 'DELETE') {
    if (!verifyAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication required.' });
    }

    const id = pathname.split('/')[4];
    const candidate = await Candidate.findById(id);
    if (!candidate) return sendJson(res, 404, { error: 'Candidate not found' });

    await Candidate.findByIdAndDelete(id);
    await collections.bugReports.deleteMany({ candidateId: candidate._id });
    return sendJson(res, 200, { success: true, message: 'Candidate and associated bug reports deleted successfully.' });
  }

  // 15. Admin Bug Catalog: GET /api/admin/bug-catalog
  if (pathname === '/api/admin/bug-catalog' && method === 'GET') {
    if (!verifyAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized: Admin authentication required.' });
    }
    return sendJson(res, 200, { seededBugs: SEEDED_BUGS });
  }

  // 16. Unmatched API routes fallback
  if (pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
  }

  // --- STATIC CLIENT SERVING ---
  const filePath = path.join(CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);
  serveStatic(req, res, filePath);
});

module.exports = { server, initDatabase, activeAdminTokens, verifyAdminAuth };

function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

if (require.main === module) {
  initDatabase().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      const lanIp = getLocalIpAddress();
      console.log(`================================================================`);
      console.log(` 🚀 MERN QA Assessment Platform Server Running`);
      console.log(` 💾 MongoDB Storage:     /data (Persistent Documents)`);
      console.log(` 🖥️  Coordinator PC URL:  http://localhost:${PORT}`);
      console.log(` 🌐 College Lab LAN URL: http://${lanIp}:${PORT}  <-- Share with Students`);
      console.log(` 🔒 Admin Evaluator PIN: ${ADMIN_PIN}`);
      console.log(`================================================================`);
    });
  });
}

