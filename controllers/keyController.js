const keyService = require("../services/keyService");

/**
 * Returns all shared SSH keys available for reuse.
 *
 * Only public key metadata is returned by the key service.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getSharedKeys(req, res) {
  try {
    const keys = await keyService.getSharedKeys();

    res.json(keys);
  } catch (err) {
    console.error("Failed to get SSH keys:", err);

    res.status(500).json({
      error: "Failed to get SSH keys",
    });
  }
}

/**
 * Generates and saves a new shared SSH key pair.
 *
 * Expects a user-defined key name in the request body and returns
 * the public representation of the newly created key.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function generateKey(req, res) {
  try {
    const { name } = req.body;

    const key = await keyService.generateSharedKey({
      name,
    });

    res.status(201).json(key);
  } catch (err) {
    console.error("Failed to generate SSH key:", err);

    res.status(500).json({
      error: err.message || "Failed to generate SSH key",
    });
  }
}

/**
 * Imports an existing private key as a shared SSH key.
 *
 * The request body must contain a name and private key. A public
 * key and private-key passphrase may optionally be supplied.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function importKey(req, res) {
  try {
    const { name, privateKey, publicKey, passphrase } = req.body;

    const key = await keyService.importSharedKey({
      name,
      privateKey,
      publicKey,
      passphrase,
    });

    res.status(201).json(key);
  } catch (err) {
    console.error("Failed to import SSH key:", err);

    res.status(500).json({
      error: err.message || "Failed to import SSH key",
    });
  }
}

/**
 * Deletes a shared SSH key by ID.
 *
 * The key service verifies that the requested key has shared scope
 * before allowing it to be deleted.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function deleteKey(req, res) {
  try {
    await keyService.deleteSharedKey(req.params.id);

    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete SSH key:", err);

    res.status(500).json({
      error: err.message || "Failed to delete SSH key",
    });
  }
}

module.exports = {
  getSharedKeys,
  generateKey,
  importKey,
  deleteKey,
};
