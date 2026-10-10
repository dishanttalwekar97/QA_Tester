/**
 * Integration Security Test Suite:
 * Verifies admin route lockdown, PIN authentication, session tokens,
 * unique email enforcement, and candidate blind testing integrity.
 */

const http = require('http');
const { server, initDatabase } = require('./server/server');

function makeRequest(port, path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (_) {
            json = data;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log('🔒 Starting Admin Security & Confidentiality Verification Tests...\n');

  await initDatabase();

  // Listen on random available port
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Server listening on internal test port ${port}`);

  try {
    // 1. Unauthenticated Admin Candidates List must be rejected
    const unauthCandidates = await makeRequest(port, '/api/admin/candidates', 'GET');
    if (unauthCandidates.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated /api/admin/candidates, got ${unauthCandidates.statusCode}`);
    }
    console.log('✓ [SECURITY] GET /api/admin/candidates rejected with 401 Unauthorized without admin token');

    // 2. Unauthenticated Admin Bug Catalog must be rejected
    const unauthCatalog = await makeRequest(port, '/api/admin/bug-catalog', 'GET');
    if (unauthCatalog.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated /api/admin/bug-catalog, got ${unauthCatalog.statusCode}`);
    }
    console.log('✓ [SECURITY] GET /api/admin/bug-catalog rejected with 401 Unauthorized (Answer key protected)');

    // 3. Unauthenticated Admin Candidate Detail must be rejected
    const unauthDetail = await makeRequest(port, '/api/admin/candidates/dummy-id', 'GET');
    if (unauthDetail.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated candidate detail, got ${unauthDetail.statusCode}`);
    }
    console.log('✓ [SECURITY] GET /api/admin/candidates/:id rejected with 401 Unauthorized');

    // 4. Unauthenticated Admin Grade submission must be rejected
    const unauthGrade = await makeRequest(port, '/api/admin/candidates/dummy-id/grade', 'POST', {}, { score: 100 });
    if (unauthGrade.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated grade submit, got ${unauthGrade.statusCode}`);
    }
    console.log('✓ [SECURITY] POST /api/admin/candidates/:id/grade rejected with 401 Unauthorized');

    // 5. Admin Login with Wrong PIN must fail
    const wrongLogin = await makeRequest(port, '/api/admin/login', 'POST', {}, { pin: 'wrong-passcode' });
    if (wrongLogin.statusCode !== 401 || wrongLogin.body.success) {
      throw new Error('Admin login should reject invalid PIN');
    }
    console.log('✓ [SECURITY] POST /api/admin/login with incorrect PIN rejected with 401 Unauthorized');

    // 6. Admin Login with Correct PIN (admin123) must succeed and return a session token
    const validLogin = await makeRequest(port, '/api/admin/login', 'POST', {}, { pin: 'admin123' });
    if (validLogin.statusCode !== 200 || !validLogin.body.adminToken) {
      throw new Error('Admin login failed with correct PIN');
    }
    const adminToken = validLogin.body.adminToken;
    console.log(`✓ [AUTH] POST /api/admin/login with valid PIN succeeded; received admin token: ${adminToken.substring(0, 10)}...`);

    // 7. Admin Candidates List with valid X-Admin-Token succeeds
    const authCandidates = await makeRequest(port, '/api/admin/candidates', 'GET', { 'X-Admin-Token': adminToken });
    if (authCandidates.statusCode !== 200 || !Array.isArray(authCandidates.body.candidates)) {
      throw new Error('Authenticated candidate list fetch failed');
    }
    console.log(`✓ [AUTH] GET /api/admin/candidates with X-Admin-Token returned ${authCandidates.body.candidates.length} candidates`);

    // 8. Admin Bug Catalog with valid X-Admin-Token succeeds
    const authCatalog = await makeRequest(port, '/api/admin/bug-catalog', 'GET', { 'X-Admin-Token': adminToken });
    if (authCatalog.statusCode !== 200 || authCatalog.body.seededBugs.length !== 20) {
      throw new Error('Authenticated bug catalog fetch failed');
    }
    console.log('✓ [AUTH] GET /api/admin/bug-catalog with X-Admin-Token returned all 20 seeded bugs to authorized evaluator');

    // 9. Admin Logout invalidates the session token
    const logoutRes = await makeRequest(port, '/api/admin/logout', 'POST', {}, { adminToken });
    if (logoutRes.statusCode !== 200) {
      throw new Error('Admin logout failed');
    }
    console.log('✓ [AUTH] POST /api/admin/logout successfully revoked the session token');

    // 10. Revoked token can no longer access admin routes
    const revokedCheck = await makeRequest(port, '/api/admin/candidates', 'GET', { 'X-Admin-Token': adminToken });
    if (revokedCheck.statusCode !== 401) {
      throw new Error('Revoked admin token was still accepted!');
    }
    console.log('✓ [SECURITY] GET /api/admin/candidates with revoked token rejected with 401 Unauthorized');

    // 11. Unique Email/Gmail Constraint over HTTP API
    const testEmail = `candidate-${Date.now()}@gmail.com`;
    const reg1 = await makeRequest(port, '/api/candidate/start', 'POST', {}, {
      fullName: 'Security Tester 1',
      email: testEmail
    });
    if (reg1.statusCode !== 201 || !reg1.body.token) {
      throw new Error(`Initial candidate registration failed: ${reg1.statusCode}`);
    }
    const candToken = reg1.body.token;
    console.log('✓ [REGISTRATION] Initial candidate registration successful (201 Created)');

    const reg2 = await makeRequest(port, '/api/candidate/start', 'POST', {}, {
      fullName: 'Security Tester 2 (Duplicate)',
      email: testEmail.toUpperCase() // test case-insensitivity
    });
    if (reg2.statusCode !== 409 || !reg2.body.error.includes('already registered')) {
      throw new Error(`Expected 409 Conflict with 'already registered' message, got ${reg2.statusCode}`);
    }
    console.log('✓ [REGISTRATION] Duplicate email registration rejected with 409 Conflict (case-insensitive)');

    // 12. Blind Candidate Confidentiality
    const reportRes = await makeRequest(port, '/api/candidate/report', 'POST', {}, {
      token: candToken,
      title: 'Cart total goes negative on -1 quantity',
      category: 'Business Logic',
      severity: 'Blocker',
      stepsToReproduce: 'Add item, set qty -1',
      expectedResult: 'Validation error',
      actualResult: 'Total dropped'
    });
    if (reportRes.statusCode !== 201 || reportRes.body.matchedBugId !== undefined || reportRes.body.score !== undefined) {
      throw new Error('Candidate report response leaked ground truth information!');
    }

    const myReportsRes = await makeRequest(port, `/api/candidate/my-reports?token=${candToken}`, 'GET');
    if (myReportsRes.statusCode !== 200 || myReportsRes.body.reports[0].matchedBugId !== undefined) {
      throw new Error('Candidate my-reports endpoint leaked matchedBugId!');
    }
    console.log('✓ [CONFIDENTIALITY] Candidate reports strictly conceal matchedBugId and answer key (Blind Testing preserved)');

    console.log('\n🎉 ALL 12 SECURITY AND CONFIDENTIALITY TESTS PASSED!');
  } finally {
    server.close();
  }
}

runSecurityTests().catch(err => {
  console.error('\n❌ Security Test Failed:', err);
  process.exit(1);
});
