const UserStore = require("../userStore");
const User = require("../../../models/User");

class MongoUserStore extends UserStore {
  async exists() {
    return (await User.exists({})) !== null;
  }

  async create(data) {
    const user = await User.create(data);
    return user.toObject();
  }

  async findByUsername(username) {
    return User.findOne({ username }).lean();
  }
}

module.exports = MongoUserStore;