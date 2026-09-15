import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SshKeyPair {
  privateKey: string;
  publicKey: string;
}

export async function generateSshKeyPair(): Promise<SshKeyPair> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "uploady-key-"));

  const keyPath = path.join(dir, "id_ed25519");

  try {
    await execFileAsync("ssh-keygen", [
      "-t",
      "ed25519",
      "-N",
      "",
      "-f",
      keyPath,
      "-q",
    ]);

    const privateKey = await fs.readFile(keyPath, "utf8");

    const publicKey = await fs.readFile(`${keyPath}.pub`, "utf8");

    return {
      privateKey,
      publicKey: publicKey.trim(),
    };
  } finally {
    await fs.rm(dir, {
      recursive: true,
      force: true,
    });
  }
}
