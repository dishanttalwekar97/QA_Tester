/**
 * In-process unit & integration test for MERN models and matching logic.
 */
const Candidate = require('./server/models/Candidate');
const BugReport = require('./server/models/BugReport');
const { Product, Order } = require('./server/models/Product');
const { matchCandidateReport } = require('./server/utils/bugMatcher');
const { SEEDED_BUGS } = require('./server/db/seedData');

async function testMern() {
  console.log('🧪 Running In-Process MERN Architecture Tests...');

  // 1. Verify 20 Seeded Bugs
  console.log(`Checking Seeded Bugs catalog...`);
  if (SEEDED_BUGS.length !== 20) {
    throw new Error(`Expected 20 seeded bugs, found ${SEEDED_BUGS.length}`);
  }
  console.log(`✓ Exactly 20 Seeded Bugs present in Ground-Truth catalog`);

  // 2. Test MongoDB Candidate Model
  const testToken = 'cand-unit-test-' + Date.now();
  const cand = await Candidate.create({
    fullName: 'Maria Rodriguez',
    email: 'maria@qa.com',
    token: testToken
  });
  if (!cand._id || cand.fullName !== 'Maria Rodriguez') {
    throw new Error('Failed to create candidate document in MongoDB');
  }
  console.log(`✓ MongoDB Candidate created with ObjectId: ${cand._id}`);

  // 3. Test Bug Report Model with Server Matching
  const sampleTitle = 'Cart allows negative items which gives discounts';
  const sampleSteps = '1. Set qty to -2 in cart\n2. Subtotal drops';
  const matchResult = matchCandidateReport(sampleTitle, sampleSteps, 'Total drops by $159');
  
  if (!matchResult.matchedBug || matchResult.matchedBug.id !== 'BUG-001') {
    throw new Error('Matcher failed to match BUG-001');
  }
  console.log(`✓ Bug Matcher accurately matched: ${matchResult.matchedBug.id} (${matchResult.confidence}% confidence)`);

  // 4. Save Bug Report to MongoDB
  const report = await BugReport.create({
    candidateId: cand._id,
    title: sampleTitle,
    category: 'Business Logic',
    severity: 'Blocker',
    stepsToReproduce: sampleSteps,
    expectedResult: 'Should reject negative quantity',
    actualResult: 'Total decreased below zero',
    environmentInfo: 'Viewport: 1920x1080 | Chrome',
    matchedBugId: matchResult.matchedBug.id,
    matchConfidence: matchResult.confidence
  });
  if (!report._id) throw new Error('Failed to save bug report in MongoDB');
  console.log(`✓ Bug report document saved with ObjectId: ${report._id}`);

  // 5. Test Candidate Redaction (Strict Black-Box verification)
  const candidateViewReports = await BugReport.findByCandidateId(cand._id, true);
  if (candidateViewReports[0].matchedBugId !== undefined) {
    throw new Error('LEAK: matchedBugId exposed in candidate view!');
  }
  console.log(`✓ Verified Strict Black-Box: matchedBugId is redacted from candidate view`);

  // 6. Test Admin View (Full Ground Truth)
  const adminViewReports = await BugReport.findByCandidateId(cand._id, false);
  if (adminViewReports[0].matchedBugId !== 'BUG-001') {
    throw new Error('Admin view missing ground truth matchedBugId');
  }
  console.log(`✓ Verified Admin View: Evaluator has full access to matchedBugId (${adminViewReports[0].matchedBugId})`);

  // 7. Test Finalize & Grading
  await Candidate.finalizeSubmission(cand._id);
  const updatedCand = await Candidate.updateReview(cand._id, {
    score: 90,
    decision: 'Strong Pass',
    notes: 'Caught critical business logic boundary flaw immediately.'
  });
  if (updatedCand.status !== 'reviewed' || updatedCand.overallScore !== 90) {
    throw new Error('Failed to update candidate review scorecard');
  }
  console.log(`✓ Evaluator scorecard saved: Score 90%, Decision: ${updatedCand.reviewerDecision}`);

  console.log('\n🎉 ALL MERN CORE ARCHITECTURE TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

testMern().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
