const SshKey = require("../models/SshKey");

const { encrypt } = require("../controllers/encryption");
const {generateSshKeyPair} = require("./sshKeyGenerator")

function toPublicKey(key) {
  return {
    id: key._id,
    name: key.name,
    publicKey: key.publicKey ?? null,
    createdAt: key.createdAt,
  };
}

async function getSharedKeys() {
  const keys = await SshKey.find({
    scope: "shared",
  });

  return keys.map(toPublicKey);
}

async function generateSharedKey({ name }) {
  if (!name?.trim()) {
    throw new Error("Key name is required");
  }

  const generated = await generateSshKeyPair();

  const key = await SshKey.create({
    name: name.trim(),
    scope: "shared",
    privateKey: encrypt(generated.privateKey),
    publicKey: generated.publicKey,
  });

  return toPublicKey(key);
}

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

  const saved = await SshKey.create(key);

  return toPublicKey(saved);
}

async function deleteSharedKey(id) {
  const key = await SshKey.findOne({
    _id: id,
    scope: "shared",
  });

  if (!key) {
    throw new Error("SSH key not found");
  }

  await key.deleteOne();
}

module.exports = {
  getSharedKeys,
  generateSharedKey,
  importSharedKey,
  deleteSharedKey,
};