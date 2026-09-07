/**
 * Defines the persistence interface for saved actions.
 *
 * Concrete storage implementations, such as MongoDB or SQLite, should
 * implement these methods while preserving the same external behavior.
 */
class ActionStore {
  /**
   * Retrieves all saved actions.
   *
   * @returns {Promise<Array<Object>>} All saved actions.
   */
  async getAll() {}

  /**
   * Retrieves an action by ID.
   *
   * @param {string} id - Action ID.
   * @returns {Promise<Object|null>} The action, or null if it does not exist.
   */
  async getById(id) {}

  /**
   * Creates a new saved action.
   *
   * @param {Object} action - Action data to persist.
   * @returns {Promise<Object>} The created action.
   */
  async create(action) {}

  /**
   * Updates an existing saved action.
   *
   * @param {string} id - Action ID.
   * @param {Object} updates - Fields to update.
   * @returns {Promise<Object|null>} The updated action, or null if not found.
   */
  async update(id, updates) {}

  /**
   * Deletes a saved action.
   *
   * @param {string} id - Action ID.
   * @returns {Promise<Object|null>} The deleted action, or null if not found.
   */
  async delete(id) {}
}

module.exports = ActionStore;
