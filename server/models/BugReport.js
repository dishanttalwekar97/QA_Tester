const { collections } = require('../db/mongo');

class BugReport {
  static async create({
    candidateId,
    title,
    category,
    severity,
    stepsToReproduce,
    expectedResult,
    actualResult,
    environmentInfo,
    matchedBugId = null,
    matchConfidence = 0
  }) {
    // Determine report sequence number for this candidate
    const existing = await collections.bugReports.find({ candidateId });
    const reportNumber = existing.length + 1;

    return collections.bugReports.create({
      candidateId,
      reportNumber,
      title,
      category,
      severity,
      stepsToReproduce,
      expectedResult,
      actualResult,
      environmentInfo: environmentInfo || '',
      matchedBugId,
      matchConfidence,
      evaluatorValid: true,
      evaluatorFeedback: ''
    });
  }

  static async findByCandidateId(candidateId, redactGroundTruth = true) {
    const reports = await collections.bugReports.find({ candidateId });
    reports.sort((a, b) => a.reportNumber - b.reportNumber);

    if (redactGroundTruth) {
      // STRICT BLACK-BOX EVALUATION: Never expose ground-truth match to candidate
      return reports.map(r => {
        const copy = { ...r };
        delete copy.matchedBugId;
        delete copy.matchConfidence;
        delete copy.evaluatorValid;
        delete copy.evaluatorFeedback;
        return copy;
      });
    }

    return reports;
  }

  static async findById(id) {
    return collections.bugReports.findById(id);
  }
}

module.exports = BugReport;
