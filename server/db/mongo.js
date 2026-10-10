/**
 * MongoDB-Compatible Document Storage Engine
 * Implements standard MongoDB / Mongoose collection operations:
 * find, findOne, findById, create, updateOne, findByIdAndUpdate, countDocuments.
 * Auto-generates 24-char ObjectId hex strings and persists to JSON.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = crypto.randomBytes(8).toString('hex');
  return timestamp + random; // 24-char hex string
}

class MongoCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Error loading collection ${this.name}:`, err);
    }
    return [];
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error saving collection ${this.name}:`, err);
    }
  }

  _match(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        const matched = val.some(subQ => this._match(doc, subQ));
        if (!matched) return false;
        continue;
      }
      if (doc[key] !== val) return false;
    }
    return true;
  }

  async find(query = {}) {
    return this.data.filter(doc => this._match(doc, query));
  }

  async findOne(query = {}) {
    return this.data.find(doc => this._match(doc, query)) || null;
  }

  async findById(id) {
    return this.data.find(doc => doc._id === id || doc.id === id) || null;
  }

  async create(doc) {
    const newDoc = {
      _id: generateObjectId(),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.push(newDoc);
    this._save();
    return newDoc;
  }

  async insertMany(docs) {
    const created = [];
    for (const d of docs) {
      const newDoc = await this.create(d);
      created.push(newDoc);
    }
    return created;
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const index = this.data.findIndex(doc => doc._id === id || doc.id === id);
    if (index === -1) return null;

    const current = this.data[index];
    const changes = update.$set ? update.$set : update;
    const updatedDoc = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString()
    };
    this.data[index] = updatedDoc;
    this._save();
    return updatedDoc;
  }

  async updateOne(query, update) {
    const doc = await this.findOne(query);
    if (!doc) return { modifiedCount: 0 };
    await this.findByIdAndUpdate(doc._id, update);
    return { modifiedCount: 1 };
  }

  async countDocuments(query = {}) {
    const docs = await this.find(query);
    return docs.length;
  }

  async deleteMany(query = {}) {
    const initial = this.data.length;
    this.data = this.data.filter(doc => !this._match(doc, query));
    this._save();
    return { deletedCount: initial - this.data.length };
  }
}

// Collections Registry
const collections = {
  candidates: new MongoCollection('candidates'),
  bugReports: new MongoCollection('bug_reports'),
  products: new MongoCollection('products'),
  orders: new MongoCollection('orders'),
  seededBugs: new MongoCollection('seeded_bugs')
};

module.exports = {
  collections,
  generateObjectId
};

