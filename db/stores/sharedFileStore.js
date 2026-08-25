class SharedFileStore {

   async list () {
    throw new Error("list not implemented");
   } 
  async create(data) {
    throw new Error("SharedFileStore.create() not implemented");
  }

  async findByToken(token) {
    throw new Error("SharedFileStore.findByToken() not implemented");
  }

  async deleteByToken(token) {
    throw new Error("SharedFileStore.deleteByToken() not implemented");
  }

  async deleteByPath(filePath, fileName) {
    throw new Error("SharedFileStore.deleteByPath() not implemented");
  }
}

module.exports = SharedFileStore;