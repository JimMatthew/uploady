const ServerStore = require("../serverStore");
const SftpServer = require("../../../models/SftpServer");

class MongoServerStore extends ServerStore {
  async find() {
    return SftpServer.find();
  }

  async findById(id) {
    return SftpServer.findById(id);
  }

  async create(data) {
    return SftpServer.create(data);
  }

  async findByIdAndUpdate(id, update) {
    return SftpServer.findByIdAndUpdate(
      id,
      update,
      { new: true },
    );
  }

  async deleteById(id) {
    return SftpServer.findByIdAndDelete(id);
  }
}

module.exports = MongoServerStore;