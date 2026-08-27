const SharedFileStore = require("../sharedFileStore");
const SharedFile = require("../../../models/SharedFile");

class MongoSharedFileStore extends SharedFileStore {
  async list() {
    return SharedFile.find();
  }

  async create(data) {
    const sharedFile = await SharedFile.create(data);
    return sharedFile.toObject();
  }

  async findByToken(token) {
    return SharedFile.findOne({ token }).lean();
  }

  async deleteByToken(token) {
    return SharedFile.findOneAndDelete({ token }).lean();
  }

  async deleteByPath(filePath, fileName) {
    return SharedFile.findOneAndDelete({
      filePath,
      fileName,
    }).lean();
  }

  async findByFile(fileName, filePath) {
  return SharedFile.findOne({
    fileName,
    filePath,
  }).lean();
}

async list() {
  return SharedFile.find()
    .sort({ sharedAt: -1 })
    .lean();
}

async findRemoteShare(fileName, filePath, serverId) {
  return SharedFile.findOne({
    fileName,
    filePath,
    serverId,
    isRemote: true,
  }).lean();
}
}

module.exports = MongoSharedFileStore;
