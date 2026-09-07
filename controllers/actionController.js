/**
 * Creates the HTTP controller for saved actions.
 *
 * Persistence and execution are injected so the controller remains
 * independent of the underlying database and SSH execution implementation.
 *
 * @param {Object} dependencies
 * @param {Object} dependencies.actionStore - Saved action persistence store.
 * @param {Object} dependencies.actionExecutor - Saved action execution service.
 * @returns {Object} Express route handlers for saved actions.
 */
const createActionController = ({ actionStore, actionExecutor }) => ({
  getAll: async (req, res, next) => {
    try {
      const actions = await actionStore.getAll();
      res.json(actions);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const action = await actionStore.getById(req.params.id);

      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }

      res.json(action);
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const action = await actionStore.create(req.body);
      res.status(201).json(action);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const action = await actionStore.update(req.params.id, req.body);

      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }

      res.json(action);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      await actionStore.delete(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  run: async (req, res, next) => {
    try {
      const result = await actionExecutor.execute(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
});

module.exports = createActionController;
