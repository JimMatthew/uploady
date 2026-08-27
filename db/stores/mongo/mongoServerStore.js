const ServerStore = require("../serverStore");
const SftpServer = require("../../../models/SftpServer");

class MongoServerStore extends ServerStore {
  async find() {
    return SftpServer.find();
  }

  async listSummary() {
    return SftpServer.find().select("_id host");
  }

  async findById(id) {
    return SftpServer.findById(id);
  }

  async create(data) {
    return SftpServer.create(data);
  }

  async findByIdAndUpdate(id, update) {
    return SftpServer.findByIdAndUpdate(id, update, { new: true });
  }

  async deleteById(id) {
    return SftpServer.findByIdAndDelete(id);
  }

  async findSummariesByIds(ids) {
    if (!ids.length) {
      return [];
    }

    return SftpServer.find({
      _id: { $in: ids },
    })
      .select("_id host")
      .lean();
  }
}

module.exports = MongoServerStore;
