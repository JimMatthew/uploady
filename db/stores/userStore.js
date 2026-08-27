/**
 * Canonical User object returned by the persistence layer.
 *
 * Passwords are never stored directly. Only the derived hash and salt
 * are persisted.
 *
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} username
 * @property {string} passwordHash
 * @property {string} passwordSalt
 */
class UserStore {

    /**
  * Returns whether at least one user exists.
  *
  * @returns {Promise<boolean>}
  */
    async exists() {
        throw new Error("UserStore.exists() not implemented");
    }

    /**
 * Creates a user.
 *
 * Password hashing must occur before data reaches the store.
 *
 * @param {Object} data
 * @param {string} data.username
 * @param {string} data.passwordHash
 * @param {string} data.passwordSalt
 * @returns {Promise<User>}
 */
    async create(data) {
        throw new Error("UserStore,create() not implemented");
    }

    /**
 * Finds a user by username.
 *
 * @param {string} username
 * @returns {Promise<User|null>}
 */
    async findByUsername(username) {
        throw new Error("UserStore.findByUsername() not implemented");
    }
}

module.exports = UserStore;