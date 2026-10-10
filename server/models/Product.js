const { collections } = require('../db/mongo');

class Product {
  static async find(query = {}) {
    return collections.products.find(query);
  }

  static async findById(id) {
    // support numeric or ObjectId id
    const all = await collections.products.find({});
    return all.find(p => p.id === Number(id) || p._id === id) || null;
  }

  static async insertMany(products) {
    return collections.products.insertMany(products);
  }
}

class Order {
  static async create(orderData) {
    return collections.orders.create(orderData);
  }

  static async find(query = {}) {
    return collections.orders.find(query);
  }
}

module.exports = {
  Product,
  Order
};
