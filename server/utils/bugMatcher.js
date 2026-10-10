const { SEEDED_BUGS } = require('../db/seedData');

function matchCandidateReport(title = '', steps = '', actual = '') {
  const text = `${title} ${steps} ${actual}`.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const bug of SEEDED_BUGS) {
    let score = 0;

    // Check keywords
    for (const kw of bug.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 15;
      }
    }

    // Check explicit bug ID
    if (text.includes(bug.id.toLowerCase())) {
      score += 50;
    }

    if (score > bestScore && score >= 25) {
      bestScore = score;
      bestMatch = bug;
    }
  }

  const confidence = Math.min(100, bestScore);
  return {
    matchedBug: bestMatch,
    confidence
  };
}

module.exports = {
  matchCandidateReport,
  SEEDED_BUGS
};
