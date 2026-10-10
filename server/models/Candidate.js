const { collections } = require('../db/mongo');

class Candidate {
  static async create({ fullName, email, token }) {
    return collections.candidates.create({
      token,
      fullName,
      email,
      status: 'in_progress', // in_progress, submitted, reviewed
      startedAt: new Date().toISOString(),
      submittedAt: null,
      overallScore: 0,
      reviewerDecision: 'Pending', // Pending, Pass, Strong Pass, Consider, Reject
      reviewerNotes: ''
    });
  }

  static async findOne(query) {
    return collections.candidates.findOne(query);
  }

  static async findById(id) {
    return collections.candidates.findById(id);
  }

  static async find(query) {
    return collections.candidates.find(query);
  }

  static async findByIdAndUpdate(id, update, options) {
    return collections.candidates.findByIdAndUpdate(id, update, options);
  }

  static async finalizeSubmission(candidateId) {
    return collections.candidates.findByIdAndUpdate(candidateId, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
  }

  static async updateReview(candidateId, { score, decision, notes }) {
    return collections.candidates.findByIdAndUpdate(candidateId, {
      overallScore: parseFloat(score) || 0,
      reviewerDecision: decision || 'Pending',
      reviewerNotes: notes || '',
      status: 'reviewed'
    });
  }
}

module.exports = Candidate;
