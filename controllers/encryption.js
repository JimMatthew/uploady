const crypto = require("crypto");

// ─── Config ───────────────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";

if (!process.env.MASTER_KEY) {
  console.error("FATAL: MASTER_KEY environment variable is not set");
  process.exit(1);
}

const MASTER_KEY = Buffer.from(process.env.MASTER_KEY, "hex");

if (MASTER_KEY.length !== 32) {
  console.error(
    `FATAL: MASTER_KEY must be 32 bytes (64 hex characters). Got ${MASTER_KEY.length} bytes.`,
  );
  process.exit(1);
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns the IV, ciphertext, and GCM auth tag as hex strings so the
 * result can be safely stored in the database as a plain object.
 * @param {string} text
 * @returns {{ iv: string, content: string, tag: string }}
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    content: encrypted,
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypts a value produced by encrypt().
 * The GCM auth tag is verified automatically — if the ciphertext has been
 * tampered with, decipher.final() will throw before any plaintext is returned.
 * @param {{ iv: string, content: string, tag: string }} encrypted
 * @returns {string}
 */
function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    MASTER_KEY,
    Buffer.from(encrypted.iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));

  let decrypted = decipher.update(encrypted.content, "hex", "utf8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { encrypt, decrypt };
