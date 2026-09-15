import { sshKeyStore } from "../db";
import { encrypt } from "../controllers/encryption";
import { generateSshKeyPair } from "./sshKeyGenerator";
import type { SshKey, CreateSshKeyInput } from "../db/stores/sshKeyStore";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Public representation of a saved SSH key.
 *
 * Private key material and passphrases are intentionally excluded.
 */
export interface PublicSshKey {
  id: string;
  name: string;
  publicKey: string | null;
  createdAt: Date;
}

export interface GenerateSharedKeyOptions {
  name: string;
}

export interface ImportSharedKeyOptions {
  name: string;
  privateKey: string;
  publicKey?: string;
  passphrase?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a saved SSH key into its public representation.
 *
 * This prevents encrypted private key material and passphrases from
 * being exposed to callers that only need key metadata.
 */
function toPublicKey(key: SshKey): PublicSshKey {
  return {
    id: key._id,
    name: key.name,
    publicKey: key.publicKey ?? null,
    createdAt: key.createdAt,
  };
}

// ─── Shared Keys ──────────────────────────────────────────────────────────────

/**
 * Returns all shared SSH keys available for reuse.
 *
 * Only public key metadata is returned. Private key material and
 * passphrases are never exposed by this operation.
 */
export async function getSharedKeys(): Promise<PublicSshKey[]> {
  const keys = await sshKeyStore.findShared();

  return keys.map(toPublicKey);
}

/**
 * Generates and saves a new shared SSH key pair.
 */
export async function generateSharedKey({
  name,
}: GenerateSharedKeyOptions): Promise<PublicSshKey> {
  if (!name.trim()) {
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
 */
export async function importSharedKey({
  name,
  privateKey,
  publicKey,
  passphrase,
}: ImportSharedKeyOptions): Promise<PublicSshKey> {
  if (!name.trim()) {
    throw new Error("Key name is required");
  }

  if (!privateKey) {
    throw new Error("Private key is required");
  }

  const key: CreateSshKeyInput = {
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
 */
export async function deleteSharedKey(id: string) {
  const key = await sshKeyStore.findSharedById(id);

  if (!key) {
    throw new Error("SSH key not found");
  }

  return sshKeyStore.deleteById(id);
}
