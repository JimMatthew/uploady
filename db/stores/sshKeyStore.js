/**
 * Encrypted SSH key value stored by Uploady.
 *
 * @typedef {Object} EncryptedField
 * @property {string} iv
 * @property {string} content
 * @property {string} tag
 */

/**
 * Canonical saved SSH key returned by the persistence layer.
 *
 * @typedef {Object} SshKey
 * @property {string} _id
 * @property {string} name
 * @property {"server"|"shared"} scope
 * @property {string} [serverId]
 * @property {EncryptedField} privateKey
 * @property {string} [publicKey]
 * @property {EncryptedField} [passphrase]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */
class SshKeyStore {
  /**
   * Returns all SSH keys.
   *
   * @returns {Promise<SshKey[]>}
   */
  async find() {
    throw new Error("SshKeyStore.find() not implemented");
  }

  /**
   * Returns all shared SSH keys.
   *
   * @returns {Promise<SshKey[]>}
   */
  async findShared() {
    throw new Error("SshKeyStore.findShared() not implemented");
  }

  /**
   * Finds an SSH key by ID.
   *
   * @param {string} id
   * @returns {Promise<SshKey|null>}
   */
  async findById(id) {
    throw new Error("SshKeyStore.findById() not implemented");
  }

  /**
   * Finds a shared SSH key by ID.
   *
   * This is useful when accepting a key selection from the UI,
   * since server-scoped keys must not be reusable.
   *
   * @param {string} id
   * @returns {Promise<SshKey|null>}
   */
  async findSharedById(id) {
    throw new Error(
      "SshKeyStore.findSharedById() not implemented",
    );
  }

  /**
   * Creates an SSH key.
   *
   * Key material must already be encrypted before reaching
   * the store.
   *
   * @param {Object} data
   * @param {string} data.name
   * @param {"server"|"shared"} data.scope
   * @param {string} [data.serverId]
   * @param {EncryptedField} data.privateKey
   * @param {string} [data.publicKey]
   * @param {EncryptedField} [data.passphrase]
   * @returns {Promise<SshKey>}
   */
  async create(data) {
    throw new Error("SshKeyStore.create() not implemented");
  }

  /**
   * Updates an SSH key.
   *
   * @param {string} id
   * @param {Object} update
   * @returns {Promise<SshKey|null>}
   */
  async findByIdAndUpdate(id, update) {
    throw new Error(
      "SshKeyStore.findByIdAndUpdate() not implemented",
    );
  }

  /**
   * Deletes an SSH key.
   *
   * @param {string} id
   * @returns {Promise<SshKey|null>}
   */
  async deleteById(id) {
    throw new Error("SshKeyStore.deleteById() not implemented");
  }
}

module.exports = SshKeyStore;