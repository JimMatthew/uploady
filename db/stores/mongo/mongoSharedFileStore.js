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
}

module.exports = MongoSharedFileStore;