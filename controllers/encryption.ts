import crypto from "node:crypto";

import type { EncryptedField } from "../types/server";
import { config } from "../config/config";

// ─── Config ───────────────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";

const masterKeyHex = config.auth.masterKey;

const MASTER_KEY = Buffer.from(masterKeyHex, "hex");

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Returns the IV, ciphertext, and GCM authentication tag as hexadecimal
 * strings so the encrypted value can be stored by the persistence layer.
 */
export function encrypt(text: string): EncryptedField {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");

  encrypted += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    content: encrypted,
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypts a value produced by encrypt().
 *
 * AES-GCM verifies the authentication tag during decryption. If the encrypted
 * value has been modified or the wrong key is used, decipher.final() throws.
 */
export function decrypt(encrypted: EncryptedField): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    MASTER_KEY,
    Buffer.from(encrypted.iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));

  let decrypted = decipher.update(encrypted.content, "hex", "utf8");

  decrypted += decipher.final("utf8");

  return decrypted;
}
