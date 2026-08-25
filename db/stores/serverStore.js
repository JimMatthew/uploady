class ServerStore {
  async find() {
    throw new Error("ServerStore.find() not implemented");
  }

  async listSummary() {
    throw new Error("ServerStore.findById() not implemented");
  }

  async findById(id) {
    throw new Error("ServerStore.findById() not implemented");
  }

  async create(data) {
    throw new Error("ServerStore.create() not implemented");
  }

  async findByIdAndUpdate(id, update) {
    throw new Error("ServerStore.findByIdAndUpdate() not implemented");
  }

  async deleteById(id) {
    throw new Error("ServerStore.deleteById() not implemented");
  }
}

module.exports = ServerStore;
