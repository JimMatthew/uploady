const keyService = require("../services/keyService");

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

async function generateKey(req, res) {
  try {
    const { name } = req.body;

    const key = await keyService.generateSharedKey({ name });

    res.status(201).json(key);
  } catch (err) {
    console.error("Failed to generate SSH key:", err);
    res.status(500).json({
      error: err.message || "Failed to generate SSH key",
    });
  }
}

async function importKey(req, res) {
  try {
    const {
      name,
      privateKey,
      publicKey,
      passphrase,
    } = req.body;

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