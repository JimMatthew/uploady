const SshKeyStore = require("../sshKeyStore");
const SshKey = require("../../../models/SshKey");

class MongoSshKeyStore extends SshKeyStore {
  async find() {
    return SshKey.find();
  }

  async findShared() {
    return SshKey.find({
      scope: "shared",
    });
  }

  async findById(id) {
    return SshKey.findById(id);
  }

  async findSharedById(id) {
    return SshKey.findOne({
      _id: id,
      scope: "shared",
    });
  }

  async create(data) {
    return SshKey.create(data);
  }

  async findByIdAndUpdate(id, update) {
    return SshKey.findByIdAndUpdate(
      id,
      update,
      { new: true },
    );
  }

  async deleteById(id) {
    return SshKey.findByIdAndDelete(id);
  }
}

module.exports = MongoSshKeyStore;