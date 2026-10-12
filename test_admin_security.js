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

    // 5. Unauthenticated Admin Delete Candidate must be rejected
    const unauthDelete = await makeRequest(port, '/api/admin/candidates/dummy-id', 'DELETE');
    if (unauthDelete.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated delete candidate, got ${unauthDelete.statusCode}`);
    }
    console.log('✓ [SECURITY] DELETE /api/admin/candidates/:id rejected with 401 Unauthorized');

    // 5. Admin Login with Wrong PIN must fail
    const wrongLogin = await makeRequest(port, '/api/admin/login', 'POST', {}, { pin: 'wrong-passcode' });
    if (wrongLogin.statusCode !== 401 || wrongLogin.body.success) {
      throw new Error('Admin login should reject invalid PIN');
    }
    console.log('✓ [SECURITY] POST /api/admin/login with incorrect PIN rejected with 401 Unauthorized');

    // 6. Admin Login with Configured PIN must succeed and return a session token
    const pinToTest = process.env.ADMIN_PIN || 'Sanket625';
    const validLogin = await makeRequest(port, '/api/admin/login', 'POST', {}, { pin: pinToTest });
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
    if (authCatalog.statusCode !== 200 || authCatalog.body.seededBugs.length !== 40) {
      throw new Error('Authenticated bug catalog fetch failed');
    }
    console.log('✓ [AUTH] GET /api/admin/bug-catalog with X-Admin-Token returned all 40 seeded bugs to authorized evaluator');

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

    // 13. Bug report with empty expectedResult and actualResult (now optional)
    const optionalFieldsReport = await makeRequest(port, '/api/candidate/report', 'POST', {}, {
      token: candToken,
      title: 'Checkout button unresponsive when terms unchecked',
      category: 'Functional',
      stepsToReproduce: 'Uncheck terms and click checkout',
      expectedResult: '',
      actualResult: ''
    });
    if (optionalFieldsReport.statusCode !== 201) {
      throw new Error('Bug report with optional expected/actual result failed to save!');
    }
    console.log('✓ [OPTIONAL FIELDS] Bug report successfully submitted with empty expectedResult and actualResult');

    // 14. Authenticated Admin Delete Candidate & Cascaded Bug Reports
    const adminLoginAgain = await makeRequest(port, '/api/admin/login', 'POST', {}, { pin: pinToTest });
    const freshAdminToken = adminLoginAgain.body.adminToken;
    const candId = reg1.body.candidate._id;

    const deleteRes = await makeRequest(port, `/api/admin/candidates/${candId}`, 'DELETE', { 'X-Admin-Token': freshAdminToken });
    if (deleteRes.statusCode !== 200 || !deleteRes.body.success) {
      throw new Error(`Expected 200 for candidate delete, got ${deleteRes.statusCode}`);
    }

    // Verify candidate is gone
    const checkDeletedCand = await makeRequest(port, `/api/admin/candidates/${candId}`, 'GET', { 'X-Admin-Token': freshAdminToken });
    if (checkDeletedCand.statusCode !== 404) {
      throw new Error(`Candidate should be 404 after deletion, got ${checkDeletedCand.statusCode}`);
    }

    // Verify candidate's reports are deleted
    const checkReports = await makeRequest(port, `/api/candidate/my-reports?token=${candToken}`, 'GET');
    if (checkReports.body.reports && checkReports.body.reports.length !== 0) {
      throw new Error('Candidate bug reports were not cascade-deleted!');
    }
    console.log('✓ [DELETE] Authenticated DELETE /api/admin/candidates/:id cleanly deleted candidate & all associated bug reports');

    // 15. Submission Lockdown: Post-Finalization Bug Logging Rejection
    const lockdownEmail = `lockdown-${Date.now()}@gmail.com`;
    const regLockdown = await makeRequest(port, '/api/candidate/start', 'POST', {}, {
      fullName: 'Lockdown Tester',
      email: lockdownEmail
    });
    const lockToken = regLockdown.body.token;
    const lockCandId = regLockdown.body.candidate._id;

    // Log 1 bug report while active
    const activeReport = await makeRequest(port, '/api/candidate/report', 'POST', {}, {
      token: lockToken,
      title: 'Cart item count off-by-one',
      category: 'UI/UX',
      stepsToReproduce: 'Add item',
      expectedResult: 'Shows 1',
      actualResult: 'Shows 0'
    });
    if (activeReport.statusCode !== 201) throw new Error('Failed to log bug before finalization');

    // Finalize assessment
    const finalizeRes = await makeRequest(port, '/api/candidate/finalize', 'POST', {}, { token: lockToken });
    if (finalizeRes.statusCode !== 200 || !finalizeRes.body.success || finalizeRes.body.candidate.status !== 'submitted') {
      throw new Error('Failed to finalize assessment');
    }
    console.log('✓ [SUBMISSION LOCKDOWN] Assessment successfully finalized (status: submitted)');

    // Attempt to submit another bug after finalization -> MUST be rejected with 403 Forbidden!
    const postFinalizeBug = await makeRequest(port, '/api/candidate/report', 'POST', {}, {
      token: lockToken,
      title: 'Post-submission unauthorized bug',
      category: 'Security',
      stepsToReproduce: 'Attempt submitting after test finished'
    });
    if (postFinalizeBug.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for post-submission bug report, got ${postFinalizeBug.statusCode}`);
    }
    console.log('✓ [SUBMISSION LOCKDOWN] Subsequent POST /api/candidate/report rejected with 403 Forbidden');

    // Attempt to re-finalize -> recognizes already submitted
    const reFinalize = await makeRequest(port, '/api/candidate/finalize', 'POST', {}, { token: lockToken });
    if (!reFinalize.body.alreadySubmitted) {
      throw new Error('Expected alreadySubmitted flag when finalizing again');
    }
    console.log('✓ [SUBMISSION LOCKDOWN] Duplicate finalization recognized as already submitted');

    // Clean up lockdown tester
    await makeRequest(port, `/api/admin/candidates/${lockCandId}`, 'DELETE', { 'X-Admin-Token': freshAdminToken });

    console.log('\n🎉 ALL 15 SECURITY, DELETION AND CONFIDENTIALITY TESTS PASSED!');
  } finally {
    server.close();
  }
}

runSecurityTests().catch(err => {
  console.error('\n❌ Security Test Failed:', err);
  process.exit(1);
});
