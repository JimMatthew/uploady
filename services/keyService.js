const { sshKeyStore } = require("../db");

const { encrypt } = require("../controllers/encryption");
const { generateSshKeyPair } = require("./sshKeyGenerator");

/**
 * Public representation of a saved SSH key.
 *
 * Private key material and passphrases are intentionally excluded.
 *
 * @typedef {Object} PublicSshKey
 * @property {string} id - Saved SSH key ID.
 * @property {string} name - User-defined key name.
 * @property {string|null} publicKey - SSH public key, if available.
 * @property {Date} createdAt - Date the key was created.
 */

/**
 * Converts a saved SSH key into its public representation.
 *
 * This prevents encrypted private key material and passphrases from
 * being exposed to callers that only need key metadata.
 *
 * @param {Object} key - Saved SSH key returned by the persistence layer.
 * @returns {PublicSshKey}
 */
function toPublicKey(key) {
  return {
    id: key._id,
    name: key.name,
    publicKey: key.publicKey ?? null,
    createdAt: key.createdAt,
  };
}

/**
 * Returns all shared SSH keys available for reuse.
 *
 * Only public key metadata is returned. Private key material and
 * passphrases are never exposed by this operation.
 *
 * @returns {Promise<PublicSshKey[]>}
 */
async function getSharedKeys() {
  const keys = await sshKeyStore.findShared();

  return keys.map(toPublicKey);
}

/**
 * Generates and saves a new shared SSH key pair.
 *
 * The generated private key is encrypted before being passed to the
 * persistence layer. The returned object contains only public key
 * metadata.
 *
 * @param {Object} options
 * @param {string} options.name - User-defined name for the key.
 * @returns {Promise<PublicSshKey>}
 * @throws {Error} If a key name is not provided.
 */
async function generateSharedKey({ name }) {
  if (!name?.trim()) {
    throw new Error("Key name is required");
  }

  const generated = await generateSshKeyPair();

  const key = await sshKeyStore.create({
    name: name.trim(),
    scope: "shared",
    privateKey: encrypt(generated.privateKey),
    publicKey: generated.publicKey,
  });

  return toPublicKey(key);
}

/**
 * Imports and saves an existing private key as a shared SSH key.
 *
 * The private key and optional passphrase are encrypted before being
 * passed to the persistence layer. The returned object contains only
 * public key metadata.
 *
 * @param {Object} options
 * @param {string} options.name - User-defined name for the key.
 * @param {string} options.privateKey - SSH private key to import.
 * @param {string} [options.publicKey] - Corresponding SSH public key.
 * @param {string} [options.passphrase] - Private key passphrase.
 * @returns {Promise<PublicSshKey>}
 * @throws {Error} If the key name or private key is not provided.
 */
async function importSharedKey({
  name,
  privateKey,
  publicKey,
  passphrase,
}) {
  if (!name?.trim()) {
    throw new Error("Key name is required");
  }

  if (!privateKey) {
    throw new Error("Private key is required");
  }

  const key = {
    name: name.trim(),
    scope: "shared",
    privateKey: encrypt(privateKey),
  };

  if (publicKey) {
    key.publicKey = publicKey;
  }

  if (passphrase) {
    key.passphrase = encrypt(passphrase);
  }

  const saved = await sshKeyStore.create(key);

  return toPublicKey(saved);
}

/**
 * Deletes a shared SSH key.
 *
 * The key is verified to have shared scope before deletion so this
 * operation cannot be used to delete a server-scoped key.
 *
 * @param {string} id - ID of the shared SSH key to delete.
 * @returns {Promise<Object|null>} The deleted key.
 * @throws {Error} If no shared SSH key exists with the supplied ID.
 */
async function deleteSharedKey(id) {
  const key = await sshKeyStore.findSharedById(id);

  if (!key) {
    throw new Error("SSH key not found");
  }

  return sshKeyStore.deleteById(id);
}

module.exports = {
  getSharedKeys,
  generateSharedKey,
  importSharedKey,
  deleteSharedKey,
};