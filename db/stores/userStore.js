
class UserStore {

    async exists() {
        throw new Error("UserStore.exists() not implemented");
    }

    async create(data) {
        throw new Error("UserStore,create() not implemented");
    }

    async findByUsername(username) {
        throw new Error("UserStore.findByUsername() not implemented");
    }
}

module.exports = UserStore;