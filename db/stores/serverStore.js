/**
 * Encrypted credential value stored by Uploady.
 *
 * @typedef {Object} EncryptedField
 * @property {string} iv
 * @property {string} content
 * @property {string} tag
 */

/**
 * Canonical saved server object returned by the persistence layer.
 *
 * @typedef {Object} Server
 * @property {string} _id
 * @property {string} host
 * @property {number} port
 * @property {string} username
 * @property {"password"|"key"} authType
 * @property {Object} credentials
 * @property {EncryptedField} [credentials.password]
 * @property {EncryptedField} [credentials.privateKey]
 * @property {EncryptedField} [credentials.passphrase]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */
class ServerStore {
  async find() {
    throw new Error("ServerStore.find() not implemented");
  }

  /**
  * Returns the saved servers needed for the server list.
  *
  * @returns {Promise<Array<{_id: string, host: string}>>}
  */
  async listSummary() {
    throw new Error("ServerStore.findById() not implemented");
  }

  /**
  * Finds a saved server by ID.
  *
  * @param {string} id
  * @returns {Promise<Server|null>}
  */
  async findById(id) {
    throw new Error("ServerStore.findById() not implemented");
  }

  /**
  * Creates a saved server.
  *
  * Credentials must already be encrypted before reaching the store.
  *
  * @param {Object} data
  * @param {string} data.host
  * @param {number} [data.port=22]
  * @param {string} data.username
  * @param {"password"|"key"} data.authType
  * @param {Object} data.credentials
  * @param {EncryptedField} [data.credentials.password]
  * @param {EncryptedField} [data.credentials.privateKey]
  * @param {EncryptedField} [data.credentials.passphrase]
  * @returns {Promise<Server>}
  */
  async create(data) {
    throw new Error("ServerStore.create() not implemented");
  }

  /**
 * Updates a saved server.
 *
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Server|null>}
 */
  async findByIdAndUpdate(id, update) {
    throw new Error("ServerStore.findByIdAndUpdate() not implemented");
  }

  /**
 * Deletes a saved server.
 *
 * @param {string} id
 * @returns {Promise<Server|null>}
 */
  async deleteById(id) {
    throw new Error("ServerStore.deleteById() not implemented");
  }

  /**
 * Returns server ID/hostname pairs for the supplied IDs.
 *
 * @param {string[]} ids
 * @returns {Promise<Array<{_id: string, host: string}>>}
 */
  async findSummariesByIds(ids) {
    throw new Error(
      "ServerStore.findSummariesByIds() not implemented",
    );
  }
}

module.exports = ServerStore;
