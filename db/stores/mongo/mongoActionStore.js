const ActionStore = require("../actionStore");
const Action = require("../../../models/Action");

class MongoActionStore extends ActionStore {
  async getAll() {
    return Action.find().lean();
  }

  async getById(id) {
    return Action.findById(id).lean();
  }

  async create(action) {
    const created = await Action.create(action);
    return created.toObject();
  }

  async update(id, updates) {
    return Action.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async delete(id) {
    return Action.findByIdAndDelete(id).lean();
  }
}

module.exports = MongoActionStore;