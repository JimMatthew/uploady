/**
 * Canonical SharedFile structure returned by all database implementations.
 *
 * @typedef {Object} SharedFile
 * @property {string} _id
 * @property {string} fileName
 * @property {string} filePath
 * @property {string} link
 * @property {string} token
 * @property {boolean} [isRemote]
 * @property {string} [serverId]
 * @property {string} [serverName]
 * @property {Date} sharedAt
 */
class SharedFileStore {

  async list() {
    throw new Error("list not implemented");
  }

  /**
 * Creates a shared file record.
 *
 * @param {Object} data
 * @param {string} data.fileName
 * @param {string} data.filePath
 * @param {string} data.link
 * @param {string} data.token
 * @param {boolean} [data.isRemote]
 * @param {string} [data.serverId]
 * @param {string} [data.serverName]
 * @returns {Promise<SharedFile>}
 */
  async create(data) {
    throw new Error("SharedFileStore.create() not implemented");
  }

  /**
  * Finds a shared file by its public share token.
  *
  * @param {string} token
  * @returns {Promise<SharedFile|null>}
  */
  async findByToken(token) {
    throw new Error("SharedFileStore.findByToken() not implemented");
  }

  /**
   * Deletes a shared file by its public share token.
   *
   * @param {string} token
   * @returns {Promise<SharedFile|null>}
   */
  async deleteByToken(token) {
    throw new Error("SharedFileStore.deleteByToken() not implemented");
  }

  /**
   * Deletes a shared file by its stored path and filename.
   *
   * @param {string} filePath
   * @param {string} fileName
   * @returns {Promise<SharedFile|null>}
   */
  async deleteByPath(filePath, fileName) {
    throw new Error("SharedFileStore.deleteByPath() not implemented");
  }
}

module.exports = SharedFileStore;