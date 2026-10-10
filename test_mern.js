/**
 * Automated Test Suite for MERN Stack QA Platform
 */
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated MERN Test Suite...');
  const port = process.env.PORT || 8000;

  try {
    // 1. Test Static Index.html
    const resHtml = await makeRequest({ host: '127.0.0.1', port, path: '/', method: 'GET' });
    if (resHtml.statusCode !== 200 || !resHtml.body.includes('id="root"')) {
      throw new Error(`Failed to load React SPA index: ${resHtml.statusCode}`);
    }
    console.log('✓ GET / (React SPA index.html) returned 200 OK');

    // 2. Test Products API
    const resProds = await makeRequest({ host: '127.0.0.1', port, path: '/api/products', method: 'GET' });
    const prodData = JSON.parse(resProds.body);
    if (!prodData.products || prodData.products.length === 0) {
      throw new Error('Failed to fetch products from MongoDB');
    }
    console.log(`✓ GET /api/products returned ${prodData.products.length} products from MongoDB`);

    // 3. Test Candidate Start
    const resCand = await makeRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/api/candidate/start',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { fullName: 'Samantha Reed', email: 'samantha@example.com' }
    );
    const candData = JSON.parse(resCand.body);
    if (!candData.success || !candData.token) {
      throw new Error('Candidate session creation failed');
    }
    const token = candData.token;
    console.log(`✓ POST /api/candidate/start created candidate with token: ${token}`);

    // 4. Test Bug Report Submission (Blind evaluation check)
    const resRep = await makeRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/api/candidate/report',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        token: token,
        title: 'Entering negative quantity in cart reduces total bill',
        category: 'Business Logic',
        severity: 'Blocker',
        stepsToReproduce: '1. Add item\n2. In quantity box type -1\n3. Observe reduced total',
        expectedResult: 'Cart should reject negative quantities',
        actualResult: 'Total is reduced with negative amount'
      }
    );
    const repData = JSON.parse(resRep.body);
    if (!repData.success) {
      throw new Error('Failed to record bug report');
    }
    // Verify strict blind principle: no matchedBugId or score in response
    if (repData.matchedBugId || repData.score) {
      throw new Error('Ground truth leaked in candidate response!');
    }
    console.log('✓ POST /api/candidate/report successfully saved (Ground-Truth strictly hidden)');

    // 5. Test Candidate My-Reports (Verify redaction)
    const resMy = await makeRequest({ host: '127.0.0.1', port, path: `/api/candidate/my-reports?token=${token}`, method: 'GET' });
    const myData = JSON.parse(resMy.body);
    if (!myData.reports || myData.reports.length !== 1) {
      throw new Error('Candidate reports lookup failed');
    }
    if (myData.reports[0].matchedBugId) {
      throw new Error('Ground-truth matchedBugId leaked to candidate in my-reports!');
    }
    console.log('✓ GET /api/candidate/my-reports returned 1 report with ground truth redacted');

    // 6. Test Admin Candidates List
    const resAdmin = await makeRequest({ host: '127.0.0.1', port, path: '/api/admin/candidates', method: 'GET' });
    const adminData = JSON.parse(resAdmin.body);
    if (!adminData.candidates || adminData.candidates.length === 0) {
      throw new Error('Failed to fetch admin candidates');
    }
    console.log(`✓ GET /api/admin/candidates returned ${adminData.candidates.length} candidate assessments`);

    // 7. Test Admin Candidate Detail & 20-Bug Matrix
    const candId = candData.candidate._id;
    const resDetail = await makeRequest({ host: '127.0.0.1', port, path: `/api/admin/candidates/${candId}`, method: 'GET' });
    const detailData = JSON.parse(resDetail.body);
    if (!detailData.seededBugs || detailData.seededBugs.length !== 20) {
      throw new Error('Master seeded bug catalog should contain 20 bugs');
    }
    if (!detailData.foundBugIds.includes('BUG-001')) {
      throw new Error('Automated matcher should have matched BUG-001 for negative quantity report');
    }
    console.log('✓ GET /api/admin/candidates/:id correctly matched BUG-001 in 20-bug matrix!');

    // 8. Test Evaluator Grading
    const resGrade = await makeRequest(
      {
        host: '127.0.0.1',
        port,
        path: `/api/admin/candidates/${candId}/grade`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { score: 95, decision: 'Strong Pass', notes: 'Excellent exploratory bug report with minimal repro steps.' }
    );
    const gradeData = JSON.parse(resGrade.body);
    if (!gradeData.success) {
      throw new Error('Evaluator grading failed');
    }
    console.log('✓ POST /api/admin/candidates/:id/grade saved score and hiring recommendation');

    console.log('\n🎉 ALL 8 MERN AUTOMATED TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failure:', err);
    process.exit(1);
  }
}

runTests();

